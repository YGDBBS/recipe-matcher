import { useQuery } from '@tanstack/react-query';
import { api, type Recipe } from '@/lib/api';

interface UseAllRecipesParams {
  ingredient?: string;
  cuisine?: string;
  pantryIngredients?: string[];
  token?: string;
  enabled?: boolean;
}

export function useAllRecipes({ 
  ingredient, 
  cuisine, 
  pantryIngredients = [], 
  token,
  enabled = true,
}: UseAllRecipesParams = {}) {
  return useQuery({
    queryKey: ['recipes', ingredient, cuisine, [...pantryIngredients].sort().join(','), token],
    queryFn: async (): Promise<Recipe[]> => {
      // If pantry ingredients are selected, make multiple calls and intersect
      if (pantryIngredients.length > 0) {
        const ingredientPromises = pantryIngredients.map(ing =>
          api.getRecipes({
            ingredient: ing,
            cuisine: cuisine || undefined,
            token: token || undefined,
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

        // Intersect results: find recipes that appear in ALL ingredient results
        const recipeLists = results.map(r => r.data?.recipes || []);
        
        if (recipeLists.length === 0) {
          return [];
        }

        // Start with first list
        let commonRecipes = recipeLists[0];
        
        // Keep only recipes that exist in all lists
        for (let i = 1; i < recipeLists.length; i++) {
          const currentList = recipeLists[i];
          const recipeIds = new Set(currentList.map(r => r.recipeId));
          commonRecipes = commonRecipes.filter(r => recipeIds.has(r.recipeId));
        }

        return commonRecipes;
      } else {
        // Single ingredient or cuisine search
        if (!ingredient && !cuisine) {
          // No filters provided - return empty
          return [];
        }

        const response = await api.getRecipes({
          ingredient: ingredient || undefined,
          cuisine: cuisine || undefined,
          token: token || undefined,
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
    enabled: enabled && (!!ingredient || !!cuisine || pantryIngredients.length > 0),
  });
}

export function useMyRecipes(token: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['my-recipes', token],
    queryFn: async (): Promise<Recipe[]> => {
      if (!token) {
        return [];
      }
      const response = await api.getMyRecipes(token);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.recipes || [];
    },
    enabled: enabled && !!token,
  });
}

