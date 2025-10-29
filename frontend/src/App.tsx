import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import SearchFilters from '@/components/SearchFilters';
import PantryQuickFilter from '@/components/PantryQuickFilter';
import RecipeGrid from '@/components/RecipeGrid';
import CreateRecipeForm from '@/components/CreateRecipeForm';
import PantryManager from '@/components/PantryManager';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useAllRecipes, useMyRecipes } from '@/hooks/useRecipes';
import { usePantry } from '@/hooks/usePantry';
import LoginForm from './components/LoginForm';



type Tab = 'all' | 'mine' | 'create' | 'pantry' | 'login';

function App() {
  const { showToast, ToastContainer } = useToast();
  const { token, login, logout, isAuthenticated, isLoading: authLoading } = useAuth({ showToast });
  const [activeTab, setActiveTab] = useState<Tab>(isAuthenticated ? 'all' : 'login');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

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
  // Only enable query if authenticated and there are filters
  const allRecipesParams = {
    ingredient: hasManualSearch ? search : undefined,
    cuisine: cuisine || undefined,
    pantryIngredients: hasPantrySelection && !hasManualSearch && isAuthenticated ? selectedPantryIngredients : undefined,
    pantryItems: isAuthenticated && pantryItems.length > 0 ? pantryItems : undefined, // Include full pantry items for match calculation
    token: token || undefined,
    enabled: activeTab === 'all' && isAuthenticated && (hasManualSearch || (hasPantrySelection && isAuthenticated) || !!cuisine),
  };
  
  const allRecipesQuery = useAllRecipes(allRecipesParams);
  const myRecipesQuery = useMyRecipes(
    token,
    activeTab === 'mine',
    isAuthenticated && pantryItems.length > 0 ? pantryItems : undefined
  );

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

  // Handle logout with smooth animation
  const handleLogout = useCallback(() => {
    setIsLoggingOut(true);
    
    // Show friendly message
    showToast('See you again soon for more recipe ideas! 👋', 'info');
    
    // Delay actual logout to show animation
    setTimeout(() => {
      logout();
      setActiveTab('login');
      // Clear all search/filter state
      setSearch('');
      setCuisine('');
      setSelectedPantryIngredients([]);
      setIsLoggingOut(false);
      // Pantry query will automatically return empty array when token is null
    }, 2800); // 2.8 seconds delay to show the friendly message
  }, [logout, showToast]);


  // Create recipe
  const handleCreateRecipeSuccess = useCallback(() => {
    setActiveTab('mine');
  }, []);

  // Show welcome animation whenever landing on login page
  useEffect(() => {
    if (!authLoading && !isAuthenticated && activeTab === 'login') {
      // Show welcome animation every time user lands on login page
      setShowWelcome(true);
      // Auto-hide after animation duration
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 2800);
      
      // Cleanup timer if component unmounts or dependencies change
      return () => clearTimeout(timer);
    } else if (isAuthenticated || activeTab !== 'login') {
      // Hide welcome if user becomes authenticated or navigates away
      setShowWelcome(false);
    }
  }, [authLoading, isAuthenticated, activeTab]);

  // Update active tab when auth changes
  useEffect(() => {
    if (!isAuthenticated && activeTab !== 'all' && activeTab !== 'login') {
      setActiveTab('login');
    }
    // When logging out, clear search state
    if (!isAuthenticated) {
      setSearch('');
      setCuisine('');
      setSelectedPantryIngredients([]);
    }
  }, [isAuthenticated, activeTab]);


  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFFBEB] flex items-center justify-center">
        <div className="text-[#6B7280]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBEB] relative">
      {/* Welcome Overlay */}
      {showWelcome && (
        <div className="fixed inset-0 bg-[#FFFBEB]/95 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Floating gradient orbs */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-[#84CC16]/40 to-[#FB923C]/40 rounded-full blur-3xl animate-float-slow" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-[#FB923C]/30 to-[#84CC16]/30 rounded-full blur-3xl animate-float-reverse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-[#84CC16]/20 to-[#FB923C]/20 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '5s' }} />
            
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#84CC16]/30 via-[#FB923C]/20 to-[#84CC16]/30 animate-gradient-drift" />
          </div>
          
          {/* Content */}
          <div className="relative text-center space-y-4 animate-slide-up z-10">
            <div className="text-6xl mb-4 animate-bounce">👨‍🍳</div>
            <h2 className="text-2xl font-bold text-[#1F2937]">Welcome to Recipe Matcher!</h2>
            <p className="text-[#6B7280] text-lg">Discover delicious recipes, add ingredients to your panty and let us do the rest!</p>
          </div>
        </div>
      )}

      {/* Logout Overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-[#FFFBEB]/95 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Floating gradient orbs */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-[#84CC16]/40 to-[#FB923C]/40 rounded-full blur-3xl animate-float-slow" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-[#FB923C]/30 to-[#84CC16]/30 rounded-full blur-3xl animate-float-reverse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-[#84CC16]/20 to-[#FB923C]/20 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '5s' }} />
            
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#84CC16]/30 via-[#FB923C]/20 to-[#84CC16]/30 animate-gradient-drift" />
          </div>
          
          {/* Content */}
          <div className="relative text-center space-y-4 animate-slide-up z-10">
            <div className="text-6xl mb-4 animate-bounce">👋</div>
            <h2 className="text-2xl font-bold text-[#1F2937]">See you soon!</h2>
            <p className="text-[#6B7280] text-lg">Thanks for cooking with us today</p>
          </div>
        </div>
      )}

      <div className={(isLoggingOut || showWelcome) ? 'opacity-0 transition-opacity duration-500' : 'opacity-100 transition-opacity duration-500'}>
        <Header onLogout={handleLogout} isAuthenticated={isAuthenticated} onNavigate={setActiveTab} />

      {/* Main Content */}
      <main className="relative min-h-screen overflow-hidden">
        {/* Animated Background Elements - Applied to all pages */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {/* Floating gradient orbs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-[#84CC16]/40 to-[#FB923C]/40 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-[#FB923C]/30 to-[#84CC16]/30 rounded-full blur-3xl animate-float-reverse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-[#84CC16]/20 to-[#FB923C]/20 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '5s' }} />
          
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#84CC16]/30 via-[#FB923C]/20 to-[#84CC16]/30 animate-gradient-drift" />
        </div>

        {/* Content wrapper with relative positioning */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

            {/* Only show RecipeGrid when authenticated or when filters are applied */}
            {(isAuthenticated || search || cuisine || selectedPantryIngredients.length > 0) && (
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
            )}

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
          <div className="relative min-h-[60vh] flex items-center justify-center">
            {/* Login Form */}
            <div className="relative z-10 w-full">
              <LoginForm onSuccess={handleLoginSuccess} />
            </div>
          </div>
        )}
        </div>
      </main>

        {/* Toast Container */}
        <ToastContainer />
      </div>
    </div>
  );
}

export default App;
