import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

interface Ingredient {
  ingredientId: string;
  name: string;
  category: string;
  commonUnits: string[];
  createdAt: string;
}

interface UserIngredient {
  userId: string;
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  addedAt: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };

  try {
    const { httpMethod, path, queryStringParameters } = event;
    const body = event.body ? JSON.parse(event.body) : {};

    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    if (path === '/ingredients' && httpMethod === 'GET') {
      return await getIngredients(queryStringParameters);
    }

    if (path === '/ingredients' && httpMethod === 'POST') {
      return await createIngredient(body);
    }

    if (path === '/user-ingredients' && httpMethod === 'GET') {
      return await getUserIngredients(event.headers.Authorization, queryStringParameters);
    }

    if (path === '/user-ingredients' && httpMethod === 'POST') {
      return await addUserIngredient(body, event.headers.Authorization);
    }

    if (path === '/user-ingredients' && httpMethod === 'DELETE') {
      return await removeUserIngredient(body, event.headers.Authorization);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Ingredients error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

async function getIngredients(queryParams: any): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const { category, search, limit = '50' } = queryParams || {};

    let ingredients: Ingredient[] = [];

    if (search) {
      // Search ingredients by name
      const result = await docClient.send(new ScanCommand({
        TableName: process.env.INGREDIENTS_TABLE,
        FilterExpression: 'contains(#name, :search)',
        ExpressionAttributeNames: {
          '#name': 'name',
        },
        ExpressionAttributeValues: {
          ':search': search.toLowerCase(),
        },
        Limit: parseInt(limit),
      }));
      ingredients = result.Items as Ingredient[] || [];
    } else if (category) {
      // Filter by category
      const result = await docClient.send(new ScanCommand({
        TableName: process.env.INGREDIENTS_TABLE,
        FilterExpression: 'category = :category',
        ExpressionAttributeValues: {
          ':category': category,
        },
        Limit: parseInt(limit),
      }));
      ingredients = result.Items as Ingredient[] || [];
    } else {
      // Get all ingredients
      const result = await docClient.send(new ScanCommand({
        TableName: process.env.INGREDIENTS_TABLE,
        Limit: parseInt(limit),
      }));
      ingredients = result.Items as Ingredient[] || [];
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ingredients }),
    };
  } catch (error) {
    console.error('Get ingredients error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get ingredients' }),
    };
  }
}

async function createIngredient(ingredientData: any): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const ingredientId = generateId();
    const now = new Date().toISOString();

    const ingredient: Ingredient = {
      ingredientId,
      name: ingredientData.name.toLowerCase(),
      category: ingredientData.category || 'other',
      commonUnits: ingredientData.commonUnits || ['cup', 'tbsp', 'tsp', 'piece'],
      createdAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: process.env.INGREDIENTS_TABLE,
      Item: ingredient,
    }));

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ ingredient }),
    };
  } catch (error) {
    console.error('Create ingredient error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Failed to create ingredient' }),
    };
  }
}

async function getUserIngredients(authorization?: string, queryParams?: any): Promise<APIGatewayProxyResult> {
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
    const { limit = '50' } = queryParams || {};

    const result = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: {
        userId: userId,
      },
    }));

    const userIngredients = result.Item?.ingredients || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ userIngredients }),
    };
  } catch (error) {
    console.error('Get user ingredients error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get user ingredients' }),
    };
  }
}

async function addUserIngredient(ingredientData: any, authorization?: string): Promise<APIGatewayProxyResult> {
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
    const now = new Date().toISOString();

    const userIngredient: UserIngredient = {
      userId,
      ingredientId: ingredientData.ingredientId || generateId(),
      name: ingredientData.name.toLowerCase(),
      quantity: ingredientData.quantity || 1,
      unit: ingredientData.unit || 'piece',
      expiryDate: ingredientData.expiryDate || undefined,
      addedAt: now,
    };

    // Remove undefined values to avoid DynamoDB errors
    const cleanUserIngredient = Object.fromEntries(
      Object.entries(userIngredient).filter(([_, value]) => value !== undefined)
    ) as UserIngredient;

    // Get current user data
    const userResult = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId },
    }));

    const currentIngredients = userResult.Item?.ingredients || [];
    const updatedIngredients = [...currentIngredients, cleanUserIngredient];

    // Update user with new ingredient
    await docClient.send(new UpdateCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET ingredients = :ingredients',
      ExpressionAttributeValues: {
        ':ingredients': updatedIngredients,
      },
    }));

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ userIngredient: cleanUserIngredient }),
    };
  } catch (error) {
    console.error('Add user ingredient error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Failed to add ingredient' }),
    };
  }
}

async function removeUserIngredient(ingredientData: any, authorization?: string): Promise<APIGatewayProxyResult> {
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
    const { ingredientId } = ingredientData;

    if (!ingredientId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Ingredient ID required' }),
      };
    }

    // Get current user data
    const userResult = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId },
    }));

    const currentIngredients = userResult.Item?.ingredients || [];
    const updatedIngredients = currentIngredients.filter((ing: any) => ing.ingredientId !== ingredientId);

    // Update user with removed ingredient
    await docClient.send(new UpdateCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET ingredients = :ingredients',
      ExpressionAttributeValues: {
        ':ingredients': updatedIngredients,
      },
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Ingredient removed successfully' }),
    };
  } catch (error) {
    console.error('Remove user ingredient error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to remove ingredient' }),
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
