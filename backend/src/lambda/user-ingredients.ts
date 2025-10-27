import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { generateId, extractUserIdFromToken, getCorsHeaders, createErrorResponse, createSuccessResponse } from '../helpers/common';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

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
  try {
    const { httpMethod, queryStringParameters } = event;

    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: '',
      };
    }

    if (httpMethod === 'GET') {
      return await getUserIngredients(event.headers.Authorization, queryStringParameters);
    }

    if (httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      return await addUserIngredient(body, event.headers.Authorization);
    }

    if (httpMethod === 'DELETE') {
      const body = event.body ? JSON.parse(event.body) : {};
      return await removeUserIngredient(body, event.headers.Authorization);
    }

    return createErrorResponse(404, 'Not found');
  } catch (_error) {
    return createErrorResponse(500, 'Internal server error');
  }
};

async function getUserIngredients(authorization?: string, queryParams?: any): Promise<APIGatewayProxyResult> {
  try {
    if (!authorization) {
      return createErrorResponse(401, 'Authorization required');
    }

    const userId = extractUserIdFromToken(authorization);
    if (!userId) {
      return createErrorResponse(401, 'Invalid token');
    }

    const { limit = '50' } = queryParams || {};

    const result = await docClient.send(new QueryCommand({
      TableName: process.env.USER_INGREDIENTS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      Limit: parseInt(limit),
    }));

    const userIngredients = result.Items as UserIngredient[] || [];
    return createSuccessResponse({ userIngredients });
  } catch (_error) {
    return createErrorResponse(500, 'Failed to get user ingredients');
  }
}

async function addUserIngredient(ingredientData: any, authorization?: string): Promise<APIGatewayProxyResult> {
  try {
    if (!authorization) {
      return createErrorResponse(401, 'Authorization required');
    }

    const userId = extractUserIdFromToken(authorization);
    if (!userId) {
      return createErrorResponse(401, 'Invalid token');
    }

    const now = new Date().toISOString();

    const userIngredient: UserIngredient = {
      userId,
      ingredientId: ingredientData.ingredientId || generateId(),
      name: ingredientData.name.toLowerCase(),
      quantity: ingredientData.quantity,
      unit: ingredientData.unit,
      expiryDate: ingredientData.expiryDate,
      addedAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: process.env.USER_INGREDIENTS_TABLE,
      Item: userIngredient,
    }));

    return createSuccessResponse({ userIngredient }, 201);
  } catch (_error) {
    return createErrorResponse(400, 'Failed to add ingredient');
  }
}

async function removeUserIngredient(ingredientData: any, authorization?: string): Promise<APIGatewayProxyResult> {
  try {
    if (!authorization) {
      return createErrorResponse(401, 'Authorization required');
    }

    const userId = extractUserIdFromToken(authorization);
    if (!userId) {
      return createErrorResponse(401, 'Invalid token');
    }

    const { ingredientId } = ingredientData;

    if (!ingredientId) {
      return createErrorResponse(400, 'Ingredient ID required');
    }

    await docClient.send(new DeleteCommand({
      TableName: process.env.USER_INGREDIENTS_TABLE,
      Key: {
        userId,
        ingredientId,
      },
    }));

    return createSuccessResponse({ message: 'Ingredient removed successfully' });
  } catch (_error) {
    return createErrorResponse(500, 'Failed to remove ingredient');
  }
}
