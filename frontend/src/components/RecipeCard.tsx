import { Clock, Users } from 'lucide-react';
import type { Recipe } from '@/lib/api';

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const matchPercentage = recipe.matchPercentage ?? 0;

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      <div className="h-40 bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">Image</span>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 truncate">{recipe.title}</h3>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
            {matchPercentage}% match
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="inline-flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
              {recipe.cuisine || 'Unknown'}
            </span>
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {recipe.cookingTime ?? 30} min
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {recipe.servings ?? 2} servings
            </span>
          </div>
        </div>
        {matchPercentage > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                matchPercentage >= 80 ? 'bg-emerald-500' : matchPercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${matchPercentage}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

