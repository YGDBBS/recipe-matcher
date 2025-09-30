// API configuration
const API_BASE_URL = 'https://lp6heyiqod.execute-api.eu-west-1.amazonaws.com/prod';

// Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
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
  matchPercentage?: number;
  missingIngredients?: string[];
  availableIngredients?: string[];
  userId: string;
  createdAt: string;
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
    limit?: number;
  }): Promise<ApiResponse<{ recipes: Recipe[] }>> {
    const queryParams = new URLSearchParams();
    if (params?.ingredient) queryParams.append('ingredient', params.ingredient);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    return apiCall(`/recipes${queryString ? `?${queryString}` : ''}`);
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

  async addUserIngredient(ingredient: Omit<UserIngredient, 'userId' | 'addedAt'>, token: string): Promise<ApiResponse<{ userIngredient: UserIngredient }>> {
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

  // Matching
  async findMatchingRecipes(request: MatchRequest, token: string): Promise<ApiResponse<MatchResponse>> {
    return apiCall('/matching/find-recipes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  },

  async calculateMatch(userIngredients: string[], recipeIngredients: string[]): Promise<ApiResponse<{
    matchPercentage: number;
    availableIngredients: string[];
    missingIngredients: string[];
  }>> {
    return apiCall('/matching/calculate-match', {
      method: 'POST',
      body: JSON.stringify({ userIngredients, recipeIngredients }),
    });
  },

  // Auth
  async loginUser(loginData: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: any; token: string }>> {
    return apiCall('/auth', {
      method: 'POST',
      body: JSON.stringify({
        operation: 'login',
        ...loginData,
      }),
    });
  },

  async registerUser(userData: {
    email: string;
    password: string;
    username: string;
    dietaryRestrictions?: string[];
    preferences?: any;
  }): Promise<ApiResponse<{ user: any; token: string }>> {
    return apiCall('/auth', {
      method: 'POST',
      body: JSON.stringify({
        operation: 'register',
        ...userData,
      }),
    });
  },

  async verifyToken(token: string): Promise<ApiResponse<{ valid: boolean; userId: string }>> {
    return apiCall('/auth', {
      method: 'POST',
      body: JSON.stringify({
        operation: 'verify',
      }),
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  async getUserProfile(token: string): Promise<ApiResponse<{ user: any }>> {
    return apiCall('/auth', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};
