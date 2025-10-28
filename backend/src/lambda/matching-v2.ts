/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
// TODO: Revisit matching-v2 implementation and remove unused variable suppressions once refactor is complete
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import IngredientMatcher, { RecipeMatch } from '../services/ingredient-matcher';
import { getUserIdFromEvent } from '../helpers/authorizer-helper';

const ingredientMatcher = new IngredientMatcher();

interface MatchingRequest {
  userIngredients?: string[];
  dietaryRestrictions?: string[];
  maxCookingTime?: number;
  difficultyLevel?: string;
  minMatchPercentage?: number;
  limit?: number;
}

interface MatchingResponse {
  matches: RecipeMatch[];
  totalMatches: number;
  userIngredients: string[];
  searchCriteria: {
    dietaryRestrictions: string[];
    maxCookingTime?: number;
    difficultyLevel?: string;
    minMatchPercentage: number;
  };
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
    const userId = getUserIdFromEvent(event);

    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    if (path === '/matching-v2/find-recipes' && httpMethod === 'POST') {
      const requestBody = body ? JSON.parse(body) : {};
      return await findMatchingRecipes(requestBody, userId);
    }

    if (path === '/matching-v2/calculate-match' && httpMethod === 'POST') {
      const requestBody = body ? JSON.parse(body) : {};
      return await calculateMatchPercentage(requestBody);
    }

    if (path === '/matching-v2/ingredient-analysis' && httpMethod === 'POST') {
      const requestBody = body ? JSON.parse(body) : {};
      return await analyzeIngredientMatching(requestBody, event.headers.Authorization);
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

async function findMatchingRecipes(
  requestBody: MatchingRequest, 
  userId?: string
): Promise<APIGatewayProxyResult> {
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
    const { 
      userIngredients = [], 
      dietaryRestrictions = [], 
      maxCookingTime, 
      difficultyLevel,
      minMatchPercentage = 30,
      limit = 20 
    } = requestBody;

    // Use the new fuzzy matching system
    const matches = await ingredientMatcher.findMatchingRecipes(userIngredients, {
      minMatchPercentage,
      maxResults: limit,
      includePartialMatches: true
    });

    // Apply additional filters
    let filteredMatches = matches;

    // Filter by dietary restrictions
    if (dietaryRestrictions.length > 0) {
      filteredMatches = filteredMatches.filter(match => {
        // This would need to be enhanced to check recipe tags
        // For now, we'll skip this filter as we need to query recipe details
        return true;
      });
    }

    // Filter by cooking time
    if (maxCookingTime) {
      filteredMatches = filteredMatches.filter(match => 
        match.cookingTime <= maxCookingTime
      );
    }

    // Filter by difficulty level
    if (difficultyLevel) {
      filteredMatches = filteredMatches.filter(match => 
        match.difficulty.toLowerCase() === difficultyLevel.toLowerCase()
      );
    }

    // Sort by match percentage (highest first)
    filteredMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

    // Limit results
    const limitedMatches = filteredMatches.slice(0, limit);

    // Enhance matches with full recipe data
    const enhancedMatches = await Promise.all(
      limitedMatches.map(async (match) => {
        try {
          // Get full recipe data
          const recipeData = await getFullRecipeData(match.recipeId);
          return {
            ...match,
            ...recipeData
          };
        } catch (error) {
          console.error(`Error fetching full recipe data for ${match.recipeId}:`, error);
          return match; // Return original match if full data fetch fails
        }
      })
    );

    // Save matches for analytics (optional)
    await saveMatches(userId, enhancedMatches);

    const response: MatchingResponse = {
      matches: enhancedMatches,
      totalMatches: filteredMatches.length,
      userIngredients,
      searchCriteria: {
        dietaryRestrictions,
        maxCookingTime,
        difficultyLevel,
        minMatchPercentage
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
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

    // Use the new fuzzy matching system for calculation
    const matches = await ingredientMatcher.findMatchingRecipes(userIngredients, {
      minMatchPercentage: 0,
      maxResults: 1,
      includePartialMatches: true
    });

    // Find the best match for the specific recipe
    let bestMatch = null;
    for (const match of matches) {
      if (recipeIngredients.some((ing: string) => 
        match.matchedIngredients.some(matched => 
          matched.toLowerCase().includes(ing.toLowerCase()) || 
          ing.toLowerCase().includes(matched.toLowerCase())
        )
      )) {
        bestMatch = match;
        break;
      }
    }

    const matchResult = bestMatch ? {
      matchPercentage: bestMatch.matchPercentage,
      matchedIngredients: bestMatch.matchedIngredients,
      missingIngredients: bestMatch.missingIngredients,
      totalIngredients: bestMatch.totalIngredients
    } : {
      matchPercentage: 0,
      matchedIngredients: [],
      missingIngredients: userIngredients,
      totalIngredients: recipeIngredients.length
    };

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

async function analyzeIngredientMatching(
  requestBody: any, 
  authorization?: string
): Promise<APIGatewayProxyResult> {
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

    const { userIngredients, recipeId } = requestBody;

    if (!userIngredients || !recipeId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ingredients and recipe ID are required' }),
      };
    }

    // Use the detailed analysis feature
    const analysis = await ingredientMatcher.analyzeIngredientMatching(userIngredients, recipeId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analysis),
    };
  } catch (error) {
    console.error('Analyze ingredient matching error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to analyze ingredient matching' }),
    };
  }
}

async function getFullRecipeData(recipeId: string): Promise<any> {
  try {
    const dynamoClient = new DynamoDBClient({});
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
    
    // Get the main recipe record
    const recipeResult = await docClient.send(new GetCommand({
      TableName: process.env.RECIPES_TABLE,
      Key: {
        PK: `RECIPE#${recipeId}`,
        SK: `RECIPE#${recipeId}`
      }
    }));
    
    if (!recipeResult.Item) {
      throw new Error(`Recipe ${recipeId} not found`);
    }
    
    const recipe = recipeResult.Item;
    
    // Get ingredients for this recipe
    const ingredientsResult = await docClient.send(new QueryCommand({
      TableName: process.env.RECIPES_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `RECIPE#${recipeId}`,
        ':sk': 'INGREDIENT#'
      }
    }));
    
    const ingredients = (ingredientsResult.Items || []).map(item => ({
      name: item.name,
      quantity: item.quantity || '1',
      unit: item.unit || 'piece'
    }));
    
    // Get instructions (if stored separately)
    const instructions = recipe.instructions || [];
    
    return {
      description: recipe.description || '',
      ingredients,
      instructions,
      dietaryTags: recipe.dietaryTags || []
    };
  } catch (error) {
    console.error(`Error fetching full recipe data for ${recipeId}:`, error);
    return {
      description: '',
      ingredients: [],
      instructions: [],
      dietaryTags: []
    };
  }
}

async function saveMatches(userId: string, matches: RecipeMatch[]): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    
    // Note: This would need to be updated to use the new single-table design
    // For now, we'll skip saving matches as the matches table was removed
    
    // TODO: Implement match saving in single-table design
    // This could be stored as:
    // PK: USER#userId, SK: MATCH#timestamp, entity_type: 'match'
    // With GSI for querying user's match history
    
  } catch (error) {
    console.error('Error saving matches:', error);
    // Don't throw error as this is not critical for the main functionality
  }
}
