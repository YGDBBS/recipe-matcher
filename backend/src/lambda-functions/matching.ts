import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

interface RecipeMatch {
  recipeId: string;
  title: string;
  description: string;
  ingredients: {
    name: string;
    quantity: string;
    unit: string;
  }[];
  instructions: string[];
  cookingTime: number;
  difficultyLevel: string;
  servings: number;
  dietaryTags: string[];
  imageUrl?: string;
  matchPercentage: number;
  missingIngredients: string[];
  availableIngredients: string[];
  userId: string;
  createdAt: string;
  rating?: number;
  reviewCount?: number;
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
    const { httpMethod, path, body } = event;

    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    if (path === '/matching/find-recipes' && httpMethod === 'POST') {
      const requestBody = body ? JSON.parse(body) : {};
      return await findMatchingRecipes(requestBody, event.headers.Authorization);
    }

    if (path === '/matching/calculate-match' && httpMethod === 'POST') {
      const requestBody = body ? JSON.parse(body) : {};
      return await calculateMatchPercentage(requestBody);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Matching error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

async function findMatchingRecipes(requestBody: any, authorization?: string): Promise<APIGatewayProxyResult> {
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
    const { 
      userIngredients, 
      dietaryRestrictions = [], 
      maxCookingTime, 
      difficultyLevel,
      limit = 20 
    } = requestBody;

    // Get user's ingredients if not provided
    let ingredientsToMatch = userIngredients;
    if (!ingredientsToMatch || ingredientsToMatch.length === 0) {
      const userIngredientsResult = await docClient.send(new QueryCommand({
        TableName: process.env.USER_INGREDIENTS_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      }));
      ingredientsToMatch = (userIngredientsResult.Items as UserIngredient[] || []).map(ui => ui.name);
    }

    // Get all recipes
    const recipesResult = await docClient.send(new ScanCommand({
      TableName: process.env.RECIPES_TABLE,
      FilterExpression: 'attribute_exists(recipeId) AND attribute_exists(title)',
    }));

    const allRecipes = recipesResult.Items || [];
    
    // Calculate matches for each recipe
    const recipeMatches: RecipeMatch[] = [];
    
    for (const recipe of allRecipes) {
      if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) continue;

      const recipeIngredients = recipe.ingredients.map((ing: any) => ing.name.toLowerCase());
      const matchResult = calculateIngredientMatch(ingredientsToMatch, recipeIngredients);
      
      // Apply filters
      if (dietaryRestrictions.length > 0) {
        const hasDietaryMatch = recipe.dietaryTags?.some((tag: string) => 
          dietaryRestrictions.includes(tag)
        );
        if (!hasDietaryMatch) continue;
      }

      if (maxCookingTime && recipe.cookingTime > maxCookingTime) continue;
      if (difficultyLevel && recipe.difficultyLevel !== difficultyLevel) continue;

      // Only include recipes with at least 20% match
      if (matchResult.matchPercentage >= 20) {
        recipeMatches.push({
          recipeId: recipe.recipeId,
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions || [],
          cookingTime: recipe.cookingTime,
          difficultyLevel: recipe.difficultyLevel,
          servings: recipe.servings,
          dietaryTags: recipe.dietaryTags || [],
          imageUrl: recipe.imageUrl,
          matchPercentage: matchResult.matchPercentage,
          missingIngredients: matchResult.missingIngredients,
          availableIngredients: matchResult.availableIngredients,
          userId: recipe.userId,
          createdAt: recipe.createdAt,
          rating: recipe.rating,
          reviewCount: recipe.reviewCount,
        });
      }
    }

    // Sort by match percentage (highest first)
    recipeMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

    // Limit results
    const limitedMatches = recipeMatches.slice(0, parseInt(limit));

    // Save matches for analytics
    await saveMatches(userId, limitedMatches);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        matches: limitedMatches,
        totalMatches: recipeMatches.length,
        userIngredients: ingredientsToMatch,
      }),
    };
  } catch (error) {
    console.error('Find matching recipes error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to find matching recipes' }),
    };
  }
}

async function calculateMatchPercentage(requestBody: any): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const { userIngredients, recipeIngredients } = requestBody;

    if (!userIngredients || !recipeIngredients) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ingredients and recipe ingredients are required' }),
      };
    }

    const matchResult = calculateIngredientMatch(userIngredients, recipeIngredients);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(matchResult),
    };
  } catch (error) {
    console.error('Calculate match percentage error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to calculate match percentage' }),
    };
  }
}

function calculateIngredientMatch(userIngredients: string[], recipeIngredients: string[]): {
  matchPercentage: number;
  availableIngredients: string[];
  missingIngredients: string[];
} {
  const userIngredientsLower = userIngredients.map(ing => ing.toLowerCase());
  const recipeIngredientsLower = recipeIngredients.map(ing => ing.toLowerCase());

  const availableIngredients: string[] = [];
  const missingIngredients: string[] = [];

  // Check which recipe ingredients the user has
  for (const recipeIngredient of recipeIngredientsLower) {
    const hasIngredient = userIngredientsLower.some(userIngredient => 
      userIngredient.includes(recipeIngredient) || recipeIngredient.includes(userIngredient)
    );
    
    if (hasIngredient) {
      availableIngredients.push(recipeIngredient);
    } else {
      missingIngredients.push(recipeIngredient);
    }
  }

  // Calculate match percentage
  const matchPercentage = Math.round((availableIngredients.length / recipeIngredientsLower.length) * 100);

  return {
    matchPercentage,
    availableIngredients,
    missingIngredients,
  };
}

async function saveMatches(userId: string, matches: RecipeMatch[]): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    
    for (const match of matches) {
      await docClient.send(new PutCommand({
        TableName: process.env.MATCHES_TABLE,
        Item: {
          userId,
          recipeId: match.recipeId,
          matchPercentage: match.matchPercentage,
          createdAt: timestamp,
        },
      }));
    }
  } catch (error) {
    console.error('Error saving matches:', error);
    // Don't throw error as this is not critical for the main functionality
  }
}

function extractUserIdFromToken(authorization: string): string {
  const token = authorization.replace('Bearer ', '');
  return token;
}
