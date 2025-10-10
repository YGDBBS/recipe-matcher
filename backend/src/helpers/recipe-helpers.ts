import { APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { extractUserIdFromToken } from './auth-helpers';
import { response } from '../utils/response';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

export interface Recipe {
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

export async function getRecipes(queryParams: any): Promise<APIGatewayProxyResult> {
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

    return response(200, { recipes });
  } catch (error) {
    console.error('Get recipes error:', error);
    throw error;
  }
}

export async function createRecipe(recipeData: any, userId: string | undefined): Promise<APIGatewayProxyResult> {
  try {
    if (!userId) {
      return response(401, { error: 'User not authenticated' });
    }

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

    return response(201, { recipe });
  } catch (error) {
    console.error('Create recipe error:', error);
    throw error;
  }
}

export async function getRecipe(recipeId: string): Promise<APIGatewayProxyResult> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: process.env.RECIPES_TABLE,
      Key: { recipeId }, // Use recipeId as primary key only
    }));

    if (!result.Item) {
      return response(404, { error: 'Recipe not found' });
    }

    return response(200, { recipe: result.Item });
  } catch (error) {
    console.error('Get recipe error:', error);
    throw error;
  }
}

export async function updateRecipe(recipeId: string, recipeData: any, userId: string | undefined): Promise<APIGatewayProxyResult> {
  try {
    if (!userId) {
      return response(401, { error: 'User not authenticated' });
    }

    // Get existing recipe
    const existingRecipe = await docClient.send(new GetCommand({
      TableName: process.env.RECIPES_TABLE,
      Key: { recipeId },
    }));

    if (!existingRecipe.Item) {
      return response(404, { error: 'Recipe not found' });
    }

    if (existingRecipe.Item.userId !== userId) {
      return response(403, { error: 'Not authorized to update this recipe' });
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

    return response(200, { recipe: updatedRecipe });
  } catch (error) {
    console.error('Update recipe error:', error);
    throw error;
  }
}

export async function deleteRecipe(recipeId: string, userId: string | undefined): Promise<APIGatewayProxyResult> {
  try {
    if (!userId) {
      return response(401, { error: 'User not authenticated' });
    }

    // Get existing recipe to check ownership
    const existingRecipe = await docClient.send(new GetCommand({
      TableName: process.env.RECIPES_TABLE,
      Key: { recipeId },
    }));

    if (!existingRecipe.Item) {
      return response(404, { error: 'Recipe not found' });
    }

    if (existingRecipe.Item.userId !== userId) {
      return response(403, { error: 'Not authorized to delete this recipe' });
    }

    // Delete recipe
    await docClient.send(new DeleteCommand({
      TableName: process.env.RECIPES_TABLE,
      Key: { recipeId },
    }));

    return response(200, { message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Delete recipe error:', error);
    throw error;
  }
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}
