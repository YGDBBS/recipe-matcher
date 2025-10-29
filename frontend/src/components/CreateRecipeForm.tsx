import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { cuisines } from '@/components/SearchFilters';

interface CreateRecipeFormProps {
  onSuccess: () => void;
}

export default function CreateRecipeForm({ onSuccess }: CreateRecipeFormProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [cookingTime, setCookingTime] = useState(30);
  const [servings, setServings] = useState(2);
  const [ingredients, setIngredients] = useState<Array<{ name: string; quantity: string; unit: string }>>([
    { name: '', quantity: '', unit: '' },
  ]);

  const createRecipeMutation = useMutation({
    mutationFn: async (recipeData: Parameters<typeof api.createRecipe>[0]) => {
      if (!token) {
        throw new Error('Not authenticated');
      }
      const response = await api.createRecipe(recipeData, token);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.recipe;
    },
    onSuccess: () => {
      // Invalidate my-recipes query
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
      
      // Show success toast
      showToast('Recipe created successfully!', 'success');
      
      // Reset form
      setTitle('');
      setCuisine('');
      setCookingTime(30);
      setServings(2);
      setIngredients([{ name: '', quantity: '', unit: '' }]);
      
      // Call onSuccess callback
      onSuccess();
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to create recipe', 'error');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      showToast('Please log in to create a recipe', 'error');
      return;
    }

    const recipeData = {
      title: title.trim(),
      cuisine: cuisine.trim(),
      ingredients: ingredients
        .filter((ing) => ing.name.trim())
        .map((ing) => ({
          name: ing.name.trim(),
          quantity: ing.quantity.trim(),
          unit: ing.unit.trim() || 'unit',
        })),
      instructions: [],
      cookingTime,
      difficultyLevel: 'medium' as const,
      servings,
      dietaryTags: [],
    };

    createRecipeMutation.mutate(recipeData);
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">Create Recipe</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1">Cuisine</label>
            <select
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
              required
            >
              <option value="">Select cuisine</option>
              {cuisines.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1">Cooking Time (min)</label>
            <input
              type="number"
              min={1}
              value={cookingTime}
              onChange={(e) => setCookingTime(parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1">Servings</label>
            <input
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value) || 2)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-2">Ingredients</label>
          <div className="space-y-2">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <input
                  placeholder="Name"
                  value={ing.name}
                  onChange={(e) => {
                    const newIngredients = [...ingredients];
                    newIngredients[idx].name = e.target.value;
                    setIngredients(newIngredients);
                  }}
                  className="col-span-5 px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
                />
                <input
                  placeholder="Qty"
                  value={ing.quantity}
                  onChange={(e) => {
                    const newIngredients = [...ingredients];
                    newIngredients[idx].quantity = e.target.value;
                    setIngredients(newIngredients);
                  }}
                  className="col-span-3 px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
                />
                <select
                  value={ing.unit}
                  onChange={(e) => {
                    const newIngredients = [...ingredients];
                    newIngredients[idx].unit = e.target.value;
                    setIngredients(newIngredients);
                  }}
                  className="col-span-3 px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
                >
                  <option value="">Unit</option>
                  <option value="piece">piece</option>
                  <option value="cup">cup</option>
                  <option value="tbsp">tbsp</option>
                  <option value="tsp">tsp</option>
                  <option value="oz">oz</option>
                  <option value="lb">lb</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                </select>
                <button
                  type="button"
                  onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                  className="col-span-1 text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setIngredients([...ingredients, { name: '', quantity: '', unit: '' }])}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E5E7EB] text-[#6B7280] rounded hover:bg-[#FFF7ED]"
            >
              <Plus className="w-4 h-4 text-[#84CC16]" />
              Add Ingredient
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={createRecipeMutation.isPending}
          className="bg-[#84CC16] hover:bg-[#65A30D] text-white px-6 py-3 rounded-xl font-medium text-sm transform transition-all duration-200 hover:scale-105 hover:shadow-lime-glow active:scale-95 disabled:opacity-50"
        >
          {createRecipeMutation.isPending ? 'Creating...' : 'Create Recipe'}
        </button>
      </form>
    </div>
  );
}

