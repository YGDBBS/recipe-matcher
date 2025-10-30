import type { UserIngredient } from '@/lib/api';

interface PantryQuickFilterProps {
  pantryItems: UserIngredient[];
  selected: string[];
  onToggle: (name: string) => void;
}

export default function PantryQuickFilter({ pantryItems, selected, onToggle }: PantryQuickFilterProps) {
  if (pantryItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#FFF7ED] border border-[#84CC16]/20 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#84CC16]">Your Pantry:</span>
          <span className="text-xs text-[#84CC16]">
            {selected.length > 0 
              ? `${selected.length} selected - Finding recipes with all selected ingredients`
              : 'Click ingredients to find recipes, you can select multiple ingredients to find recipes with all of them'}
          </span>
        </div>
        {/* Clear Selection removed per request */}
      </div>
      <div className="flex flex-wrap gap-2">
        {pantryItems.map((item) => {
          const normalizedName = item.name.toLowerCase();
          const isSelected = selected.includes(normalizedName);
          return (
            <button
              key={item.ingredientId}
              onClick={() => {
                // Add slight delay to trigger pulse animation
                setTimeout(() => {
                  onToggle(normalizedName);
                }, 50);
              }}
              className={`rounded-full text-sm flex items-center gap-1 ${
                isSelected
                  ? 'bg-[#84CC16] text-white px-3 py-1 shadow-md animate-pulseOnce ring-2 ring-[#84CC16] ring-offset-2 font-medium'
                  : 'bg-white border border-gray-300 text-[#84CC16] px-3 py-1 hover:border-[#84CC16] hover:bg-[#84CC16]/10 hover:scale-105 transition-all duration-200'
              }`}
              title={
                isSelected 
                  ? `Remove ${item.name} from search` 
                  : `Add ${item.name} to search (recipes must contain all selected)`
              }
            >
              {isSelected && (
                <span className="text-xs">✓</span>
              )}
              {item.name}
              {item.quantity > 0 && item.unit?.toLowerCase() !== 'piece' && (
                <span className={`ml-1 text-xs ${isSelected ? 'opacity-90' : 'opacity-75'}`}>
                  ({item.quantity} {item.unit})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

