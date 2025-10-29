import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type UserIngredient } from '@/lib/api';

export function usePantry(token: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['pantry', token],
    queryFn: async (): Promise<UserIngredient[]> => {
      if (!token) {
        return [];
      }
      const response = await api.getUserIngredients(token);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.userIngredients || [];
    },
    enabled: enabled && !!token,
  });
}

interface AddPantryItemParams {
  name: string;
  quantity: number;
  unit: string;
}

export function useAddPantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ingredient, token }: { ingredient: AddPantryItemParams; token: string }): Promise<UserIngredient> => {
      const response = await api.addUserIngredient(
        {
          name: ingredient.name.trim(),
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        },
        token
      );

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data?.userIngredient) {
        throw new Error('Failed to add ingredient');
      }

      return response.data.userIngredient;
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch pantry
      queryClient.invalidateQueries({ queryKey: ['pantry', variables.token] });
    },
  });
}

export function useRemovePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ingredientId, token }: { ingredientId: string; token: string }): Promise<void> => {
      const response = await api.removeUserIngredient(ingredientId, token);

      if (response.error) {
        throw new Error(response.error);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch pantry
      queryClient.invalidateQueries({ queryKey: ['pantry', variables.token] });
    },
  });
}

