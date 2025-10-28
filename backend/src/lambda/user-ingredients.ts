/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
// TODO: Revisit user-ingredients-handler implementation and remove unused variable suppressions after refactor
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { generateId, getCorsHeaders, createErrorResponse, createSuccessResponse, errorResponseFromError } from '../helpers/common';
import { getUserIdFromEvent } from '../helpers/authorizer-helper';

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
    const userId = getUserIdFromEvent(event);

    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: '',
      };
    }

    if (httpMethod === 'GET') {
      return await getUserIngredients(userId, queryStringParameters);
    }

    if (httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      return await addUserIngredient(body, userId);
    }

    if (httpMethod === 'DELETE') {
      const body = event.body ? JSON.parse(event.body) : {};
      return await removeUserIngredient(body, userId);
    }

    return createErrorResponse(404, 'Not found');
  } catch (error) {
    return errorResponseFromError(error);
  }
};

async function getUserIngredients(userId?: string, queryParams?: any): Promise<APIGatewayProxyResult> {
  try {
    if (!userId) {
      return createErrorResponse(401, 'Authorization required');
    }

    const result = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: {
        userId: userId,
      },
    }));

    const userIngredients = result.Item?.ingredients || [];
    return createSuccessResponse({ userIngredients });
  } catch (error) {
    return errorResponseFromError(error);
  }
}

async function addUserIngredient(ingredientData: any, userId?: string): Promise<APIGatewayProxyResult> {
  try {
    if (!userId) {
      return createErrorResponse(401, 'Authorization required');
    }

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

    return createSuccessResponse({ userIngredient: cleanUserIngredient }, 201);
  } catch (error) {
    return errorResponseFromError(error);
  }
}

async function removeUserIngredient(ingredientData: any, userId?: string): Promise<APIGatewayProxyResult> {
  try {
    if (!userId) {
      return createErrorResponse(401, 'Authorization required');
    }

    const { ingredientId } = ingredientData;

    if (!ingredientId) {
      return createErrorResponse(400, 'Ingredient ID required');
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

    return createSuccessResponse({ message: 'Ingredient removed successfully' });
  } catch (error) {
    return errorResponseFromError(error);
  }
}
