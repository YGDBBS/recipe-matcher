import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Tabs from '@/components/Tabs';
import type { Tab } from '@/components/Tabs';
import SearchFilters from '@/components/SearchFilters';
import PantryQuickFilter from '@/components/PantryQuickFilter';
import RecipeGrid from '@/components/RecipeGrid';
import CreateRecipeForm from '@/components/CreateRecipeForm';
import PantryManager from '@/components/PantryManager';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useAllRecipes, useMyRecipes } from '@/hooks/useRecipes';
import { usePantry } from '@/hooks/usePantry';


function LoginForm({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = isRegister
        ? await api.registerUser({ email, password, username })
        : await api.loginUser({ email, password });

      if (response.error || !response.data?.token) {
        setError(response.error || 'Authentication failed');
        return;
      }

      onSuccess(response.data.token);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">{isRegister ? 'Register' : 'Login'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : isRegister ? 'Register' : 'Login'}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
          }}
          className="w-full text-sm text-gray-600 hover:text-gray-800"
        >
          {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
        </button>
      </form>
    </div>
  );
}


function App() {
  const { showToast, ToastContainer } = useToast();
  const { token, login, logout, isAuthenticated, isLoading: authLoading } = useAuth({ showToast });
  const [activeTab, setActiveTab] = useState<Tab>(isAuthenticated ? 'all' : 'login');

  // Recipe list state
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState('');

  // Pantry state
  const [selectedPantryIngredients, setSelectedPantryIngredients] = useState<string[]>([]);

  // Pantry hooks (for PantryQuickFilter)
  const pantryQuery = usePantry(token, isAuthenticated);
  const pantryItems = pantryQuery.data || [];

  const handleApiError = useCallback(
    (error: string | undefined) => {
      if (error?.toLowerCase().includes('not authenticated') || error?.toLowerCase().includes('unauthorized')) {
        logout();
        showToast('Session expired', 'error');
        setActiveTab('all');
      } else {
        showToast(error || 'An error occurred', 'error');
      }
    },
    [logout, showToast]
  );

  // Determine which recipe hook to use based on active tab
  const hasManualSearch = search && !selectedPantryIngredients.length;
  const hasPantrySelection = selectedPantryIngredients.length > 0;
  
  // For "all" tab: use pantry ingredients if selected, otherwise use manual search
  const allRecipesParams = {
    ingredient: hasManualSearch ? search : undefined,
    cuisine: cuisine || undefined,
    pantryIngredients: hasPantrySelection && !hasManualSearch ? selectedPantryIngredients : undefined,
    token: token || undefined,
    enabled: activeTab === 'all' && (hasManualSearch || hasPantrySelection || !!cuisine),
  };
  
  const allRecipesQuery = useAllRecipes(allRecipesParams);
  const myRecipesQuery = useMyRecipes(token, activeTab === 'mine');

  // Determine which query result to use
  const recipesQuery = activeTab === 'mine' ? myRecipesQuery : allRecipesQuery;
  const recipes = recipesQuery.data || [];
  const loading = recipesQuery.isLoading;

  // Handle errors from React Query
  useEffect(() => {
    if (recipesQuery.error) {
      const errorMessage = recipesQuery.error instanceof Error ? recipesQuery.error.message : String(recipesQuery.error);
      // Don't show error for "Please provide" messages (these are handled gracefully by returning empty array)
      if (!errorMessage.includes('Please provide')) {
        handleApiError(errorMessage);
      }
    }
  }, [recipesQuery.error, handleApiError]);

  // Handle login success
  const handleLoginSuccess = useCallback(
    (newToken: string) => {
      login(newToken);
      setActiveTab('mine');
      showToast('Login successful!', 'success');
      // Pantry will auto-fetch via usePantry hook
    },
    [login, showToast]
  );

  // Handle logout
  const handleLogout = useCallback(() => {
    logout();
    setActiveTab('all');
    // Pantry query will automatically return empty array when token is null
  }, [logout]);


  // Create recipe
  const handleCreateRecipeSuccess = useCallback(() => {
    setActiveTab('mine');
  }, []);

  // Update active tab when auth changes
  useEffect(() => {
    if (!isAuthenticated && activeTab !== 'all' && activeTab !== 'login') {
      setActiveTab('login');
    }
  }, [isAuthenticated, activeTab]);


  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onLogout={handleLogout} isAuthenticated={isAuthenticated} />

      <Tabs active={activeTab} onChange={setActiveTab} isAuthenticated={isAuthenticated} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* All Recipes / My Recipes */}
        {(activeTab === 'all' || activeTab === 'mine') && (
          <div>
            {/* Filters */}
            {isAuthenticated && (
              <SearchFilters
                search={search}
                setSearch={(value) => {
                  setSearch(value);
                  // Clear pantry selection when using manual search
                  if (value) {
                    setSelectedPantryIngredients([]);
                  }
                }}
                cuisine={cuisine}
                setCuisine={setCuisine}
                onReset={() => {
                  setSearch('');
                  setCuisine('');
                  setSelectedPantryIngredients([]);
                }}
              />
            )}

            {/* Pantry Ingredients - Quick Filters */}
            {activeTab === 'all' && isAuthenticated && (
              <PantryQuickFilter
                pantryItems={pantryItems}
                selected={selectedPantryIngredients}
                onToggle={(normalizedName: string) => {
                  if (selectedPantryIngredients.includes(normalizedName)) {
                    // Remove from selection
                    setSelectedPantryIngredients(prev => 
                      prev.filter(name => name !== normalizedName)
                    );
                  } else {
                    // Add to selection
                    setSelectedPantryIngredients(prev => [...prev, normalizedName]);
                  }
                  // Clear manual search when using pantry selection
                  setSearch('');
                }}
                onClear={() => {
                  setSelectedPantryIngredients([]);
                  setSearch('');
                }}
              />
            )}

            <RecipeGrid
              recipes={recipes}
              isLoading={loading}
              emptyMessage={
                activeTab === 'mine' ? (
                  'You have no recipes yet. Create one!'
                ) : activeTab === 'all' && !search && !selectedPantryIngredients.length && !cuisine ? (
                  'Enter an ingredient, select pantry ingredients, or choose a cuisine to search for recipes.'
                ) : (
                  'No recipes found. Try different filters.'
                )
              }
            />

            {!isAuthenticated && activeTab === 'all' && (
              <div className="mt-8">
                <LoginForm onSuccess={handleLoginSuccess} />
              </div>
            )}
          </div>
        )}

        {/* Create Recipe */}
        {activeTab === 'create' && isAuthenticated && (
          <CreateRecipeForm onSuccess={handleCreateRecipeSuccess} />
        )}

        {/* Pantry */}
        {activeTab === 'pantry' && isAuthenticated && (
          <PantryManager />
        )}

        {/* Login */}
        {activeTab === 'login' && !isAuthenticated && (
          <LoginForm onSuccess={handleLoginSuccess} />
        )}
      </main>

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}

export default App;
