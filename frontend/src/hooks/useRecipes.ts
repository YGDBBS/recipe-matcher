import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Recipe } from '@/lib/api';

interface UseAllRecipesParams {
  ingredient?: string;
  cuisine?: string;
  pantryIngredients?: string[];
  token?: string;
  enabled: boolean;
}

export function useAllRecipes(params: UseAllRecipesParams) {
  return useQuery<Recipe[]>({
    queryKey: ['recipes', { ingredient: params.ingredient, cuisine: params.cuisine, pantryIngredients: params.pantryIngredients }],
    queryFn: async (): Promise<Recipe[]> => {
      if (params.pantryIngredients && params.pantryIngredients.length > 0) {
        // Make multiple calls for each pantry ingredient
        const ingredientPromises = params.pantryIngredients.map(ing =>
          api.getRecipes({
            ingredient: ing,
            cuisine: params.cuisine,
            token: params.token,
          })
        );

        const results = await Promise.all(ingredientPromises);

        // Check for errors
        const errorResult = results.find(r => r.error);
        if (errorResult?.error) {
          // Don't throw for 400 if it's just "no filters provided"
          if (errorResult.error.includes('Please provide')) {
            return [];
          }
          throw new Error(errorResult.error);
        }

        // Extract recipe lists
        const recipeLists = results.map(r => r.data?.recipes || []);

        if (recipeLists.length === 0) {
          return [];
        }

        // Intersect results: find recipes that appear in ALL ingredient results
        // Start with first list
        let commonRecipes = recipeLists[0];

        // Keep only recipes that exist in all lists (by recipeId)
        for (let i = 1; i < recipeLists.length; i++) {
          const currentList = recipeLists[i];
          const recipeIds = new Set(currentList.map(r => r.recipeId));
          commonRecipes = commonRecipes.filter(r => recipeIds.has(r.recipeId));
        }

        return commonRecipes;
      } else {
        // Single ingredient or cuisine search
        const response = await api.getRecipes({
          ingredient: params.ingredient,
          cuisine: params.cuisine,
          token: params.token,
        });

        if (response.error) {
          // Don't throw for 400 if it's just "no filters provided"
          if (response.error.includes('Please provide')) {
            return [];
          }
          throw new Error(response.error);
        }

        return response.data?.recipes || [];
      }
    },
    enabled: params.enabled,
  });
}

export function useMyRecipes(token: string | null, enabled: boolean = true) {
  return useQuery<Recipe[]>({
    queryKey: ['my-recipes'],
    queryFn: async (): Promise<Recipe[]> => {
      if (!token) throw new Error('Token required');
      const r = await api.getMyRecipes(token);
      return r.data?.recipes ?? [];
    },
    enabled: enabled && !!token,
  });
}
