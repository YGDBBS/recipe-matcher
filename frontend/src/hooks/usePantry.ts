import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UserIngredient } from '@/lib/api';

export function usePantry(token: string | null, enabled: boolean = true) {
  return useQuery<UserIngredient[]>({
    queryKey: ['pantry'],
    queryFn: async () => {
      if (!token) throw new Error('Token required');
      const r = await api.getUserIngredients(token);
      return r.data?.userIngredients ?? [];
    },
    enabled: enabled && !!token,
    staleTime: 1000 * 60,
    select: (data) => data ?? [],
  });
}

export function useAddPantryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, quantity, unit, token }: { name: string; quantity?: number; unit?: string; token: string }) =>
      api.addUserIngredient(
        { name, quantity: quantity ?? 1, unit: unit ?? 'piece' },
        token
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pantry'] }),
  });
}

export function useRemovePantryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ingredientId, token }: { ingredientId: string; token: string }) =>
      api.removeUserIngredient(ingredientId, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pantry'] }),
  });
}