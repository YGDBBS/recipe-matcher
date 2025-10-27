import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { generateId, getCorsHeaders, createErrorResponse, createSuccessResponse } from '../helpers/common';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

interface Ingredient {
  ingredientId: string;
  name: string;
  category: string;
  commonUnits: string[];
  createdAt: string;
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
      return await getIngredients(queryStringParameters);
    }

    if (httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      return await createIngredient(body);
    }

    return createErrorResponse(404, 'Not found');
  } catch (_error) {
    return createErrorResponse(500, 'Internal server error');
  }
};

async function getIngredients(queryParams: any): Promise<APIGatewayProxyResult> {
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

    return createSuccessResponse({ ingredients });
  } catch (error) {
    return createErrorResponse(500, 'Failed to get ingredients');
  }
}

async function createIngredient(ingredientData: any): Promise<APIGatewayProxyResult> {
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

    return createSuccessResponse({ ingredient }, 201);
  } catch (error) {
    return createErrorResponse(400, 'Failed to create ingredient');
  }
}
