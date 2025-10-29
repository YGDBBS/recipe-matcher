import { Clock, Users } from 'lucide-react';
import type { Recipe } from '@/lib/api';

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const matchPercentage = recipe.matchPercentage ?? 0;

  return (
    <div className="bg-white rounded-lg shadow border border-[#E5E7EB] overflow-hidden">
      <div className="h-40 bg-gray-100 flex items-center justify-center">
        <span className="text-[#6B7280]">Image</span>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#1F2937] truncate">{recipe.title}</h3>
          <span className="text-xs bg-[#F97316]/10 text-[#F97316] px-2 py-1 rounded">
            {matchPercentage}% match
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-[#6B7280]">
          <span className="inline-flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#F97316]/10 text-[#F97316]">
              {recipe.cuisine || 'Unknown'}
            </span>
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-[#F97316]" />
              {recipe.cookingTime ?? 30} min
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4 text-[#F97316]" />
              {recipe.servings ?? 2} servings
            </span>
          </div>
        </div>
        {matchPercentage > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                matchPercentage >= 80 ? 'bg-gradient-to-r from-[#F97316] to-[#FACC15]' : matchPercentage >= 60 ? 'bg-[#FACC15]' : 'bg-red-500'
              }`}
              style={{ width: `${matchPercentage}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

