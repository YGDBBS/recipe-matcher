import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';

// Types
export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
}

export interface Recipe {
  recipeId: string;
  title: string;
  description: string;
  ingredients: {
    name: string;
    quantity: string;
    unit: string;
  }[];
  instructions: string[];
  cookingTime: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  servings: number;
  dietaryTags: string[];
  imageUrl?: string;
  matchPercentage: number;
  missingIngredients: string[];
  availableIngredients: string[];
  userId: string;
  createdAt: string;
  rating?: number;
  reviewCount?: number;
}

export interface User {
  userId: string;
  email: string;
  username: string;
  dietaryRestrictions: string[];
  preferences: {
    cookingTime?: number;
    difficultyLevel?: string;
  };
}

// State interface
interface RecipeState {
  userIngredients: Ingredient[];
  recipes: Recipe[];
  user: User | null;
  loading: boolean;
  error: string | null;
  searchFilters: {
    dietaryRestrictions: string[];
    maxCookingTime: number | null;
    difficultyLevel: string | null;
  };
}

// Action types
type RecipeAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'ADD_INGREDIENT'; payload: Ingredient }
  | { type: 'REMOVE_INGREDIENT'; payload: string }
  | { type: 'SET_INGREDIENTS'; payload: Ingredient[] }
  | { type: 'SET_RECIPES'; payload: Recipe[] }
  | { type: 'SET_FILTERS'; payload: Partial<RecipeState['searchFilters']> }
  | { type: 'CLEAR_RECIPES' };

// Initial state
const initialState: RecipeState = {
  userIngredients: [],
  recipes: [],
  user: null,
  loading: false,
  error: null,
  searchFilters: {
    dietaryRestrictions: [],
    maxCookingTime: null,
    difficultyLevel: null,
  },
};

// Reducer
function recipeReducer(state: RecipeState, action: RecipeAction): RecipeState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'ADD_INGREDIENT':
      return {
        ...state,
        userIngredients: [...state.userIngredients, action.payload],
      };
    case 'REMOVE_INGREDIENT':
      return {
        ...state,
        userIngredients: state.userIngredients.filter(
          (ingredient) => ingredient.name !== action.payload
        ),
      };
    case 'SET_INGREDIENTS':
      return { ...state, userIngredients: action.payload };
    case 'SET_RECIPES':
      return { ...state, recipes: action.payload, loading: false };
    case 'SET_FILTERS':
      return {
        ...state,
        searchFilters: { ...state.searchFilters, ...action.payload },
      };
    case 'CLEAR_RECIPES':
      return { ...state, recipes: [] };
    default:
      return state;
  }
}

// Context
const RecipeContext = createContext<{
  state: RecipeState;
  dispatch: React.Dispatch<RecipeAction>;
} | null>(null);

// Provider component
export function RecipeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(recipeReducer, initialState);

  return (
    <RecipeContext.Provider value={{ state, dispatch }}>
      {children}
    </RecipeContext.Provider>
  );
}

// Custom hook to use the context
export function useRecipe() {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipe must be used within a RecipeProvider');
  }
  return context;
}
