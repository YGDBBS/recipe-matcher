import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import axios from 'axios';
import { createNormalizedIngredient } from '../utils/ingredient-normalizer';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

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
  cookingTime: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  servings: number;
  dietaryTags: string[];
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  rating?: number;
  reviewCount?: number;
  source?: string;
  sourceUrl?: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  servings: number;
  readyInMinutes: number;
  sourceUrl: string;
  summary: string;
  extendedIngredients: {
    id: number;
    name: string;
    amount: number;
    unit: string;
    original: string;
    originalName: string;
    meta: string[];
    measures: {
      us: { amount: number; unitShort: string; unitLong: string };
      metric: { amount: number; unitShort: string; unitLong: string };
    };
  }[];
  analyzedInstructions: {
    name: string;
    steps: {
      number: number;
      step: string;
      ingredients: { id: number; name: string }[];
      equipment: { id: number; name: string; temperature?: { number: number; unit: string } }[];
    }[];
  }[];
  nutrition: {
    nutrients: {
      name: string;
      amount: number;
      unit: string;
    }[];
  };
}

class SpoonacularImporterV2 {
  private readonly RECIPES_TABLE = process.env.RECIPES_TABLE || 'recipe-matcher-recipes-v2';
  private readonly SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || 'your-api-key-here';
  private readonly SPOONACULAR_BASE_URL = 'https://api.spoonacular.com/recipes';
  private readonly SYSTEM_USER_ID = 'SYSTEM'; // For imported recipes

