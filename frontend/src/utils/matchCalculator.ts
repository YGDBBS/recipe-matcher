import type { Recipe } from '@/lib/api';
import type { UserIngredient } from '@/lib/api';

/**
 * Calculate match percentage between user's pantry ingredients and recipe ingredients
 * Based on the backend's calculateIngredientMatch logic
 * 
 * Formula: (availableIngredients.length / recipeIngredients.length) * 100
 * 
 * Matching: Case-insensitive bidirectional substring matching
 * - userIngredient.includes(recipeIngredient) OR
 * - recipeIngredient.includes(userIngredient)
 */
export function calculateMatchPercentage(
  userIngredients: string[] | UserIngredient[],
  recipe: Recipe
): number {
  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    return 0;
  }

  // Convert userIngredients to lowercase names
  const userIngredientNames = userIngredients.map(ing =>
    typeof ing === 'string' ? ing.toLowerCase() : ing.name.toLowerCase()
  );

  // Convert recipe ingredients to lowercase names
  const recipeIngredientNames = recipe.ingredients.map(ing => ing.name.toLowerCase());

  // Count how many recipe ingredients the user has
  const availableIngredients: string[] = [];

  // Check which recipe ingredients the user has (bidirectional substring matching)
  for (const recipeIngredient of recipeIngredientNames) {
    const hasIngredient = userIngredientNames.some(userIngredient =>
      userIngredient.includes(recipeIngredient) || recipeIngredient.includes(userIngredient)
    );

    if (hasIngredient) {
      availableIngredients.push(recipeIngredient);
    }
  }

  // Calculate match percentage: (matched / total) * 100
  const matchPercentage = Math.round((availableIngredients.length / recipeIngredientNames.length) * 100);

  return matchPercentage;
}

/**
 * Enhance recipes with match percentages based on user's pantry
 */
export function enhanceRecipesWithMatch(
  recipes: Recipe[],
  userIngredients: string[] | UserIngredient[]
): Recipe[] {
  if (!userIngredients || userIngredients.length === 0) {
    return recipes;
  }

  return recipes.map(recipe => {
    const matchPercentage = calculateMatchPercentage(userIngredients, recipe);
    return {
      ...recipe,
      matchPercentage,
    };
  });
}

