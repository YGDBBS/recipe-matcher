import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { 
  normalizeIngredient, 
  generateIngredientVariations, 
  areIngredientsSimilar 
} from '../utils/ingredient-normalizer';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export interface RecipeMatch {
  recipeId: string;
  title: string;
  matchPercentage: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  totalIngredients: number;
  author: string;
  cookingTime: number;
  difficulty: string;
  servings: number;
  imageUrl?: string;
}

export interface IngredientMatch {
  userIngredient: string;
  recipeIngredient: string;
  matchScore: number;
  isExactMatch: boolean;
}

export class IngredientMatcher {
  private readonly RECIPES_TABLE = process.env.RECIPES_TABLE || 'recipe-matcher-recipes-v2';

  /**
   * Find recipes that match user's pantry ingredients using fuzzy matching
   */
  async findMatchingRecipes(
    userIngredients: string[], 
    options: {
      minMatchPercentage?: number;
      maxResults?: number;
      includePartialMatches?: boolean;
    } = {}
  ): Promise<RecipeMatch[]> {
    const {
      minMatchPercentage = 50,
      maxResults = 20
    } = options;

    // Step 1: Get all unique recipes from the database
    const allRecipes = await this.getAllRecipes();

    // Step 2: Calculate match scores for each recipe
    const recipeMatches: RecipeMatch[] = [];
    
    for (const recipe of allRecipes) {
      const match = await this.calculateRecipeMatch(recipe, userIngredients);
      
      if (match.matchPercentage >= minMatchPercentage) {
        recipeMatches.push(match);
      }
    }

    // Step 3: Sort by match percentage and limit results
    const sortedMatches = recipeMatches
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, maxResults);

