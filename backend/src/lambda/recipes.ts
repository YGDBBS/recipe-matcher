import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

interface Recipe {
  recipeId: string;
  userId: string;
  title: string;
  description: string;
  ingredients: {
    name: string;
    quantity: string;
    unit: string;
  }[];
  instructions: string[];
  cookingTime: number; // in minutes
  difficultyLevel: 'easy' | 'medium' | 'hard';
  servings: number;
  dietaryTags: string[];
  cuisine: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  rating?: number;
  reviewCount?: number;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };

  try {
    const { httpMethod, path, pathParameters, queryStringParameters, requestContext } = event;
    const body = event.body ? JSON.parse(event.body) : {};
    
    // Get userId from authorizer context
    const userId = requestContext.authorizer?.userId;

    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    if (path === '/recipes' && httpMethod === 'GET') {
      return await getRecipes(queryStringParameters);
    }

    if (path === '/recipes/mine' && httpMethod === 'GET') {
      return await getMyRecipes(userId);
    }

    if (path === '/recipes' && httpMethod === 'POST') {
      return await createRecipe(body, userId);
    }

    if (pathParameters?.id && httpMethod === 'GET') {
      return await getRecipe(pathParameters.id);
    }

    if (pathParameters?.id && httpMethod === 'PUT') {
      return await updateRecipe(pathParameters.id, body, userId);
    }

    if (pathParameters?.id && httpMethod === 'DELETE') {
      return await deleteRecipe(pathParameters.id, userId);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Recipes error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

// Helper function to fetch METADATA item with ingredients
async function fetchMetadata(recipeId: string): Promise<Recipe | null> {
      const result = await docClient.send(new GetCommand({
        TableName: process.env.RECIPES_TABLE_V2,
        Key: { PK: `RECIPE#${recipeId}`, SK: 'METADATA' },
      }));
      
      if (!result.Item) {
        return null;
      }

      const recipe = result.Item as Recipe;

      // If ingredients are not in METADATA, fetch them from ING# items
      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        const ingResult = await docClient.send(new QueryCommand({
          TableName: process.env.RECIPES_TABLE_V2,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': `RECIPE#${recipeId}`,
            ':sk': 'ING#',
          },
        }));

        // Reconstruct ingredients array from ING# items
        recipe.ingredients = (ingResult.Items || []).map(item => ({
          name: item.ingredientName || item.ingredient || '',
          quantity: item.quantity || '1',
          unit: item.unit || 'piece',
        }));
      }

      return recipe;
}

async function getRecipes(queryParams: any): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const { ingredient, userId, cuisine, limit = '20' } = queryParams || {};
    let recipes: Recipe[] = [];

    // Helper function to extract recipeId from GSI sort key
    const extractRecipeId = (gsiSK: string): string => {
      return gsiSK.split('#')[1];
    };

    if (cuisine) {
      // Query GSI2 with GSI2PK = `CUISINE#Italian`
      const result = await docClient.send(new QueryCommand({
        TableName: process.env.RECIPES_TABLE_V2,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :cuisine',
        ExpressionAttributeValues: {
          ':cuisine': `CUISINE#${cuisine}`,
        },
        Limit: parseInt(limit),
      }));

      // Extract recipeIds and fetch METADATA items
      const recipeIds = [...new Set(result.Items?.map(item => extractRecipeId(item.GSI2SK)) || [])];
      const metadataItems = await Promise.all(recipeIds.map(fetchMetadata));
      recipes = metadataItems.filter(item => item !== null) as Recipe[];
    }
    else if (ingredient) {
      // Query GSI3 with GSI3PK = `ING#chicken`
      const result = await docClient.send(new QueryCommand({
        TableName: process.env.RECIPES_TABLE_V2,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :ingredient',
        ExpressionAttributeValues: {
          ':ingredient': `ING#${ingredient.toLowerCase()}`,
        },
        Limit: parseInt(limit),
      }));

      // Extract recipeIds and fetch METADATA items
      const recipeIds = [...new Set(result.Items?.map(item => extractRecipeId(item.GSI3SK)) || [])];
      const metadataItems = await Promise.all(recipeIds.map(fetchMetadata));
      recipes = metadataItems.filter(item => item !== null) as Recipe[];
    }
    else if (userId) {
      // Query GSI1 with GSI1PK = `USER#${userId}`
      const result = await docClient.send(new QueryCommand({
        TableName: process.env.RECIPES_TABLE_V2,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :userId',
        ExpressionAttributeValues: {
          ':userId': `USER#${userId}`,
        },
        ScanIndexForward: false, // Most recent first
        Limit: parseInt(limit),
      }));

      // Extract recipeIds and fetch METADATA items
      const recipeIds = [...new Set(result.Items?.map(item => extractRecipeId(item.GSI1SK)) || [])];
      const metadataItems = await Promise.all(recipeIds.map(fetchMetadata));
      recipes = metadataItems.filter(item => item !== null) as Recipe[];
    }
    else {
      // No filter provided - return error
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please provide cuisine, ingredient, or userId filter' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ recipes }),
    };
  } catch (error) {
    console.error('Get recipes error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get recipes' }),
    };
  }
}

