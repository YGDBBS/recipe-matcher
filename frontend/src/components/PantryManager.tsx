import { useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { usePantry, useAddPantryItem, useRemovePantryItem } from '@/hooks/usePantry';

export default function PantryManager() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { data: pantryItems = [], isLoading: loadingPantry } = usePantry(token, !!token);
  const addPantryItem = useAddPantryItem();
  const removePantryItem = useRemovePantryItem();
  const [open, setOpen] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientQuantity, setNewIngredientQuantity] = useState(1);
  const [newIngredientUnit, setNewIngredientUnit] = useState('piece');
  const [newIngredientCategory, setNewIngredientCategory] = useState('fridge');

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
        category: newIngredientCategory,
        token,
      },
      {
        onSuccess: () => {
          showToast('Ingredient added to pantry', 'success');
          setNewIngredientName('');
          setNewIngredientQuantity(1);
          setNewIngredientUnit('piece');
          setNewIngredientCategory('fridge');
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
    <div className="relative z-10">
      {/* Hero Section */}
      <section className="max-w-3xl mx-auto text-center pt-20 pb-8 px-4 animate-fade-in">
        <h1 className="text-5xl font-bold text-[#1F2937]">Pantry</h1>
      </section>

      {/* Pantry Filler CTA */}
      <section className="max-w-3xl mx-auto px-4">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-between bg-[#84CC16] hover:bg-[#65A30D] text-white px-8 py-4 rounded-xl text-lg font-medium shadow-lime-glow hover:scale-[1.02] relative"
            style={{width: 200}}
          >
            <span className="flex-1 text-center">Pantry Filler</span>
            <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Accordion */}
        <div
          className={`overflow-hidden transition-all duration-300 ${open ? 'mt-4 max-h-[480px]' : 'max-h-0'}`}
        >
          <div className="max-w-2xl mx-auto bg-white border border-[#E5E7EB] rounded-lg p-6 animate-slide-up">
            <h2 className="text-xl font-bold mb-4 text-[#1F2937]">Add to Pantry</h2>
            <form onSubmit={handleAddPantryIngredient} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#1F2937] mb-1">Ingredient Name</label>
                  <input
                    type="text"
                    value={newIngredientName}
                    onChange={(e) => setNewIngredientName(e.target.value)}
                    placeholder="e.g. Chicken, Tomatoes, Cheese"
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1F2937] mb-1">Quantity</label>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={newIngredientQuantity}
                    onChange={(e) => setNewIngredientQuantity(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1F2937] mb-1">Unit</label>
                  <select
                    value={newIngredientUnit}
                    onChange={(e) => setNewIngredientUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
                  >
                    <option value="piece">piece</option>
                    <optgroup label="Imperial">
                      <option value="cup">cup</option>
                      <option value="tbsp">tbsp</option>
                      <option value="tsp">tsp</option>
                      <option value="oz">oz</option>
                      <option value="lb">lb</option>
                      <option value="fl oz">fl oz</option>
                    </optgroup>
                    <optgroup label="Metric">
                      <option value="g">g (grams)</option>
                      <option value="kg">kg (kilograms)</option>
                      <option value="ml">ml (milliliters)</option>
                      <option value="l">l (liters)</option>
                    </optgroup>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={addPantryItem.isPending}
                className="bg-[#84CC16] hover:bg-[#65A30D] text-white px-6 py-3 rounded-xl font-medium text-sm transform transition-all duration-200 hover:scale-105 hover:shadow-lime-glow active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {addPantryItem.isPending ? 'Adding...' : 'Add to Pantry'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Pantry Items Display */}
      <section className="max-w-6xl mx-auto px-4 mt-12">
        <h2 className="text-3xl font-bold text-[#1F2937] text-center mb-8">My Pantry ({pantryItems.length})</h2>
        {loadingPantry ? (
          <div className="text-center py-12 text-[#6B7280]">Loading pantry...</div>
        ) : pantryItems.length === 0 ? (
          <div className="text-center py-12 text-[#6B7280]">
            Your pantry is empty. Add ingredients above to get started!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pantryItems.map((item) => (
              <div
                key={item.ingredientId}
                className="flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-lg shadow-sm hover:shadow-md transition"
              >
                <div className="flex-1">
                  <div className="font-semibold text-[#1F2937]">{item.name}</div>
                  <div className="text-sm text-[#6B7280] mt-1">
                    {item.quantity} {item.unit}
                  </div>
                </div>
                <button
                  onClick={() => handleRemovePantryIngredient(item.ingredientId)}
                  className="ml-3 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition"
                  title="Remove ingredient"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