    return sortedMatches;
  }

  /**
   * Get all recipes from the database
   */
  private async getAllRecipes(): Promise<any[]> {
    const recipes: any[] = [];
    
    try {
      // Query for all recipe entities
      const params = {
        TableName: this.RECIPES_TABLE,
        FilterExpression: 'entity_type = :recipeType',
        ExpressionAttributeValues: {
          ':recipeType': 'recipe'
        }
      };

      const result = await docClient.send(new ScanCommand(params));
      
      if (result.Items) {
        recipes.push(...result.Items);
      }

      // Handle pagination if needed
      let lastEvaluatedKey = result.LastEvaluatedKey;
      while (lastEvaluatedKey) {
        const nextParams = {
          ...params,
          ExclusiveStartKey: lastEvaluatedKey
        };
        
        const nextResult = await docClient.send(new ScanCommand(nextParams));
        if (nextResult.Items) {
          recipes.push(...nextResult.Items);
        }
        lastEvaluatedKey = nextResult.LastEvaluatedKey;
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
      throw error;
    }

    return recipes;
  }

  /**
   * Calculate match score for a single recipe
   */
  private async calculateRecipeMatch(recipe: any, userIngredients: string[]): Promise<RecipeMatch> {
    const recipeId = recipe.PK.replace('RECIPE#', '');
    
    // Get all ingredients for this recipe
    const recipeIngredients = await this.getRecipeIngredients(recipeId);
    
    // Calculate matches
    const matches: IngredientMatch[] = [];
    const matchedIngredients: string[] = [];
    const missingIngredients: string[] = [];
    
    for (const userIngredient of userIngredients) {
      const bestMatch = this.findBestMatchForIngredient(userIngredient, recipeIngredients);
      
      if (bestMatch) {
        matches.push(bestMatch);
        matchedIngredients.push(bestMatch.recipeIngredient);
      } else {
        missingIngredients.push(userIngredient);
      }
    }
    
    // Calculate match percentage based on user ingredients matched
    const totalUserIngredients = userIngredients.length;
    const matchedCount = matches.length;
    const matchPercentage = Math.round((matchedCount / totalUserIngredients) * 100);
    
    return {
      recipeId,
      title: recipe.title,
      matchPercentage,
      matchedIngredients,
      missingIngredients,
      totalIngredients: recipeIngredients.length,
      author: recipe.author_id?.replace('USER#', '') || 'Unknown',
      cookingTime: recipe.cooking_time || 0,
      difficulty: recipe.difficulty_level || 'unknown',
      servings: recipe.servings || 0,
      imageUrl: recipe.image_url
    };
  }

  /**
   * Get all ingredients for a specific recipe
   */
  private async getRecipeIngredients(recipeId: string): Promise<string[]> {
    const ingredients: string[] = [];
    
    try {
      const params = {
        TableName: this.RECIPES_TABLE,
        KeyConditionExpression: 'PK = :recipeId AND begins_with(SK, :ingredientPrefix)',
        ExpressionAttributeValues: {
          ':recipeId': `RECIPE#${recipeId}`,
          ':ingredientPrefix': 'INGREDIENT#'
        }
      };

      const result = await docClient.send(new QueryCommand(params));
      
      if (result.Items) {
        // Get unique ingredient names (avoid duplicates from variations)
        const uniqueIngredients = new Set<string>();
        
        for (const item of result.Items) {
          if (item.entity_type === 'ingredient' && item.name) {
            uniqueIngredients.add(item.name);
          }
        }
        
        ingredients.push(...Array.from(uniqueIngredients));
      }
    } catch (error) {
      console.error(`Error fetching ingredients for recipe ${recipeId}:`, error);
    }

    return ingredients;
  }

  /**
   * Find the best match for a user ingredient against recipe ingredients
   */
  private findBestMatchForIngredient(
    userIngredient: string, 
    recipeIngredients: string[]
  ): IngredientMatch | null {
    const normalizedUserIngredient = normalizeIngredient(userIngredient);
    const userVariations = generateIngredientVariations(userIngredient);
    
    let bestMatch: IngredientMatch | null = null;
    let bestScore = 0;
    
    for (const recipeIngredient of recipeIngredients) {
      const normalizedRecipeIngredient = normalizeIngredient(recipeIngredient);
      const recipeVariations = generateIngredientVariations(recipeIngredient);
      
      let score = 0;
      let isExactMatch = false;
      
      // Check for exact normalized match
      if (normalizedUserIngredient === normalizedRecipeIngredient) {
        score = 100;
        isExactMatch = true;
      }
      // Check if user ingredient is contained in recipe ingredient
      else if (normalizedRecipeIngredient.includes(normalizedUserIngredient)) {
        score = 90;
      }
      // Check if recipe ingredient is contained in user ingredient
      else if (normalizedUserIngredient.includes(normalizedRecipeIngredient)) {
        score = 85;
      }
      // Check for variation matches
      else {
        const commonVariations = userVariations.filter(v => recipeVariations.includes(v));
        if (commonVariations.length > 0) {
          score = 70 + (commonVariations.length * 5);
        }
        // Check for similarity using our existing function
        else if (areIngredientsSimilar(userIngredient, recipeIngredient)) {
          score = 60;
        }
      }
      
      // Update best match if this score is higher
      if (score > bestScore) {
        bestMatch = {
          userIngredient,
          recipeIngredient,
          matchScore: score,
          isExactMatch
        };
        bestScore = score;
      }
    }
    
    // Only return matches with score >= 50
    return bestScore >= 50 ? bestMatch : null;
  }

  /**
   * Find recipes by specific ingredient using GSI3
   */
  async findRecipesByIngredient(ingredient: string): Promise<string[]> {
    const normalizedIngredient = normalizeIngredient(ingredient);
    const variations = generateIngredientVariations(ingredient);
    
    const recipeIds = new Set<string>();
    
    // Try exact match first
    try {
      const exactMatch = await this.queryGSI3(`INGREDIENT#${normalizedIngredient}`);
      exactMatch.forEach(item => {
        const recipeId = item.PK.replace('RECIPE#', '');
        recipeIds.add(recipeId);
      });
    } catch (error) {
      console.error(`No exact match for ${normalizedIngredient}`, error);
    }
    
    // Try variations if no exact match
    if (recipeIds.size === 0) {
      for (const variation of variations) {
        try {
          const variationMatch = await this.queryGSI3(`INGREDIENT#${variation}`);
          variationMatch.forEach(item => {
            const recipeId = item.PK.replace('RECIPE#', '');
            recipeIds.add(recipeId);
          });
        } catch (error) {
          console.error(`No match for ${variation}`, error);
        }
      }
    }
    
    return Array.from(recipeIds);
  }

  /**
   * Query GSI3 for ingredient matches
   */
  private async queryGSI3(ingredientKey: string): Promise<any[]> {
    const params = {
      TableName: this.RECIPES_TABLE,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :ingredient',
      ExpressionAttributeValues: {
        ':ingredient': ingredientKey
      }
    };

    const result = await docClient.send(new QueryCommand(params));
    return result.Items || [];
  }

  /**
   * Get detailed ingredient analysis for debugging
   */
  async analyzeIngredientMatching(
    userIngredients: string[], 
    recipeId: string
  ): Promise<{
    recipeTitle: string;
    analysis: {
      userIngredient: string;
      bestMatch: IngredientMatch | null;
      allMatches: IngredientMatch[];
    }[];
  }> {
    const recipe = await this.getRecipeById(recipeId);
    if (!recipe) {
      throw new Error(`Recipe ${recipeId} not found`);
    }
    
    const recipeIngredients = await this.getRecipeIngredients(recipeId);
    
    const analysis = userIngredients.map(userIngredient => {
      const allMatches: IngredientMatch[] = [];
      
      for (const recipeIngredient of recipeIngredients) {
        const match = this.findBestMatchForIngredient(userIngredient, [recipeIngredient]);
        if (match) {
          allMatches.push(match);
        }
      }
      
      const bestMatch = allMatches.length > 0 
        ? allMatches.reduce((best, current) => current.matchScore > best.matchScore ? current : best)
        : null;
      
      return {
        userIngredient,
        bestMatch,
        allMatches: allMatches.sort((a, b) => b.matchScore - a.matchScore)
      };
    });
    
    return {
      recipeTitle: recipe.title,
      analysis
    };
  }

  /**
   * Get a recipe by ID
   */
  private async getRecipeById(recipeId: string): Promise<any | null> {
    const params = {
      TableName: this.RECIPES_TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `RECIPE#${recipeId}`,
        ':sk': `RECIPE#${recipeId}`
      }
    };

    const result = await docClient.send(new QueryCommand(params));
    return result.Items?.[0] || null;
  }
}

export default IngredientMatcher;