async function getMyRecipes(userId?: string): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' }),
      };
    }

    // Query GSI1 with GSI1PK = `USER#${userId}`
    const result = await docClient.send(new QueryCommand({
      TableName: process.env.RECIPES_TABLE_V2,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :userId',
      ExpressionAttributeValues: {
        ':userId': `USER#${userId}`,
      },
      ScanIndexForward: false, // Most recent first
    }));

    // Extract recipeIds and fetch METADATA items (with ingredients)
    const recipeIds = [...new Set(result.Items?.map(item => item.GSI1SK.split('#')[1]) || [])];
    const recipes = await Promise.all(recipeIds.map(fetchMetadata));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ recipes }),
    };
  } catch (error) {
    console.error('Get my recipes error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get my recipes' }),
    };
  }
}

async function createRecipe(recipeData: any, userId?: string): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' }),
      };
    }
    const recipeId = generateId();
    const now = new Date().toISOString();
    const cuisine = recipeData.cuisine || 'general';

    
    // Build the **METADATA** item – userId comes from the authorizer
    const metadataItem = {
      PK: `RECIPE#${recipeId}`,
      SK: 'METADATA',
      recipeId,
      userId,                                   // ← forced from authorizer
      title: recipeData.title,
      description: recipeData.description,
      ingredients: recipeData.ingredients || [],
      instructions: recipeData.instructions || [],
      cookingTime: recipeData.cookingTime || 30,
      difficultyLevel: recipeData.difficultyLevel || 'medium',
      servings: recipeData.servings || 4,
      dietaryTags: recipeData.dietaryTags || [],
      cuisine,
      createdAt: now,
      updatedAt: now,

      GSI1PK: `USER#${userId}`,
      GSI1SK: `RECIPE#${recipeId}`,
      GSI2PK: `CUISINE#${cuisine.toLowerCase()}`,
      GSI2SK: `RECIPE#${recipeId}`,
    };

    
    // ING# items (one per ingredient)
    const ingItems = (recipeData.ingredients || []).map((ing: any) => {
      const name = ing.name.toLowerCase().trim();
      return {
        PutRequest: {
          Item: {
            PK: `RECIPE#${recipeId}`,
            SK: `ING#${name}`,
            GSI3PK: `ING#${name}`,
            GSI3SK: `RECIPE#${recipeId}`,
            ingredientName: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            createdAt: now,
          },
        },
      };
    });

    
    // Batch-write METADATA + ING# items
    const allRequests = [
      { PutRequest: { Item: metadataItem } },
      ...ingItems,
    ];

    const batchSize = 25;
    for (let i = 0; i < allRequests.length; i += batchSize) {
      const batch = allRequests.slice(i, i + batchSize);
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [process.env.RECIPES_TABLE_V2!]: batch,
          },
        })
      );
    }

    // Return the clean recipe object (no GSI fields)
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...cleanRecipe } = metadataItem;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ recipe: cleanRecipe }),
    };
  } catch (error) {
    console.error('Create recipe error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Failed to create recipe' }),
    };
  }
}

