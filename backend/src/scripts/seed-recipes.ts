// seed-recipes.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

type Ingredient = { name: string; quantity?: string; unit?: string; note?: string };

type SeedRecipe = {
  recipeId: string;
  title: string;
  description: string;
  cookingTime: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  servings: number;
  imageUrl?: string;
  dietaryTags?: string[];
  cuisine: string;
  ingredients: Ingredient[];
  instructions?: string[];
};

const REGION = process.env.AWS_REGION || 'eu-west-1';
const TABLE_NAME = process.env.RECIPES_TABLE_V2 || 'recipe-matcher-recipes-v2';

const dynamoClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

function rid(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const RECIPES: SeedRecipe[] = [
  // === ITALIAN ===
  {
    recipeId: rid('spaghetti-carbonara'),
    title: 'Spaghetti Carbonara',
    description: 'Classic Italian pasta with eggs, cheese, pancetta, and black pepper.',
    cookingTime: 20,
    difficultyLevel: 'medium',
    servings: 4,
    cuisine: 'Italian',
    dietaryTags: ['pasta'],
    ingredients: [
      { name: 'spaghetti', quantity: '400', unit: 'g' },
      { name: 'pancetta', quantity: '150', unit: 'g' },
      { name: 'eggs', quantity: '4' },
      { name: 'parmesan cheese', quantity: '60', unit: 'g' },
      { name: 'black pepper', quantity: '1', unit: 'tsp' },
    ],
    instructions: ['Cook pasta.', 'Fry pancetta.', 'Mix eggs + cheese.', 'Combine off heat.'],
  },
  {
    recipeId: rid('margherita-pizza'),
    title: 'Margherita Pizza',
    description: 'Simple and classic pizza with tomato, mozzarella, and basil.',
    cookingTime: 15,
    difficultyLevel: 'easy',
    servings: 2,
    cuisine: 'Italian',
    dietaryTags: ['vegetarian', 'pizza'],
    ingredients: [
      { name: 'pizza dough', quantity: '1' },
      { name: 'tomato sauce', quantity: '100', unit: 'g' },
      { name: 'mozzarella', quantity: '150', unit: 'g' },
      { name: 'fresh basil', quantity: '10', unit: 'leaves' },
      { name: 'olive oil', quantity: '1', unit: 'tbsp' },
    ],
  },

  // === JAPANESE ===
  {
    recipeId: rid('chicken-teriyaki'),
    title: 'Chicken Teriyaki',
    description: 'Sweet and savory glazed chicken, a Japanese favorite.',
    cookingTime: 20,
    difficultyLevel: 'easy',
    servings: 2,
    cuisine: 'Japanese',
    ingredients: [
      { name: 'chicken thigh', quantity: '400', unit: 'g' },
      { name: 'soy sauce', quantity: '3', unit: 'tbsp' },
      { name: 'mirin', quantity: '2', unit: 'tbsp' },
      { name: 'sugar', quantity: '1', unit: 'tbsp' },
      { name: 'ginger', quantity: '1', unit: 'inch' },
    ],
  },
  {
    recipeId: rid('miso-soup'),
    title: 'Miso Soup',
    description: 'Light and comforting soup with tofu and seaweed.',
    cookingTime: 10,
    difficultyLevel: 'easy',
    servings: 4,
    cuisine: 'Japanese',
    dietaryTags: ['vegetarian'],
    ingredients: [
      { name: 'miso paste', quantity: '3', unit: 'tbsp' },
      { name: 'tofu', quantity: '200', unit: 'g' },
      { name: 'wakame', quantity: '10', unit: 'g' },
      { name: 'green onion', quantity: '2' },
      { name: 'dashi', quantity: '4', unit: 'cups' },
    ],
  },

  // === INDIAN ===
  {
    recipeId: rid('butter-chicken'),
    title: 'Butter Chicken',
    description: 'Creamy tomato-based curry with tender chicken.',
    cookingTime: 40,
    difficultyLevel: 'medium',
    servings: 4,
    cuisine: 'Indian',
    ingredients: [
      { name: 'chicken', quantity: '600', unit: 'g' },
      { name: 'yogurt', quantity: '100', unit: 'g' },
      { name: 'tomato puree', quantity: '200', unit: 'g' },
      { name: 'butter', quantity: '50', unit: 'g' },
      { name: 'garam masala', quantity: '1', unit: 'tbsp' },
      { name: 'cream', quantity: '100', unit: 'ml' },
    ],
  },
  {
    recipeId: rid('chana-masala'),
    title: 'Chana Masala',
    description: 'Spiced chickpea curry, hearty and vegan.',
    cookingTime: 30,
    difficultyLevel: 'easy',
    servings: 4,
    cuisine: 'Indian',
    dietaryTags: ['vegan', 'vegetarian'],
    ingredients: [
      { name: 'chickpeas', quantity: '2', unit: 'cans' },
      { name: 'onion', quantity: '1' },
      { name: 'tomato', quantity: '2' },
      { name: 'ginger', quantity: '1', unit: 'inch' },
      { name: 'cumin', quantity: '1', unit: 'tsp' },
      { name: 'coriander', quantity: '1', unit: 'tsp' },
    ],
  },

  // === MEXICAN ===
  {
    recipeId: rid('tacos-al-pastor'),
    title: 'Tacos Al Pastor',
    description: 'Pineapple-marinated pork tacos with cilantro and onion.',
    cookingTime: 25,
    difficultyLevel: 'medium',
    servings: 3,
    cuisine: 'Mexican',
    ingredients: [
      { name: 'pork shoulder', quantity: '500', unit: 'g' },
      { name: 'pineapple', quantity: '200', unit: 'g' },
      { name: 'achiote paste', quantity: '2', unit: 'tbsp' },
      { name: 'corn tortillas', quantity: '12' },
      { name: 'cilantro', quantity: '1', unit: 'bunch' },
      { name: 'onion', quantity: '1' },
    ],
  },
  {
    recipeId: rid('guacamole'),
    title: 'Guacamole',
    description: 'Fresh avocado dip with lime and cilantro.',
    cookingTime: 10,
    difficultyLevel: 'easy',
    servings: 4,
    cuisine: 'Mexican',
    dietaryTags: ['vegan'],
    ingredients: [
      { name: 'avocado', quantity: '3' },
      { name: 'lime', quantity: '1' },
      { name: 'cilantro', quantity: '2', unit: 'tbsp' },
      { name: 'red onion', quantity: '1/4' },
      { name: 'jalapeño', quantity: '1' },
      { name: 'salt', quantity: '1', unit: 'pinch' },
    ],
  },

  // === CHINESE ===
  {
    recipeId: rid('kung-pao-chicken'),
    title: 'Kung Pao Chicken',
    description: 'Spicy stir-fried chicken with peanuts and peppers.',
    cookingTime: 20,
    difficultyLevel: 'medium',
    servings: 3,
    cuisine: 'Chinese',
    ingredients: [
      { name: 'chicken breast', quantity: '400', unit: 'g' },
      { name: 'peanuts', quantity: '50', unit: 'g' },
      { name: 'dried chili', quantity: '6' },
      { name: 'bell pepper', quantity: '1' },
      { name: 'soy sauce', quantity: '2', unit: 'tbsp' },
      { name: 'vinegar', quantity: '1', unit: 'tbsp' },
    ],
  },
  {
    recipeId: rid('vegetable-fried-rice'),
    title: 'Vegetable Fried Rice',
    description: 'Quick fried rice with mixed veggies and egg.',
    cookingTime: 15,
    difficultyLevel: 'easy',
    servings: 4,
    cuisine: 'Chinese',
    dietaryTags: ['vegetarian'],
    ingredients: [
      { name: 'rice', quantity: '2', unit: 'cups', note: 'cooked' },
      { name: 'carrot', quantity: '1' },
      { name: 'peas', quantity: '100', unit: 'g' },
      { name: 'egg', quantity: '2' },
      { name: 'soy sauce', quantity: '2', unit: 'tbsp' },
      { name: 'green onion', quantity: '2' },
    ],
  },

  // === THAI ===
  {
    recipeId: rid('pad-thai'),
    title: 'Pad Thai',
    description: 'Stir-fried rice noodles with shrimp, tofu, and peanuts.',
    cookingTime: 25,
    difficultyLevel: 'medium',
    servings: 2,
    cuisine: 'Thai',
    ingredients: [
      { name: 'rice noodles', quantity: '200', unit: 'g' },
      { name: 'shrimp', quantity: '150', unit: 'g' },
      { name: 'tofu', quantity: '100', unit: 'g' },
      { name: 'tamarind paste', quantity: '2', unit: 'tbsp' },
      { name: 'fish sauce', quantity: '2', unit: 'tbsp' },
      { name: 'peanuts', quantity: '30', unit: 'g' },
    ],
  },
  {
    recipeId: rid('green-curry'),
    title: 'Thai Green Curry',
    description: 'Fragrant coconut curry with chicken and Thai basil.',
    cookingTime: 30,
    difficultyLevel: 'medium',
    servings: 4,
    cuisine: 'Thai',
    ingredients: [
      { name: 'chicken', quantity: '500', unit: 'g' },
      { name: 'green curry paste', quantity: '3', unit: 'tbsp' },
      { name: 'coconut milk', quantity: '400', unit: 'ml' },
      { name: 'thai eggplant', quantity: '2' },
      { name: 'thai basil', quantity: '20', unit: 'g' },
      { name: 'kaffir lime leaves', quantity: '3' },
    ],
  },

  // === FRENCH ===
  {
    recipeId: rid('coq-au-vin'),
    title: 'Coq au Vin',
    description: 'Chicken braised in red wine with mushrooms and onions.',
    cookingTime: 90,
    difficultyLevel: 'hard',
    servings: 6,
    cuisine: 'French',
    ingredients: [
      { name: 'chicken', quantity: '1.5', unit: 'kg' },
      { name: 'red wine', quantity: '750', unit: 'ml' },
      { name: 'bacon', quantity: '200', unit: 'g' },
      { name: 'mushroom', quantity: '300', unit: 'g' },
      { name: 'pearl onion', quantity: '200', unit: 'g' },
      { name: 'thyme', quantity: '3', unit: 'sprigs' },
    ],
  },
  {
    recipeId: rid('ratatouille'),
    title: 'Ratatouille',
    description: 'Provençal vegetable stew with eggplant, zucchini, and tomatoes.',
    cookingTime: 60,
    difficultyLevel: 'medium',
    servings: 4,
    cuisine: 'French',
    dietaryTags: ['vegan'],
    ingredients: [
      { name: 'eggplant', quantity: '1' },
      { name: 'zucchini', quantity: '2' },
      { name: 'bell pepper', quantity: '2' },
      { name: 'tomato', quantity: '4' },
      { name: 'onion', quantity: '1' },
      { name: 'garlic', quantity: '3', unit: 'cloves' },
      { name: 'herbes de provence', quantity: '1', unit: 'tbsp' },
    ],
  },

  // === AMERICAN ===
  {
    recipeId: rid('cheeseburger'),
    title: 'Classic Cheeseburger',
    description: 'Juicy beef patty with cheese, lettuce, tomato, and pickles.',
    cookingTime: 15,
    difficultyLevel: 'easy',
    servings: 4,
    cuisine: 'American',
    ingredients: [
      { name: 'ground beef', quantity: '500', unit: 'g' },
      { name: 'cheddar cheese', quantity: '4', unit: 'slices' },
      { name: 'burger buns', quantity: '4' },
      { name: 'lettuce', quantity: '4', unit: 'leaves' },
      { name: 'tomato', quantity: '1' },
      { name: 'pickle', quantity: '8', unit: 'slices' },
    ],
  },
  {
    recipeId: rid('mac-and-cheese'),
    title: 'Mac and Cheese',
    description: 'Creamy baked pasta with sharp cheddar and breadcrumbs.',
    cookingTime: 45,
    difficultyLevel: 'easy',
    servings: 6,
    cuisine: 'American',
    dietaryTags: ['vegetarian'],
    ingredients: [
      { name: 'macaroni', quantity: '400', unit: 'g' },
      { name: 'cheddar cheese', quantity: '300', unit: 'g' },
      { name: 'milk', quantity: '500', unit: 'ml' },
      { name: 'butter', quantity: '50', unit: 'g' },
      { name: 'flour', quantity: '3', unit: 'tbsp' },
      { name: 'breadcrumbs', quantity: '50', unit: 'g' },
    ],
  },

  // === MEDITERRANEAN ===
  {
    recipeId: rid('hummus'),
    title: 'Hummus with Pita',
    description: 'Smooth chickpea dip with tahini, garlic, and lemon.',
    cookingTime: 10,
    difficultyLevel: 'easy',
    servings: 6,
    cuisine: 'Mediterranean',
    dietaryTags: ['vegan'],
    ingredients: [
      { name: 'chickpeas', quantity: '1', unit: 'can' },
      { name: 'tahini', quantity: '3', unit: 'tbsp' },
      { name: 'lemon juice', quantity: '2', unit: 'tbsp' },
      { name: 'garlic', quantity: '1', unit: 'clove' },
      { name: 'olive oil', quantity: '2', unit: 'tbsp' },
      { name: 'pita bread', quantity: '4' },
    ],
  },
  {
    recipeId: rid('greek-salad'),
    title: 'Greek Salad',
    description: 'Fresh salad with feta, olives, cucumber, and oregano.',
    cookingTime: 10,
    difficultyLevel: 'easy',
    servings: 4,
    cuisine: 'Mediterranean',
    dietaryTags: ['vegetarian'],
    ingredients: [
      { name: 'cucumber', quantity: '1' },
      { name: 'tomato', quantity: '3' },
      { name: 'red onion', quantity: '1/2' },
      { name: 'feta cheese', quantity: '150', unit: 'g' },
      { name: 'kalamata olives', quantity: '20' },
      { name: 'olive oil', quantity: '3', unit: 'tbsp' },
      { name: 'oregano', quantity: '1', unit: 'tsp' },
    ],
  },

  // === KOREAN ===
  {
    recipeId: rid('bibimbap'),
    title: 'Bibimbap',
    description: 'Korean rice bowl with vegetables, beef, and gochujang.',
    cookingTime: 30,
    difficultyLevel: 'medium',
    servings: 2,
    cuisine: 'Korean',
    ingredients: [
      { name: 'rice', quantity: '2', unit: 'cups' },
      { name: 'beef', quantity: '200', unit: 'g' },
      { name: 'spinach', quantity: '100', unit: 'g' },
      { name: 'carrot', quantity: '1' },
      { name: 'egg', quantity: '2' },
      { name: 'gochujang', quantity: '2', unit: 'tbsp' },
    ],
  },
  {
    recipeId: rid('kimchi-fried-rice'),
    title: 'Kimchi Fried Rice',
    description: 'Spicy fried rice with kimchi and pork belly.',
    cookingTime: 15,
    difficultyLevel: 'easy',
    servings: 3,
    cuisine: 'Korean',
    ingredients: [
      { name: 'rice', quantity: '3', unit: 'cups', note: 'day-old' },
      { name: 'kimchi', quantity: '200', unit: 'g' },
      { name: 'pork belly', quantity: '150', unit: 'g' },
      { name: 'sesame oil', quantity: '1', unit: 'tbsp' },
      { name: 'green onion', quantity: '2' },
      { name: 'egg', quantity: '1' },
    ],
  },
];

async function seed(): Promise<void> {
  console.log(`Seeding ${RECIPES.length} recipes into ${TABLE_NAME}...`);

  for (const recipe of RECIPES) {
    const now = new Date().toISOString();
    const pk = `RECIPE#${recipe.recipeId}`;

    // METADATA
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: pk,
        SK: 'METADATA',
        recipeId: recipe.recipeId,
        title: recipe.title,
        description: recipe.description,
        cookingTime: recipe.cookingTime,
        difficultyLevel: recipe.difficultyLevel,
        servings: recipe.servings,
        imageUrl: recipe.imageUrl || '',
        dietaryTags: recipe.dietaryTags || [],
        cuisine: recipe.cuisine,
        instructions: recipe.instructions || [],
        createdAt: now,
        updatedAt: now,
        GSI2PK: `CUISINE#${recipe.cuisine}`,
        GSI2SK: pk,
      },
    }));

    // ING# items
    const ingRequests = recipe.ingredients.map(ing => {
      const name = ing.name.toLowerCase().trim();
      return {
        PutRequest: {
          Item: {
            PK: pk,
            SK: `ING#${name}`,
            ingredient: name,
            quantity: ing.quantity || '1',
            unit: ing.unit || 'piece',
            GSI3PK: `ING#${name}`,
            GSI3SK: pk,
          },
        },
      };
    });

    for (let i = 0; i < ingRequests.length; i += 25) {
      await docClient.send(new BatchWriteCommand({
        RequestItems: { [TABLE_NAME]: ingRequests.slice(i, i + 25) },
      }));
    }
  }

  console.log('Seeding complete!');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});