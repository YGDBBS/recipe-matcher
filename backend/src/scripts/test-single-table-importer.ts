import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
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

class TestSingleTableImporter {
  private readonly RECIPES_TABLE = process.env.RECIPES_TABLE || 'recipe-matcher-recipes-v2';
  private readonly SYSTEM_USER_ID = 'SYSTEM';

  async testImport(): Promise<void> {
    console.log('🧪 Testing Single-Table Import with Mock Data...\n');
    
    try {
      // Create test recipes
      const testRecipes = this.createTestRecipes();
      
      console.log(`📝 Created ${testRecipes.length} test recipes`);
      
      // Process each recipe
      for (let i = 0; i < testRecipes.length; i++) {
        const recipe = testRecipes[i];
        console.log(`\n📝 Processing recipe ${i + 1}/${testRecipes.length}: ${recipe.title}`);
        
        try {
          await this.saveRecipeV2(recipe);
          console.log(`✅ Successfully saved: ${recipe.title}`);
        } catch (error) {
          console.error(`❌ Error saving recipe ${recipe.title}:`, error);
        }
      }
      
      console.log('\n🎉 Test import completed successfully!');
      
    } catch (error) {
      console.error('💥 Test import failed:', error);
      throw error;
    }
  }

  private createTestRecipes(): Recipe[] {
    return [
      {
        recipeId: 'test-recipe-1',
        userId: this.SYSTEM_USER_ID,
        title: 'Chicken Stir Fry',
        description: 'Quick and easy chicken stir fry with vegetables',
        ingredients: [
          { name: 'Chicken Breast', quantity: '300', unit: 'gram' },
          { name: 'Bell Peppers', quantity: '2', unit: 'piece' },
          { name: 'Broccoli', quantity: '200', unit: 'gram' },
          { name: 'Garlic', quantity: '3', unit: 'clove' },
          { name: 'Soy Sauce', quantity: '30', unit: 'milliliter' },
          { name: 'Olive Oil', quantity: '15', unit: 'milliliter' }
        ],
        instructions: [
          'Cut chicken into thin strips',
          'Heat oil in a wok or large pan',
          'Stir fry chicken until golden brown',
          'Add vegetables and stir fry for 3-4 minutes',
          'Add soy sauce and toss everything together',
          'Serve hot over rice'
        ],
        cookingTime: 20,
        difficultyLevel: 'easy',
        servings: 4,
        dietaryTags: ['dinner', 'asian', 'non-vegetarian', 'quick'],
        imageUrl: 'https://images.unsplash.com/photo-1609501676725-7186f0a0d0e1?w=500',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'Test Data',
        nutrition: {
          calories: 350,
          protein: 28,
          carbs: 12,
          fat: 18
        }
      },
      {
        recipeId: 'test-recipe-2',
        userId: this.SYSTEM_USER_ID,
        title: 'Vegetarian Pasta',
        description: 'Creamy vegetarian pasta with fresh vegetables',
        ingredients: [
          { name: 'Pasta', quantity: '400', unit: 'gram' },
          { name: 'Cherry Tomatoes', quantity: '200', unit: 'gram' },
          { name: 'Fresh Basil', quantity: '20', unit: 'gram' },
          { name: 'Garlic', quantity: '2', unit: 'clove' },
          { name: 'Olive Oil', quantity: '30', unit: 'milliliter' },
          { name: 'Parmesan Cheese', quantity: '50', unit: 'gram' }
        ],
        instructions: [
          'Cook pasta according to package instructions',
          'Heat olive oil in a large pan',
          'Add garlic and cook until fragrant',
          'Add cherry tomatoes and cook until they burst',
          'Toss with cooked pasta and fresh basil',
          'Serve with grated parmesan cheese'
        ],
        cookingTime: 25,
        difficultyLevel: 'easy',
        servings: 4,
        dietaryTags: ['dinner', 'italian', 'vegetarian', 'pasta'],
        imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=500',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'Test Data',
        nutrition: {
          calories: 420,
          protein: 15,
          carbs: 65,
          fat: 12
        }
      }
    ];
  }

  private async saveRecipeV2(recipe: Recipe): Promise<void> {
    // Create all the items for single-table design
    const items = this.createSingleTableItems(recipe);
    
    console.log(`📦 Created ${items.length} items for recipe: ${recipe.title}`);
    
    // Log the structure for verification
    console.log('📋 Item types:');
    const itemTypes = items.reduce((acc, item) => {
      acc[item.entity_type] = (acc[item.entity_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(itemTypes);
    
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
      
      console.log(`  🥕 Ingredient: "${ingredient.name}" → "${normalized.normalized}"`);
      console.log(`     Variations: [${normalized.variations.join(', ')}]`);
      
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
}

// Run the test importer if this file is executed directly
if (require.main === module) {
  const importer = new TestSingleTableImporter();
  importer.testImport()
    .then(() => {
      console.log('🎉 Test import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test import failed:', error);
      process.exit(1);
    });
}

export default TestSingleTableImporter;
