import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { RecipeMatcherEvent } from '../types/events';

export class EventPublisher {
  private eventBridge: EventBridgeClient;
  private eventBusName: string;

  constructor(eventBusName: string) {
    this.eventBridge = new EventBridgeClient({});
    this.eventBusName = eventBusName;
  }

  async publishEvent<T extends RecipeMatcherEvent>(
    event: Omit<T, 'version' | 'id' | 'account' | 'time' | 'region' | 'resources'>
  ): Promise<void> {
    const eventEntry = {
      Source: event.source,
      DetailType: event['detail-type'],
      Detail: JSON.stringify(event.detail),
      EventBusName: this.eventBusName,
    };

    try {
      const command = new PutEventsCommand({
        Entries: [eventEntry],
      });

      const result = await this.eventBridge.send(command);
      
      if (result.FailedEntryCount && result.FailedEntryCount > 0) {
        console.error('Failed to publish event:', result.Entries);
        throw new Error('Failed to publish event to EventBridge');
      }

      console.log('Event published successfully:', {
        source: event.source,
        detailType: event['detail-type'],
        eventId: result.Entries?.[0]?.EventId,
      });
    } catch (error) {
      console.error('Error publishing event:', error);
      throw error;
    }
  }

  // Helper methods for common events
  async publishUserRegistered(detail: RecipeMatcherEvent['detail'] & { userId: string; email: string; username: string; timestamp: string }) {
    return this.publishEvent({
      source: 'recipe-matcher.user',
      'detail-type': 'UserRegistered',
      detail,
    });
  }

  async publishUserIngredientsUpdated(detail: RecipeMatcherEvent['detail'] & { userId: string; ingredients: any; timestamp: string }) {
    return this.publishEvent({
      source: 'recipe-matcher.user',
      'detail-type': 'UserIngredientsUpdated',
      detail,
    });
  }

  async publishRecipeCreated(detail: RecipeMatcherEvent['detail'] & { recipeId: string; userId: string; title: string; ingredients: string[]; instructions: string[]; cookingTime: number; difficultyLevel: string; tags: string[]; timestamp: string }) {
    return this.publishEvent({
      source: 'recipe-matcher.recipe',
      'detail-type': 'RecipeCreated',
      detail,
    });
  }

  async publishRecipeMatched(detail: RecipeMatcherEvent['detail'] & { userId: string; recipeId: string; matchPercentage: number; availableIngredients: string[]; missingIngredients: string[]; timestamp: string }) {
    return this.publishEvent({
      source: 'recipe-matcher.matching',
      'detail-type': 'RecipeMatched',
      detail,
    });
  }

  async publishRecipeRated(detail: RecipeMatcherEvent['detail'] & { recipeId: string; userId: string; rating: number; review?: string; timestamp: string }) {
    return this.publishEvent({
      source: 'recipe-matcher.recipe',
      'detail-type': 'RecipeRated',
      detail,
    });
  }

  async publishRecipeShared(detail: RecipeMatcherEvent['detail'] & { recipeId: string; fromUserId: string; toUserId?: string; shareType: 'public' | 'private' | 'family'; timestamp: string }) {
    return this.publishEvent({
      source: 'recipe-matcher.recipe',
      'detail-type': 'RecipeShared',
      detail,
    });
  }
}
