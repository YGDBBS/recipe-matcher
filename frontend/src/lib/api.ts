
import { config } from './config';

const API_BASE_URL = config.apiBaseUrl;
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface Recipe {
  recipeId: string;
  title: string;
  description?: string;
  ingredients?: {
    name: string;
    quantity: string;
    unit: string;
  }[];
  instructions?: string[];
  cookingTime: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  servings: number;
  dietaryTags?: string[];
  cuisine?: string;
  imageUrl?: string;
  matchPercentage?: number;
  missingIngredients?: string[];
  availableIngredients?: string[];
  matchedIngredients?: string[];
  totalIngredients?: number;
  author?: string;
  userId?: string;
  createdAt?: string;
  rating?: number;
  reviewCount?: number;
}

export interface Ingredient {
  ingredientId: string;
  name: string;
  category: string;
  commonUnits: string[];
}

export interface UserIngredient {
  userId: string;
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  expiryDate?: string;
  addedAt: string;
}

export interface MatchRequest {
  userIngredients?: string[];
  dietaryRestrictions?: string[];
  maxCookingTime?: number;
  difficultyLevel?: string;
  limit?: number;
}

export interface MatchResponse {
  matches: Recipe[];
  totalMatches: number;
  userIngredients: string[];
  searchCriteria: {
    dietaryRestrictions: string[];
    maxCookingTime?: number;
    difficultyLevel?: string;
    minMatchPercentage: number;
  };
}

// Helper function to make API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: undefined,
        error: data.error || data.message || `HTTP ${response.status}`,
      };
    }

    return { data };
  } catch (error) {
    return {
      data: undefined,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// API functions
export const api = {
  // Recipes
  async getRecipes(params?: {
    ingredient?: string;
    userId?: string;
    cuisine?: string;
    limit?: number;
    token?: string;
  }): Promise<ApiResponse<{ recipes: Recipe[] }>> {
    const queryParams = new URLSearchParams();
    if (params?.ingredient) queryParams.append('ingredient', params.ingredient);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.cuisine) queryParams.append('cuisine', params.cuisine);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const headers: Record<string, string> = {};
    if (params?.token) {
      headers.Authorization = `Bearer ${params.token}`;
    }
    return apiCall(`/recipes${queryString ? `?${queryString}` : ''}`, {
      headers,
    });
  },

  async getMyRecipes(token: string): Promise<ApiResponse<{ recipes: Recipe[] }>> {
    return apiCall('/recipes/mine', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  async getRecipe(id: string): Promise<ApiResponse<{ recipe: Recipe }>> {
    return apiCall(`/recipes/${id}`);
  },

  async createRecipe(recipe: Omit<Recipe, 'recipeId' | 'createdAt' | 'updatedAt'>, token: string): Promise<ApiResponse<{ recipe: Recipe }>> {
    return apiCall('/recipes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(recipe),
    });
  },

  // Ingredients
  async getIngredients(params?: {
    category?: string;
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<{ ingredients: Ingredient[] }>> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    return apiCall(`/ingredients${queryString ? `?${queryString}` : ''}`);
  },

  async getUserIngredients(token: string): Promise<ApiResponse<{ userIngredients: UserIngredient[] }>> {
    return apiCall('/user-ingredients', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  async addUserIngredient(ingredient: Omit<UserIngredient, 'userId' | 'addedAt' | 'ingredientId'>, token: string): Promise<ApiResponse<{ userIngredient: UserIngredient }>> {
    return apiCall('/user-ingredients', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(ingredient),
    });
  },

  async removeUserIngredient(ingredientId: string, token: string): Promise<ApiResponse<{ message: string }>> {
    return apiCall('/user-ingredients', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ingredientId }),
    });
  },

  // Matching (Enhanced fuzzy matching)
  async findMatchingRecipes(request: MatchRequest, token: string): Promise<ApiResponse<MatchResponse>> {
    return apiCall('/matching-v2/find-recipes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  },

  async calculateMatch(userIngredients: string[], recipeIngredients: string[]): Promise<ApiResponse<{
    matchPercentage: number;
    matchedIngredients: string[];
    missingIngredients: string[];
    totalIngredients: number;
  }>> {
    return apiCall('/matching-v2/calculate-match', {
      method: 'POST',
      body: JSON.stringify({ userIngredients, recipeIngredients }),
    });
  },

  // New enhanced matching endpoints
  async analyzeIngredientMatching(userIngredients: string[], recipeId: string, token: string): Promise<ApiResponse<{
    recipeTitle: string;
    analysis: {
      userIngredient: string;
      bestMatch: {
        userIngredient: string;
        recipeIngredient: string;
        matchScore: number;
        isExactMatch: boolean;
      } | null;
      allMatches: Array<{
        userIngredient: string;
        recipeIngredient: string;
        matchScore: number;
        isExactMatch: boolean;
      }>;
    }[];
  }>> {
    return apiCall('/matching-v2/ingredient-analysis', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userIngredients, recipeId }),
    });
  },

  // Auth
  async loginUser(loginData: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: any; token: string }>> {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData),
    });
  },

  async registerUser(userData: {
    email: string;
    password: string;
    username: string;
    dietaryRestrictions?: string[];
    preferences?: any;
  }): Promise<ApiResponse<{ user: any; token: string }>> {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async verifyToken(token: string): Promise<ApiResponse<{ valid: boolean; userId: string }>> {
    return apiCall('/auth/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  async getUserProfile(token: string): Promise<ApiResponse<{ user: any }>> {
    return apiCall('/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};
