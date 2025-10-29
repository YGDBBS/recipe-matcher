import { Clock, Users } from 'lucide-react';
import type { Recipe } from '@/lib/api';

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const matchPercentage = recipe.matchPercentage ?? 0;

  return (
    <div className="transform transition-all duration-300 ease-out hover:scale-105 hover:-translate-y-1 hover:shadow-lime-glow cursor-pointer rounded-xl overflow-hidden bg-white border border-gray-200">
      <div className="h-40 bg-gray-100 flex items-center justify-center">
        <span className="text-[#6B7280]">Image</span>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#1F2937] truncate">{recipe.title}</h3>
          <span className="text-xs bg-[#84CC16]/10 text-[#84CC16] px-2 py-1 rounded">
            {matchPercentage}% match
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-[#6B7280]">
          <span className="inline-flex items-center gap-2">
            <span className="bg-[#84CC16]/10 text-[#84CC16] text-xs font-medium px-2 py-1 rounded-full">
              {recipe.cuisine || 'Unknown'}
            </span>
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-[#84CC16] hover:text-[#FB923C] transition-colors" />
              {recipe.cookingTime ?? 30} min
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4 text-[#84CC16] hover:text-[#FB923C] transition-colors" />
              {recipe.servings ?? 2} servings
            </span>
          </div>
        </div>
        {matchPercentage > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full bg-[length:200%_100%] animate-gradient ${
                matchPercentage >= 80 ? 'bg-gradient-to-r from-[#84CC16] to-[#FB923C]' : matchPercentage >= 60 ? 'bg-[#FB923C]' : 'bg-red-500'
              }`}
              style={{ width: `${matchPercentage}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

