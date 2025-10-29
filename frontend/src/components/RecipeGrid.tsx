import RecipeCard from '@/components/RecipeCard';
import type { Recipe } from '@/lib/api';

interface RecipeGridProps {
  recipes: Recipe[];
  isLoading: boolean;
  emptyMessage: string;
}

export default function RecipeGrid({ recipes, isLoading, emptyMessage }: RecipeGridProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12 text-[#6B7280]">Loading recipes...</div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12 text-[#6B7280]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.recipeId} recipe={recipe} />
      ))}
    </div>
  );
}

