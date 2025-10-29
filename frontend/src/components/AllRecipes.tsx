import {  useEffect, useState } from 'react';
import SearchFilters from '@/components/SearchFilters';
import PantryQuickFilter from '@/components/PantryQuickFilter';
import RecipeGrid from '@/components/RecipeGrid';
import LoginForm from '@/components/LoginForm';
import { useAllRecipes } from '@/hooks/useRecipes';
import { usePantry } from '@/hooks/usePantry';

interface AllRecipesProps {
  isAuthenticated: boolean;
  token: string | null;
  onLoginSuccess: (token: string) => void;
  onApiError: (message: string | undefined) => void;
}

export default function AllRecipes({ isAuthenticated, token, onLoginSuccess, onApiError }: AllRecipesProps) {
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [selectedPantryIngredients, setSelectedPantryIngredients] = useState<string[]>([]);

  const pantryQuery = usePantry(token, isAuthenticated);
  const pantryItems = pantryQuery.data || [];

  const hasManualSearch = search && !selectedPantryIngredients.length;
  const hasPantrySelection = selectedPantryIngredients.length > 0;

  const allRecipesParams = {
    ingredient: hasManualSearch ? search : undefined,
    cuisine: cuisine || undefined,
    pantryIngredients: hasPantrySelection && !hasManualSearch && isAuthenticated ? selectedPantryIngredients : undefined,
    pantryItems: isAuthenticated && pantryItems.length > 0 ? pantryItems : undefined,
    token: token || undefined,
    enabled: isAuthenticated && (hasManualSearch || (hasPantrySelection && isAuthenticated) || !!cuisine),
  };

  const allRecipesQuery = useAllRecipes(allRecipesParams);
  const recipes = allRecipesQuery.data || [];
  const loading = allRecipesQuery.isLoading;

  useEffect(() => {
    if (allRecipesQuery.error) {
      const message = allRecipesQuery.error instanceof Error ? allRecipesQuery.error.message : String(allRecipesQuery.error);
      if (!message.includes('Please provide')) {
        onApiError(message);
      }
    }
  }, [allRecipesQuery.error, onApiError]);

  if (!isAuthenticated) {
    return (
      <div className="mt-8">
        <LoginForm onSuccess={onLoginSuccess} />
      </div>
    );
  }

  return (
    <div>
      <SearchFilters
        search={search}
        setSearch={(value) => {
          setSearch(value);
          if (value) setSelectedPantryIngredients([]);
        }}
        cuisine={cuisine}
        setCuisine={setCuisine}
        onReset={() => {
          setSearch('');
          setCuisine('');
          setSelectedPantryIngredients([]);
        }}
      />

      <PantryQuickFilter
        pantryItems={pantryItems}
        selected={selectedPantryIngredients}
        onToggle={(normalizedName: string) => {
          if (selectedPantryIngredients.includes(normalizedName)) {
            setSelectedPantryIngredients(prev => prev.filter(name => name !== normalizedName));
          } else {
            setSelectedPantryIngredients(prev => [...prev, normalizedName]);
          }
          setSearch('');
        }}
        onClear={() => {
          setSelectedPantryIngredients([]);
          setSearch('');
        }}
      />

      <RecipeGrid
        recipes={recipes}
        isLoading={loading}
        emptyMessage={
          !search && !selectedPantryIngredients.length && !cuisine
            ? 'Enter an ingredient, select pantry ingredients, or choose a cuisine to search for recipes.'
            : 'No recipes found. Try different filters.'
        }
      />
    </div>
  );
}


