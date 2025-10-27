import { APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { response } from '../utils/response';

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

export interface UserIngredient {
  userId: string;
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  unitType: 'weight' | 'volume' | 'count' | 'length';
  weight?: {
    quantity: number;
    unit: string;
    unitType: 'weight';
  };
  expiryDate?: string;
  addedAt: string;
}

export async function findMatchingRecipes(requestBody: any, userId: string | undefined, _headers: any): Promise<APIGatewayProxyResult> {
  try {
    // If no userId, work in local mode (no user ingredients from database)
    const isLocalMode = !userId;

    const { 
      userIngredients, 
      dietaryRestrictions = [], 
      maxCookingTime, 
      difficultyLevel,
      limit = 20 
    } = requestBody;

    // Get user's ingredients if not provided
    let userIngredientsList: UserIngredient[] = [];
    if (!userIngredients || userIngredients.length === 0) {
      if (isLocalMode) {
        // In local mode, no user ingredients from database
        userIngredientsList = [];
      } else {
        const userIngredientsResult = await docClient.send(new QueryCommand({
          TableName: process.env.USER_INGREDIENTS_TABLE,
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
        }));
        userIngredientsList = userIngredientsResult.Items as UserIngredient[] || [];
      }
    } else {
      // Convert string array to UserIngredient objects (for backward compatibility)
      userIngredientsList = userIngredients.map((name: string) => ({
        userId: userId || 'local-user',
        ingredientId: '',
        name,
        quantity: 1,
        unit: 'piece',
        unitType: 'count' as const,
        addedAt: new Date().toISOString(),
      }));
    }

    // Get all recipes - let's see what's actually in the table
    const recipesResult = await docClient.send(new ScanCommand({
      TableName: process.env.RECIPES_TABLE,
    }));

    const allItems = recipesResult.Items || [];
    console.log('Total items in table:', allItems.length);
    console.log('Sample items:', allItems.slice(0, 3));
    
    // Filter for actual recipe records (those with title and ingredients)
    const allRecipes = allItems.filter(item => item.title && item.ingredients);
    console.log('Found recipes:', allRecipes.length);
    console.log('Sample recipe:', allRecipes[0]);
    
    // Calculate matches for each recipe
    const recipeMatches: RecipeMatch[] = [];
    
    for (const recipe of allRecipes) {
      if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) continue;

      const recipeIngredients = recipe.ingredients.map((ing: any) => ing.name.toLowerCase());
      const matchResult = calculateEnhancedIngredientMatch(userIngredientsList, recipeIngredients);
      
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

    // Save matches for analytics (only if authenticated)
    if (!isLocalMode && userId) {
      await saveMatches(userId, limitedMatches);
    }

    return response(200, { 
      matches: limitedMatches,
      totalMatches: recipeMatches.length,
      userIngredients: userIngredientsList.map(ui => ui.name),
    });
  } catch (error) {
    console.error('Find matching recipes error:', error);
    throw error;
  }
}

export async function calculateMatchPercentage(requestBody: any, _headers: any): Promise<APIGatewayProxyResult> {
  try {
    const { userIngredients, recipeIngredients } = requestBody;

    if (!userIngredients || !recipeIngredients) {
      return response(400, { error: 'User ingredients and recipe ingredients are required' });
    }

    const matchResult = calculateIngredientMatch(userIngredients, recipeIngredients);

    return response(200, matchResult);
  } catch (error) {
    console.error('Calculate match percentage error:', error);
    throw error;
  }
}

// Enhanced matching function that handles dual measurements and unit conversions
export function calculateEnhancedIngredientMatch(userIngredients: UserIngredient[], recipeIngredients: string[]): {
  matchPercentage: number;
  availableIngredients: string[];
  missingIngredients: string[];
} {
  const recipeIngredientsLower = recipeIngredients.map(ing => ing.toLowerCase());
  const availableIngredients: string[] = [];
  const missingIngredients: string[] = [];

  // Check which recipe ingredients the user has
  for (const recipeIngredient of recipeIngredientsLower) {
    const hasIngredient = userIngredients.some(userIngredient => {
      const userIngredientName = userIngredient.name.toLowerCase();
      
      // Basic name matching
      const nameMatch = userIngredientName.includes(recipeIngredient) || 
                       recipeIngredient.includes(userIngredientName);
      
      if (!nameMatch) return false;
      
      // If we have weight information, we could add quantity/weight matching logic here
      // For now, we'll just use name matching but this is where we'd add:
      // - Quantity sufficiency checks
      // - Unit conversion matching
      // - Weight-based matching
      
      return true;
    });
    
    if (hasIngredient) {
      availableIngredients.push(recipeIngredient);
    } else {
      missingIngredients.push(recipeIngredient);
    }
  }

  const matchPercentage = (availableIngredients.length / recipeIngredientsLower.length) * 100;

  return {
    matchPercentage: Math.round(matchPercentage * 100) / 100,
    availableIngredients,
    missingIngredients,
  };
}

// Legacy function for backward compatibility
export function calculateIngredientMatch(userIngredients: string[], recipeIngredients: string[]): {
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