  async importRecipes(): Promise<void> {
    console.log('🚀 Starting Spoonacular import with single-table design...');
    
    try {
      // Get random recipes from Spoonacular
      const recipes = await this.fetchRandomRecipes(20); // Start with 20 recipes
      
      console.log(`📥 Fetched ${recipes.length} recipes from Spoonacular`);
      
      // Process each recipe
      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
        console.log(`\n📝 Processing recipe ${i + 1}/${recipes.length}: ${recipe.title}`);
        
        try {
          await this.saveRecipeV2(recipe);
          console.log(`✅ Successfully saved: ${recipe.title}`);
        } catch (error) {
          console.error(`❌ Error saving recipe ${recipe.title}:`, error);
        }
        
        // Add delay to respect API rate limits
        await this.delay(1000);
      }
      
      console.log('\n🎉 Import completed successfully!');
      
    } catch (error) {
      console.error('💥 Import failed:', error);
      throw error;
    }
  }

  private async fetchRandomRecipes(count: number): Promise<SpoonacularRecipe[]> {
    try {
      const response = await axios.get(`${this.SPOONACULAR_BASE_URL}/random`, {
        params: {
          apiKey: this.SPOONACULAR_API_KEY,
          number: count,
          tags: 'dinner,lunch,breakfast,appetizer,snack,side dish,main course'
        }
      });
      
      return response.data.recipes;
    } catch (error) {
      console.error('Error fetching recipes from Spoonacular:', error);
      throw error;
    }
  }

  private async saveRecipeV2(spoonacularRecipe: SpoonacularRecipe): Promise<void> {
    const recipeId = `recipe-${spoonacularRecipe.id}`;
    const now = new Date().toISOString();
    
    // Transform Spoonacular recipe to our format
    const recipe: Recipe = {
      recipeId,
      userId: this.SYSTEM_USER_ID,
      title: spoonacularRecipe.title,
      description: this.cleanHtml(spoonacularRecipe.summary),
      ingredients: spoonacularRecipe.extendedIngredients.map(ing => ({
        name: ing.originalName || ing.name,
        quantity: ing.amount.toString(),
        unit: ing.unit
      })),
      instructions: spoonacularRecipe.analyzedInstructions[0]?.steps.map(step => step.step) || [],
      cookingTime: spoonacularRecipe.readyInMinutes,
      difficultyLevel: this.determineDifficulty(spoonacularRecipe.readyInMinutes),
      servings: spoonacularRecipe.servings,
      dietaryTags: this.extractDietaryTags(spoonacularRecipe),
      imageUrl: spoonacularRecipe.image,
      createdAt: now,
      updatedAt: now,
      source: 'Spoonacular',
      sourceUrl: spoonacularRecipe.sourceUrl,
      nutrition: this.extractNutrition(spoonacularRecipe.nutrition)
    };

    // Create all the items for single-table design
    const items = this.createSingleTableItems(recipe);
    
    // Save all items using batch write
    await this.batchWriteItems(items);
  }

  private createSingleTableItems(recipe: Recipe): any[] {
    const items: any[] = [];
    const now = new Date().toISOString();
    
    // 1. Main Recipe Entity
    const recipeEntity = {
      PK: `RECIPE#${recipe.recipeId}`,
      SK: `RECIPE#${recipe.recipeId}`,
      entity_type: 'recipe',
      title: recipe.title,
      description: recipe.description,
      author_id: `USER#${recipe.userId}`,
      created_at: recipe.createdAt,
      updated_at: recipe.updatedAt,
      cooking_time: recipe.cookingTime,
      difficulty_level: recipe.difficultyLevel,
      servings: recipe.servings,
      image_url: recipe.imageUrl,
      source: recipe.source,
      source_url: recipe.sourceUrl,
      rating: recipe.rating,
      review_count: recipe.reviewCount,
      nutrition: recipe.nutrition,
      // GSI projections
      GSI1PK: `AUTHOR#${recipe.userId}`,
      GSI1SK: recipe.createdAt
    };
    items.push(recipeEntity);

    // 2. Ingredient Entities (one per ingredient with normalization)
    for (const ingredient of recipe.ingredients) {
      const normalized = createNormalizedIngredient(ingredient.name);
      
      // Create main ingredient entity
      const ingredientEntity = {
        PK: `RECIPE#${recipe.recipeId}`,
        SK: `INGREDIENT#${normalized.normalized}`,
        entity_type: 'ingredient',
        name: ingredient.name,
        normalized_name: normalized.normalized,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        // GSI3 projection
        GSI3PK: `INGREDIENT#${normalized.normalized}`,
        GSI3SK: `RECIPE#${recipe.recipeId}`
      };
      items.push(ingredientEntity);

      // Create variation entities for better matching
      for (const variation of normalized.variations) {
        if (variation !== normalized.normalized) {
          const variationEntity = {
            PK: `RECIPE#${recipe.recipeId}`,
            SK: `INGREDIENT#${variation}`,
            entity_type: 'ingredient_variation',
            name: ingredient.name,
            normalized_name: normalized.normalized,
            variation: variation,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            // GSI3 projection
            GSI3PK: `INGREDIENT#${variation}`,
            GSI3SK: `RECIPE#${recipe.recipeId}`
          };
          items.push(variationEntity);
        }
      }
    }

    // 3. Step Entities (one per instruction)
    for (let i = 0; i < recipe.instructions.length; i++) {
      const stepEntity = {
        PK: `RECIPE#${recipe.recipeId}`,
        SK: `STEP#${i + 1}`,
        entity_type: 'step',
        order: i + 1,
        instruction: recipe.instructions[i]
      };
      items.push(stepEntity);
    }

    // 4. Tag Entities (one per dietary tag)
    for (const tag of recipe.dietaryTags) {
      const tagEntity = {
        PK: `RECIPE#${recipe.recipeId}`,
        SK: `TAG#${tag}`,
        entity_type: 'tag',
        tag: tag,
        // GSI2 projection
        GSI2PK: `TAG#${tag}`,
        GSI2SK: `RECIPE#${recipe.recipeId}`
      };
      items.push(tagEntity);
    }

    return items;
  }

  private async batchWriteItems(items: any[]): Promise<void> {
    // DynamoDB batch write can handle up to 25 items per request
    const batchSize = 25;
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const requestItems = {
        [this.RECIPES_TABLE]: batch.map(item => ({
          PutRequest: { Item: item }
        }))
      };

      try {
        await docClient.send(new BatchWriteCommand({
          RequestItems: requestItems
        }));
        console.log(`✅ Saved batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
      } catch (error) {
        console.error(`❌ Error saving batch:`, error);
        throw error;
      }
    }
  }

  private cleanHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .trim();
  }

  private determineDifficulty(cookingTime: number): 'easy' | 'medium' | 'hard' {
    if (cookingTime <= 30) return 'easy';
    if (cookingTime <= 60) return 'medium';
    return 'hard';
  }

  private extractDietaryTags(recipe: SpoonacularRecipe): string[] {
    const tags: string[] = [];
    
    // Add meal type tags
    tags.push('main-course');
    
    // Add dietary tags based on ingredients
    const ingredients = recipe.extendedIngredients.map(ing => ing.name.toLowerCase());
    
    if (ingredients.some(ing => ing.includes('chicken') || ing.includes('beef') || ing.includes('pork'))) {
      tags.push('non-vegetarian');
    } else if (ingredients.some(ing => ing.includes('fish') || ing.includes('salmon') || ing.includes('tuna'))) {
      tags.push('seafood');
    } else {
      tags.push('vegetarian');
    }
    
    if (ingredients.some(ing => ing.includes('gluten') || ing.includes('wheat'))) {
      tags.push('gluten-free');
    }
    
    if (ingredients.some(ing => ing.includes('dairy') || ing.includes('milk') || ing.includes('cheese'))) {
      tags.push('dairy-free');
    }
    
    return tags;
  }

  private extractNutrition(nutrition: any): any {
    if (!nutrition?.nutrients) return undefined;
    
    const nutrients = nutrition.nutrients;
    const calories = nutrients.find((n: any) => n.name === 'Calories')?.amount;
    const protein = nutrients.find((n: any) => n.name === 'Protein')?.amount;
    const carbs = nutrients.find((n: any) => n.name === 'Carbohydrates')?.amount;
    const fat = nutrients.find((n: any) => n.name === 'Fat')?.amount;
    
    return {
      calories: calories ? Math.round(calories) : undefined,
      protein: protein ? Math.round(protein) : undefined,
      carbs: carbs ? Math.round(carbs) : undefined,
      fat: fat ? Math.round(fat) : undefined
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the importer if this file is executed directly
if (require.main === module) {
  const importer = new SpoonacularImporterV2();
  importer.importRecipes()
    .then(() => {
      console.log('🎉 Import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Import failed:', error);
      process.exit(1);
    });
}

export default SpoonacularImporterV2;
