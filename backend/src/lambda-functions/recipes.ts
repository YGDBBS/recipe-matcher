import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

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
    const { httpMethod, path, pathParameters, queryStringParameters } = event;
    const body = event.body ? JSON.parse(event.body) : {};

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

    if (path === '/recipes' && httpMethod === 'POST') {
      return await createRecipe(body, event.headers.Authorization);
    }

    if (pathParameters?.id && httpMethod === 'GET') {
      return await getRecipe(pathParameters.id);
    }

    if (pathParameters?.id && httpMethod === 'PUT') {
      return await updateRecipe(pathParameters.id, body, event.headers.Authorization);
    }

    if (pathParameters?.id && httpMethod === 'DELETE') {
      return await deleteRecipe(pathParameters.id, event.headers.Authorization);
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

async function getRecipes(queryParams: any): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const { ingredient, userId, limit = '20', lastKey } = queryParams || {};

    let recipes: Recipe[] = [];

    if (ingredient) {
      // Search by ingredient using GSI
      const result = await docClient.send(new QueryCommand({
        TableName: process.env.RECIPES_TABLE,
        IndexName: 'ingredients-index',
        KeyConditionExpression: 'ingredient = :ingredient',
        ExpressionAttributeValues: {
          ':ingredient': ingredient.toLowerCase(),
        },
        Limit: parseInt(limit),
      }));
      recipes = result.Items as Recipe[] || [];
    } else if (userId) {
      // Get user's recipes
      const result = await docClient.send(new QueryCommand({
        TableName: process.env.RECIPES_TABLE,
        IndexName: 'user-recipes-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ScanIndexForward: false, // Most recent first
        Limit: parseInt(limit),
      }));
      recipes = result.Items as Recipe[] || [];
    } else {
      // Get all recipes
      const result = await docClient.send(new ScanCommand({
        TableName: process.env.RECIPES_TABLE,
        Limit: parseInt(limit),
      }));
      recipes = result.Items as Recipe[] || [];
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

async function createRecipe(recipeData: any, authorization?: string): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (!authorization) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' }),
      };
    }

    const userId = extractUserIdFromToken(authorization);
    const recipeId = generateId();
    const now = new Date().toISOString();

    const recipe: Recipe = {
      recipeId,
      userId,
      title: recipeData.title,
      description: recipeData.description,
      ingredients: recipeData.ingredients || [],
      instructions: recipeData.instructions || [],
      cookingTime: recipeData.cookingTime || 30,
      difficultyLevel: recipeData.difficultyLevel || 'medium',
      servings: recipeData.servings || 4,
      dietaryTags: recipeData.dietaryTags || [],
      createdAt: now,
      updatedAt: now,
    };

    // Save recipe
    await docClient.send(new PutCommand({
      TableName: process.env.RECIPES_TABLE,
      Item: recipe,
    }));

    // Save ingredient mappings for search
    for (const ingredient of recipe.ingredients) {
      await docClient.send(new PutCommand({
        TableName: process.env.RECIPES_TABLE,
        Item: {
          recipeId: recipe.recipeId,
          ingredient: ingredient.name.toLowerCase(),
          createdAt: now,
        },
      }));
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ recipe }),
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
    const result = await docClient.send(new GetCommand({
      TableName: process.env.RECIPES_TABLE,
      Key: { recipeId }, // Use recipeId as primary key only
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Recipe not found' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ recipe: result.Item }),
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

async function updateRecipe(recipeId: string, recipeData: any, authorization?: string): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (!authorization) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' }),
      };
    }

    const userId = extractUserIdFromToken(authorization);

    // Get existing recipe
    const existingRecipe = await docClient.send(new GetCommand({
      TableName: process.env.RECIPES_TABLE,
      Key: { recipeId },
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

    // Update recipe
    const updatedRecipe = {
      ...existingRecipe.Item,
      ...recipeData,
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
      TableName: process.env.RECIPES_TABLE,
      Item: updatedRecipe,
    }));

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

async function deleteRecipe(recipeId: string, authorization?: string): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (!authorization) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' }),
      };
    }

    const userId = extractUserIdFromToken(authorization);

    // Get existing recipe to check ownership
    const existingRecipe = await docClient.send(new GetCommand({
      TableName: process.env.RECIPES_TABLE,
      Key: { recipeId },
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

    // Delete recipe
    await docClient.send(new DeleteCommand({
      TableName: process.env.RECIPES_TABLE,
      Key: { recipeId },
    }));

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

function extractUserIdFromToken(authorization: string): string {
  const token = authorization.replace('Bearer ', '');
  return token;
}
