 
 
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { usePantry, useAddPantryItem, useRemovePantryItem } from '@/hooks/usePantry';
import SectionCardSmall from '@/components/SectionCardSmall';

export default function PantryManager() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { data: pantryItems = [], isLoading: loadingPantry } = usePantry(token, !!token);
  const addPantryItem = useAddPantryItem();
  const removePantryItem = useRemovePantryItem();
  
  // Per-category add state is managed inside SectionCardSmall
  const categories = [
    { key: 'fridge', label: 'Fridge' },
    { key: 'freezer', label: 'Freezer' },
    { key: 'dry', label: 'Dry Food' },
    { key: 'fruit', label: 'Fruit' },
    { key: 'vegetables', label: 'Vegetables' },
    { key: 'spices', label: 'Spices' },
    { key: 'other', label: 'Other' },
  ] as const;

  // Category selection handled via each SectionCardSmall

  // add handled per-category via SectionCardSmall

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

      {/* Removed top Add form per refactor */}

      {/* Pantry Items Display */}
      <section className="max-w-6xl mx-auto px-4 mt-12">
        <h2 className="text-3xl font-bold text-[#1F2937] text-center mb-8">My Pantry ({pantryItems.length})</h2>
        {loadingPantry ? (
          <div className="text-center py-12 text-[#6B7280]">Loading pantry...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => {
              const items = pantryItems.filter(i => (i.category || 'other') === cat.key);
              return (
                <div key={cat.key}>
                  <SectionCardSmall
                    title={`${cat.label} (${items.length})`}
                    category={cat.key}
                    items={items.map(i => ({ id: i.ingredientId, name: i.name, quantity: `${i.quantity} ${i.unit}` }))}
                    onRemove={handleRemovePantryIngredient}
                    onAdd={(name, quantity, category) => {
                      if (!token) return;
                      addPantryItem.mutate(
                        { name, quantity, category, token },
                        {
                          onSuccess: () => showToast('Ingredient added to pantry', 'success'),
                          onError: (error: Error) => showToast(error.message || 'Failed to add ingredient', 'error'),
                        }
                      );
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

