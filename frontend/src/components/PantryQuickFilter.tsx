import type { UserIngredient } from '@/lib/api';

interface PantryQuickFilterProps {
  pantryItems: UserIngredient[];
  selected: string[];
  onToggle: (name: string) => void;
  onClear: () => void;
}

export default function PantryQuickFilter({ pantryItems, selected, onToggle, onClear }: PantryQuickFilterProps) {
  if (pantryItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#FFF7ED] border border-[#F97316]/20 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#F97316]">Your Pantry:</span>
          <span className="text-xs text-[#F97316]">
            {selected.length > 0 
              ? `${selected.length} selected - Finding recipes with all selected ingredients`
              : 'Click ingredients to find recipes, you can select multiple ingredients to find recipes with all of them'}
          </span>
        </div>
        {selected.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-[#F97316] hover:text-[#EA580C] underline"
          >
            Clear Selection
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {pantryItems.map((item) => {
          const normalizedName = item.name.toLowerCase();
          const isSelected = selected.includes(normalizedName);
          return (
            <button
              key={item.ingredientId}
              onClick={() => onToggle(normalizedName)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                isSelected
                  ? 'bg-[#F97316] text-white shadow-sm'
                  : 'bg-white text-[#F97316] border border-[#E5E7EB] hover:bg-[#FFF7ED]'
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
              {item.quantity > 0 && (
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

