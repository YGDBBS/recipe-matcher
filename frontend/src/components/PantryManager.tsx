import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { usePantry, useAddPantryItem, useRemovePantryItem } from '@/hooks/usePantry';

export default function PantryManager() {
  const { token } = useAuth();
  const { showToast } = useToast();
  
  const { data: pantryItems = [], isLoading: loadingPantry } = usePantry(token, !!token);
  const addPantryItem = useAddPantryItem();
  const removePantryItem = useRemovePantryItem();

  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientQuantity, setNewIngredientQuantity] = useState(1);
  const [newIngredientUnit, setNewIngredientUnit] = useState('piece');

  const handleAddPantryIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !newIngredientName.trim()) {
      showToast('Please enter an ingredient name', 'error');
      return;
    }

    addPantryItem.mutate(
      {
        name: newIngredientName.trim(),
        quantity: newIngredientQuantity,
        unit: newIngredientUnit,
        token,
      },
      {
        onSuccess: () => {
          showToast('Ingredient added to pantry', 'success');
          setNewIngredientName('');
          setNewIngredientQuantity(1);
          setNewIngredientUnit('piece');
        },
        onError: (error: Error) => {
          showToast(error.message || 'Failed to add ingredient', 'error');
        },
      }
    );
  };

  const handleRemovePantryIngredient = async (ingredientId: string) => {
    if (!token) return;

    removePantryItem.mutate(
      {
        ingredientId,
        token,
      },
      {
        onSuccess: () => {
          showToast('Ingredient removed from pantry', 'success');
        },
        onError: (error: Error) => {
          showToast(error.message || 'Failed to remove ingredient', 'error');
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Add Ingredient Form */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Add to Pantry</h2>
        <form onSubmit={handleAddPantryIngredient} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ingredient Name</label>
              <input
                type="text"
                value={newIngredientName}
                onChange={(e) => setNewIngredientName(e.target.value)}
                placeholder="e.g. Chicken, Tomatoes, Cheese"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={newIngredientQuantity}
                onChange={(e) => setNewIngredientQuantity(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={newIngredientUnit}
                onChange={(e) => setNewIngredientUnit(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
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
            </div>
          </div>
          <button
            type="submit"
            disabled={addPantryItem.isPending}
            className="px-6 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {addPantryItem.isPending ? 'Adding...' : 'Add to Pantry'}
          </button>
        </form>
      </div>

      {/* Pantry Items */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">My Pantry ({pantryItems.length})</h2>
        {loadingPantry ? (
          <div className="text-center py-12 text-gray-600">Loading pantry...</div>
        ) : pantryItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Your pantry is empty. Add ingredients to get started!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pantryItems.map((item) => (
              <div
                key={item.ingredientId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded border hover:bg-gray-100"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-600">
                    {item.quantity} {item.unit}
                  </div>
                </div>
                <button
                  onClick={() => handleRemovePantryIngredient(item.ingredientId)}
                  className="ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                  title="Remove ingredient"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

