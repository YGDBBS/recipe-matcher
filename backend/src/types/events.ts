// Event schemas for Recipe Matcher event-driven architecture

export interface BaseEvent {
  version: string;
  id: string;
  'detail-type': string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: any;
}

// User Events
export interface UserRegisteredEvent extends BaseEvent {
  'detail-type': 'UserRegistered';
  source: 'recipe-matcher.user';
  detail: {
    userId: string;
    email: string;
    username: string;
    timestamp: string;
    metadata?: {
      registrationSource?: string;
      userAgent?: string;
    };
  };
}

export interface UserProfileUpdatedEvent extends BaseEvent {
  'detail-type': 'UserProfileUpdated';
  source: 'recipe-matcher.user';
  detail: {
    userId: string;
    changes: {
      dietaryRestrictions?: string[];
      preferences?: {
        cookingTime?: number;
        difficultyLevel?: string;
      };
    };
    timestamp: string;
  };
}

export interface UserIngredientsUpdatedEvent extends BaseEvent {
  'detail-type': 'UserIngredientsUpdated';
  source: 'recipe-matcher.user';
  detail: {
    userId: string;
    ingredients: {
      added?: string[];
      removed?: string[];
      updated?: Array<{
        ingredientId: string;
        quantity?: string;
        unit?: string;
      }>;
    };
    timestamp: string;
  };
}

// Recipe Events
export interface RecipeCreatedEvent extends BaseEvent {
  'detail-type': 'RecipeCreated';
  source: 'recipe-matcher.recipe';
  detail: {
    recipeId: string;
    userId: string;
    title: string;
    ingredients: string[];
    instructions: string[];
    cookingTime: number;
    difficultyLevel: string;
    tags: string[];
    timestamp: string;
  };
}

export interface RecipeUpdatedEvent extends BaseEvent {
  'detail-type': 'RecipeUpdated';
  source: 'recipe-matcher.recipe';
  detail: {
    recipeId: string;
    userId: string;
    changes: {
      title?: string;
      ingredients?: string[];
      instructions?: string[];
      cookingTime?: number;
      difficultyLevel?: string;
      tags?: string[];
    };
    timestamp: string;
  };
}

export interface RecipeRatedEvent extends BaseEvent {
  'detail-type': 'RecipeRated';
  source: 'recipe-matcher.recipe';
  detail: {
    recipeId: string;
    userId: string;
    rating: number; // 1-5
    review?: string;
    timestamp: string;
  };
}

export interface RecipeSharedEvent extends BaseEvent {
  'detail-type': 'RecipeShared';
  source: 'recipe-matcher.recipe';
  detail: {
    recipeId: string;
    fromUserId: string;
    toUserId?: string; // If shared to specific user
    shareType: 'public' | 'private' | 'family';
    timestamp: string;
  };
}

// Matching Events
export interface RecipeMatchedEvent extends BaseEvent {
  'detail-type': 'RecipeMatched';
  source: 'recipe-matcher.matching';
  detail: {
    userId: string;
    recipeId: string;
    matchPercentage: number;
    availableIngredients: string[];
    missingIngredients: string[];
    timestamp: string;
  };
}

export interface MatchPercentageUpdatedEvent extends BaseEvent {
  'detail-type': 'MatchPercentageUpdated';
  source: 'recipe-matcher.matching';
  detail: {
    userId: string;
    recipeId: string;
    oldMatchPercentage: number;
    newMatchPercentage: number;
    reason: 'ingredients_added' | 'ingredients_removed' | 'recipe_updated';
    timestamp: string;
  };
}

// Notification Events
export interface NotificationSentEvent extends BaseEvent {
  'detail-type': 'NotificationSent';
  source: 'recipe-matcher.notification';
  detail: {
    userId: string;
    notificationType: 'recipe_matched' | 'recipe_shared' | 'welcome' | 'recipe_updated';
    title: string;
    message: string;
    data?: any;
    timestamp: string;
  };
}

// Union type for all events
export type RecipeMatcherEvent = 
  | UserRegisteredEvent
  | UserProfileUpdatedEvent
  | UserIngredientsUpdatedEvent
  | RecipeCreatedEvent
  | RecipeUpdatedEvent
  | RecipeRatedEvent
  | RecipeSharedEvent
  | RecipeMatchedEvent
  | MatchPercentageUpdatedEvent
  | NotificationSentEvent;

// Event publishing helper
export interface EventPublisher {
  publishEvent<T extends RecipeMatcherEvent>(event: Omit<T, 'version' | 'id' | 'account' | 'time' | 'region' | 'resources'>): Promise<void>;
}