async function getRecipe(recipeId: string): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    // Reuse fetchMetadata helper to get recipe with ingredients
    const recipe = await fetchMetadata(recipeId);

    if (!recipe) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Recipe not found' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ recipe }),
    };
  } catch (error) {
    console.error('Get recipe error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get recipe' }),
    };
  }
}

async function updateRecipe(recipeId: string, recipeData: any, userId?: string): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' }),
      };
    }

    // Get existing recipe metadata
    const existingRecipe = await docClient.send(new GetCommand({
      TableName: process.env.RECIPES_TABLE_V2,
      Key: { PK: `RECIPE#${recipeId}`, SK: 'METADATA' },
    }));

    if (!existingRecipe.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Recipe not found' }),
      };
    }

    if (existingRecipe.Item.userId !== userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to update this recipe' }),
      };
    }

    const now = new Date().toISOString();
    const cuisine = recipeData.cuisine || existingRecipe.Item.cuisine || 'general';

    // Update recipe metadata
    const updatedRecipe = {
      ...existingRecipe.Item,
      ...recipeData,
      cuisine,
      updatedAt: now,
    };

    // Prepare items for batch write
    const items = [];

    // Updated METADATA item
    items.push({
      PutRequest: {
        Item: {
          PK: `RECIPE#${recipeId}`,
          SK: 'METADATA',
          GSI1PK: `USER#${userId}`,
          GSI1SK: `RECIPE#${recipeId}`,
          GSI2PK: `CUISINE#${cuisine.toLowerCase()}`,
          GSI2SK: `RECIPE#${recipeId}`,
          ...updatedRecipe,
        },
      },
    });

    // Delete existing ING# items and create new ones
    const existingIngredients = await docClient.send(new QueryCommand({
      TableName: process.env.RECIPES_TABLE_V2,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `RECIPE#${recipeId}`,
        ':sk': 'ING#',
      },
    }));

    // Delete existing ingredient items
    for (const item of existingIngredients.Items || []) {
      items.push({
        DeleteRequest: {
          Key: { PK: item.PK, SK: item.SK },
        },
      });
    }

    // Create new ING# items
    for (const ingredient of updatedRecipe.ingredients || []) {
      items.push({
        PutRequest: {
          Item: {
            PK: `RECIPE#${recipeId}`,
            SK: `ING#${ingredient.name.toLowerCase()}`,
            GSI3PK: `ING#${ingredient.name.toLowerCase()}`,
            GSI3SK: `RECIPE#${recipeId}`,
            ingredientName: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            createdAt: now,
          },
        },
      });
    }

    // Batch write all items
    const batchSize = 25;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [process.env.RECIPES_TABLE_V2!]: batch,
        },
      }));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ recipe: updatedRecipe }),
    };
  } catch (error) {
    console.error('Update recipe error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update recipe' }),
    };
  }
}

async function deleteRecipe(recipeId: string, userId?: string): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' }),
      };
    }

    // Get existing recipe metadata to check ownership
    const existingRecipe = await docClient.send(new GetCommand({
      TableName: process.env.RECIPES_TABLE_V2,
      Key: { PK: `RECIPE#${recipeId}`, SK: 'METADATA' },
    }));

    if (!existingRecipe.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Recipe not found' }),
      };
    }

    if (existingRecipe.Item.userId !== userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to delete this recipe' }),
      };
    }

    // Get all items for this recipe (METADATA + ING# items)
    const allItems = await docClient.send(new QueryCommand({
      TableName: process.env.RECIPES_TABLE_V2,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `RECIPE#${recipeId}`,
      },
    }));

    // Prepare delete requests
    const deleteItems = (allItems.Items || []).map(item => ({
      DeleteRequest: {
        Key: { PK: item.PK, SK: item.SK },
      },
    }));

    // Batch delete all items
    const batchSize = 25;
    for (let i = 0; i < deleteItems.length; i += batchSize) {
      const batch = deleteItems.slice(i, i + batchSize);
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [process.env.RECIPES_TABLE_V2!]: batch,
        },
      }));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Recipe deleted successfully' }),
    };
  } catch (error) {
    console.error('Delete recipe error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to delete recipe' }),
    };
  }
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

