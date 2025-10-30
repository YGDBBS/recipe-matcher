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
    mutationFn: ({ name, quantity, unit, category, token }: { name: string; quantity?: number; unit?: string; category?: string; token: string }) =>
      api.addUserIngredient(
        { name, quantity: quantity ?? 1, unit: unit ?? 'piece', category: category ?? 'other' },
        token
      ),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['pantry'] });
      const previous = queryClient.getQueryData<UserIngredient[]>(['pantry']);

      const tempId = `temp-${Date.now()}`;
      const optimisticItem: UserIngredient = {
        userId: 'self',
        ingredientId: tempId,
        name: variables.name.toLowerCase(),
        quantity: variables.quantity ?? 1,
        unit: variables.unit ?? 'piece',
        category: (variables.category || 'other').toLowerCase(),
        addedAt: new Date().toISOString(),
      } as UserIngredient;

      queryClient.setQueryData<UserIngredient[]>(['pantry'], (old) => {
        const current = Array.isArray(old) ? old : [];
        return [...current, optimisticItem];
      });

      return { previous, tempId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['pantry'], ctx.previous);
      }
    },
    onSuccess: () => {
      // Backend now returns category; trust server and refetch
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
    },
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