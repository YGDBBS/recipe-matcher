import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import axios from 'axios';

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
  }[];
  analyzedInstructions: {
    name: string;
    steps: {
      number: number;
      step: string;
    }[];
  }[];
  nutrition: {
    nutrients: {
      name: string;
      amount: number;
      unit: string;
    }[];
  };
  dishTypes: string[];
  cuisines: string[];
  diets: string[];
}

class SpoonacularImporter {
  private readonly SYSTEM_USER_ID = 'system-import';
  private readonly RECIPES_TABLE = process.env.RECIPES_TABLE || 'recipe-matcher-recipes';
  
  // You can get a free API key from https://spoonacular.com/food-api
  // For now, we'll use a demo approach that works without API key
  private readonly SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || 'demo';

  async importFromSpoonacular(): Promise<void> {
    console.log('Importing from Spoonacular API...');
    
    if (this.SPOONACULAR_API_KEY === 'demo') {
      console.log('No API key provided. Using demo data instead...');
      await this.importDemoRecipes();
      return;
    }

    try {
      // Get random recipes (150 free requests per day)
      const response = await axios.get('https://api.spoonacular.com/recipes/random', {
        params: {
          apiKey: this.SPOONACULAR_API_KEY,
          number: 50, // Get 50 recipes per call
          tags: 'main course,dessert,side dish,appetizer'
        }
      });

      const recipes = response.data.recipes as SpoonacularRecipe[];
      console.log(`Found ${recipes.length} recipes from Spoonacular`);

      for (const recipe of recipes) {
        try {
          const convertedRecipe = this.convertSpoonacularRecipe(recipe);
          await this.saveRecipe(convertedRecipe);
          console.log(`Imported: ${convertedRecipe.title}`);
          await this.delay(100); // Rate limiting
        } catch (error) {
          console.error(`Error importing Spoonacular recipe ${recipe.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error importing from Spoonacular:', error);
      console.log('Falling back to demo data...');
      await this.importDemoRecipes();
    }
  }

  private async importDemoRecipes(): Promise<void> {
    console.log('Importing demo recipes...');
    
    const demoRecipes = [
      {
        title: "Classic Spaghetti Carbonara",
        description: "A traditional Italian pasta dish with eggs, cheese, and pancetta",
        ingredients: [
          { name: "Spaghetti", quantity: "400", unit: "gram" },
          { name: "Pancetta", quantity: "200", unit: "gram" },
          { name: "Eggs", quantity: "4", unit: "piece" },
          { name: "Parmesan Cheese", quantity: "100", unit: "gram" },
          { name: "Black Pepper", quantity: "1", unit: "teaspoon" },
          { name: "Salt", quantity: "1", unit: "teaspoon" }
        ],
        instructions: [
          "Cook spaghetti according to package directions",
          "Cut pancetta into small cubes and cook until crispy",
          "Beat eggs with grated parmesan and black pepper",
          "Drain pasta and immediately mix with pancetta",
          "Remove from heat and quickly stir in egg mixture",
          "Serve immediately with extra parmesan"
        ],
        cookingTime: 20,
        servings: 4,
        dietaryTags: ["italian", "non-vegetarian", "dairy"],
        imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=500"
      },
      {
        title: "Chicken Teriyaki Bowl",
        description: "Japanese-inspired chicken with teriyaki sauce over rice",
        ingredients: [
          { name: "Chicken Breast", quantity: "500", unit: "gram" },
          { name: "Jasmine Rice", quantity: "2", unit: "cup" },
          { name: "Soy Sauce", quantity: "60", unit: "milliliter" },
          { name: "Honey", quantity: "30", unit: "milliliter" },
          { name: "Garlic", quantity: "3", unit: "clove" },
          { name: "Ginger", quantity: "1", unit: "tablespoon" },
          { name: "Green Onions", quantity: "4", unit: "piece" },
          { name: "Sesame Seeds", quantity: "1", unit: "tablespoon" }
        ],
        instructions: [
          "Cut chicken into bite-sized pieces",
          "Cook rice according to package directions",
          "Mix soy sauce, honey, garlic, and ginger for teriyaki sauce",
          "Cook chicken in a pan until golden brown",
          "Add teriyaki sauce and simmer until thickened",
          "Serve over rice and garnish with green onions and sesame seeds"
        ],
        cookingTime: 25,
        servings: 4,
        dietaryTags: ["asian", "non-vegetarian", "gluten"],
        imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500"
      },
      {
        title: "Mediterranean Quinoa Salad",
        description: "Fresh and healthy quinoa salad with Mediterranean flavors",
        ingredients: [
          { name: "Quinoa", quantity: "1", unit: "cup" },
          { name: "Cherry Tomatoes", quantity: "200", unit: "gram" },
          { name: "Cucumber", quantity: "1", unit: "piece" },
          { name: "Red Onion", quantity: "1", unit: "piece" },
          { name: "Kalamata Olives", quantity: "100", unit: "gram" },
          { name: "Feta Cheese", quantity: "150", unit: "gram" },
          { name: "Olive Oil", quantity: "60", unit: "milliliter" },
          { name: "Lemon Juice", quantity: "30", unit: "milliliter" },
          { name: "Fresh Basil", quantity: "10", unit: "gram" }
        ],
        instructions: [
          "Cook quinoa according to package directions and let cool",
          "Cut tomatoes in half and dice cucumber",
          "Thinly slice red onion",
          "Mix quinoa with vegetables and olives",
          "Crumble feta cheese over the salad",
          "Whisk olive oil and lemon juice for dressing",
          "Toss salad with dressing and fresh basil"
        ],
        cookingTime: 15,
        servings: 4,
        dietaryTags: ["mediterranean", "vegetarian", "healthy", "dairy"],
        imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500"
      },
      {
        title: "Beef Stir Fry",
        description: "Quick and easy beef stir fry with vegetables",
        ingredients: [
          { name: "Beef Strips", quantity: "400", unit: "gram" },
          { name: "Broccoli", quantity: "200", unit: "gram" },
          { name: "Bell Peppers", quantity: "2", unit: "piece" },
          { name: "Carrots", quantity: "2", unit: "piece" },
          { name: "Soy Sauce", quantity: "45", unit: "milliliter" },
          { name: "Oyster Sauce", quantity: "30", unit: "milliliter" },
          { name: "Garlic", quantity: "3", unit: "clove" },
          { name: "Ginger", quantity: "1", unit: "tablespoon" },
          { name: "Sesame Oil", quantity: "15", unit: "milliliter" }
        ],
        instructions: [
          "Cut beef into thin strips and marinate with soy sauce",
          "Cut all vegetables into bite-sized pieces",
          "Heat oil in a wok or large pan",
          "Stir fry beef until browned, then remove",
          "Add vegetables and stir fry until tender-crisp",
          "Return beef to pan with sauces",
          "Toss everything together and serve hot"
        ],
        cookingTime: 15,
        servings: 4,
        dietaryTags: ["asian", "non-vegetarian", "quick"],
        imageUrl: "https://images.unsplash.com/photo-1609501676725-7186f0a0d0e1?w=500"
      },
      {
        title: "Chocolate Chip Cookies",
        description: "Classic homemade chocolate chip cookies",
        ingredients: [
          { name: "All-Purpose Flour", quantity: "250", unit: "gram" },
          { name: "Butter", quantity: "115", unit: "gram" },
          { name: "Brown Sugar", quantity: "100", unit: "gram" },
          { name: "White Sugar", quantity: "50", unit: "gram" },
          { name: "Eggs", quantity: "1", unit: "piece" },
          { name: "Vanilla Extract", quantity: "5", unit: "milliliter" },
          { name: "Baking Soda", quantity: "1", unit: "teaspoon" },
          { name: "Salt", quantity: "1", unit: "teaspoon" },
          { name: "Chocolate Chips", quantity: "200", unit: "gram" }
        ],
        instructions: [
          "Preheat oven to 375°F (190°C)",
          "Cream butter with both sugars until fluffy",
          "Beat in egg and vanilla extract",
          "Mix flour, baking soda, and salt in separate bowl",
          "Gradually add dry ingredients to wet mixture",
          "Fold in chocolate chips",
          "Drop rounded tablespoons onto baking sheet",
          "Bake for 9-11 minutes until golden brown"
        ],
        cookingTime: 30,
        servings: 24,
        dietaryTags: ["dessert", "vegetarian", "dairy", "gluten"],
        imageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500"
      }
    ];

    for (const recipeData of demoRecipes) {
      try {
        const recipe: Recipe = {
          recipeId: `demo-${Math.random().toString(36).substr(2, 9)}`,
          userId: this.SYSTEM_USER_ID,
          title: recipeData.title,
          description: recipeData.description,
          ingredients: recipeData.ingredients,
          instructions: recipeData.instructions,
          cookingTime: recipeData.cookingTime,
          difficultyLevel: this.estimateDifficulty(recipeData.ingredients.length, recipeData.instructions.length),
          servings: recipeData.servings,
          dietaryTags: recipeData.dietaryTags,
          imageUrl: recipeData.imageUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'Demo Data',
          sourceUrl: 'https://recipe-matcher.com'
        };

        await this.saveRecipe(recipe);
        console.log(`Imported: ${recipe.title}`);
      } catch (error) {
        console.error(`Error importing demo recipe:`, error);
      }
    }
  }

  private convertSpoonacularRecipe(recipe: SpoonacularRecipe): Recipe {
    const ingredients = recipe.extendedIngredients.map(ing => ({
      name: ing.name,
      quantity: ing.amount.toString(),
      unit: ing.unit || 'piece'
    }));

    const instructions = recipe.analyzedInstructions[0]?.steps.map(step => step.step) || [];

    const nutrition = recipe.nutrition?.nutrients.reduce((acc, nutrient) => {
      const name = nutrient.name.toLowerCase();
      if (name.includes('calories')) acc.calories = nutrient.amount;
      if (name.includes('protein')) acc.protein = nutrient.amount;
      if (name.includes('carbohydrate')) acc.carbs = nutrient.amount;
      if (name.includes('fat')) acc.fat = nutrient.amount;
      return acc;
    }, {} as any);

    return {
      recipeId: `spoonacular-${recipe.id}`,
      userId: this.SYSTEM_USER_ID,
      title: recipe.title,
      description: this.cleanHtml(recipe.summary),
      ingredients,
      instructions,
      cookingTime: recipe.readyInMinutes,
      difficultyLevel: this.estimateDifficulty(ingredients.length, instructions.length),
      servings: recipe.servings,
      dietaryTags: [...recipe.dishTypes, ...recipe.cuisines, ...recipe.diets].map(tag => tag.toLowerCase()),
      imageUrl: recipe.image,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'Spoonacular',
      sourceUrl: recipe.sourceUrl,
      nutrition
    };
  }

  private cleanHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
  }

  private estimateDifficulty(ingredientCount: number, instructionCount: number): 'easy' | 'medium' | 'hard' {
    const complexity = ingredientCount + instructionCount;
    if (complexity <= 8) return 'easy';
    if (complexity <= 15) return 'medium';
    return 'hard';
  }

  private async saveRecipe(recipe: Recipe): Promise<void> {
    try {
      // Save main recipe
      await docClient.send(new PutCommand({
        TableName: this.RECIPES_TABLE,
        Item: {
          ...recipe,
          createdAt: recipe.createdAt,
        },
      }));

      // Save ingredient mappings for search
      for (const ingredient of recipe.ingredients) {
        await docClient.send(new PutCommand({
          TableName: this.RECIPES_TABLE,
          Item: {
            recipeId: recipe.recipeId,
            ingredient: ingredient.name.toLowerCase(),
            createdAt: new Date().toISOString(),
          },
        }));
      }
    } catch (error) {
      console.error(`Error saving recipe ${recipe.recipeId}:`, error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI usage
async function main() {
  const importer = new SpoonacularImporter();
  
  try {
    await importer.importFromSpoonacular();
    console.log('Spoonacular recipe import completed successfully!');
  } catch (error) {
    console.error('Spoonacular recipe import failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SpoonacularImporter };
