import { api } from './api';
import type { Ingredient } from '../context/RecipeContext';

const LOCAL_STORAGE_KEY = 'pantry.ingredients.v1';
const SYNC_QUEUE_KEY = 'pantry.sync.queue.v1';

export interface PantryItem extends Ingredient {
  ingredientId?: string;
  addedAt?: string;
  isLocal?: boolean; // true if only exists locally
}

export interface SyncQueueItem {
  action: 'add' | 'remove';
  ingredient: PantryItem;
  timestamp: number;
}

class PantryService {
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private backendLoadInProgress = false;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncWithBackend();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Load pantry from localStorage (fast, always available)
  loadFromLocalStorage(): PantryItem[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored) as PantryItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to load pantry from localStorage:', error);
      return [];
    }
  }

  // Save pantry to localStorage (immediate UI update)
  saveToLocalStorage(ingredients: PantryItem[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ingredients));
    } catch (error) {
      console.warn('Failed to save pantry to localStorage:', error);
    }
  }

  // Add ingredient to both localStorage and sync queue
  async addIngredient(ingredient: Ingredient, token?: string): Promise<PantryItem> {
    const pantryItem: PantryItem = {
      ...ingredient,
      addedAt: new Date().toISOString(),
      isLocal: !token,
    };

    // Update localStorage immediately
    const currentPantry = this.loadFromLocalStorage();
    const updatedPantry = [...currentPantry, pantryItem];
    this.saveToLocalStorage(updatedPantry);

    // If authenticated and online, sync to backend
    if (token && this.isOnline) {
      try {
        const result = await api.addUserIngredient({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          expiryDate: ingredient.expiryDate,
        }, token);

        if (result.data?.userIngredient) {
          // Update with backend data
          const backendItem: PantryItem = {
            ...pantryItem,
            ingredientId: result.data.userIngredient.ingredientId,
            isLocal: false,
          };
          
          const updatedPantryWithBackend = currentPantry.map(item => 
            item.name === ingredient.name ? backendItem : item
          );
          this.saveToLocalStorage(updatedPantryWithBackend);
          return backendItem;
        }
      } catch (error) {
        console.warn('Failed to sync ingredient to backend:', error);
        this.addToSyncQueue('add', pantryItem);
      }
    } else if (token) {
      // Queue for later sync
      this.addToSyncQueue('add', pantryItem);
    }

    return pantryItem;
  }

  // Remove ingredient from both localStorage and sync queue
  async removeIngredient(ingredientName: string, token?: string): Promise<void> {
    const currentPantry = this.loadFromLocalStorage();
    const ingredientToRemove = currentPantry.find(item => item.name === ingredientName);
    
    if (!ingredientToRemove) return;

    // Update localStorage immediately
    const updatedPantry = currentPantry.filter(item => item.name !== ingredientName);
    this.saveToLocalStorage(updatedPantry);

    // If authenticated and online, sync to backend
    if (token && this.isOnline && ingredientToRemove.ingredientId) {
      try {
        await api.removeUserIngredient(ingredientToRemove.ingredientId, token);
      } catch (error) {
        console.warn('Failed to sync ingredient removal to backend:', error);
        this.addToSyncQueue('remove', ingredientToRemove);
      }
    } else if (token) {
      // Queue for later sync
      this.addToSyncQueue('remove', ingredientToRemove);
    }
  }

  // Load pantry from backend (when user logs in)
  async loadFromBackend(token: string): Promise<PantryItem[]> {
    if (this.backendLoadInProgress) {
      console.log('Backend load already in progress, skipping...');
      return this.loadFromLocalStorage();
    }
    
    this.backendLoadInProgress = true;
    console.log('Loading pantry from backend...');
    
    try {
      const result = await api.getUserIngredients(token);
      
      if (result.data?.userIngredients) {
        console.log('Backend pantry loaded:', result.data.userIngredients.length, 'items');
        const backendItems: PantryItem[] = result.data.userIngredients.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          expiryDate: item.expiryDate,
          ingredientId: item.ingredientId,
          addedAt: item.addedAt,
          isLocal: false,
        }));

        // Merge with local items (local takes precedence for conflicts)
        const localItems = this.loadFromLocalStorage();
        const mergedItems = this.mergePantryItems(backendItems, localItems);
        
        this.saveToLocalStorage(mergedItems);
        console.log('Pantry merged and saved to localStorage');
        return mergedItems;
      }
    } catch (error) {
      console.warn('Failed to load pantry from backend:', error);
      // Fall back to localStorage
      return this.loadFromLocalStorage();
    } finally {
      this.backendLoadInProgress = false;
    }

    return this.loadFromLocalStorage();
  }

  // Sync pending changes with backend
  async syncWithBackend(token?: string): Promise<void> {
    if (!token || this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;

    try {
      const syncQueue = this.getSyncQueue();
      if (syncQueue.length === 0) return;

      for (const item of syncQueue) {
        if (item.action === 'add') {
          await api.addUserIngredient({
            name: item.ingredient.name,
            quantity: item.ingredient.quantity,
            unit: item.ingredient.unit,
            expiryDate: item.ingredient.expiryDate,
          }, token);
        } else if (item.action === 'remove' && item.ingredient.ingredientId) {
          await api.removeUserIngredient(item.ingredient.ingredientId, token);
        }
      }

      // Clear sync queue on success
      this.clearSyncQueue();
    } catch (error) {
      console.warn('Failed to sync pantry with backend:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Merge backend and local items (local takes precedence)
  private mergePantryItems(backendItems: PantryItem[], localItems: PantryItem[]): PantryItem[] {
    const merged = [...backendItems];
    
    // Add local items that don't exist in backend
    for (const localItem of localItems) {
      if (!merged.some(item => item.name === localItem.name)) {
        merged.push(localItem);
      }
    }

    return merged;
  }

  // Sync queue management
  private addToSyncQueue(action: 'add' | 'remove', ingredient: PantryItem): void {
    try {
      const queue = this.getSyncQueue();
      queue.push({
        action,
        ingredient,
        timestamp: Date.now(),
      });
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.warn('Failed to add to sync queue:', error);
    }
  }

  private getSyncQueue(): SyncQueueItem[] {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored) as SyncQueueItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to get sync queue:', error);
      return [];
    }
  }

  private clearSyncQueue(): void {
    try {
      localStorage.removeItem(SYNC_QUEUE_KEY);
    } catch (error) {
      console.warn('Failed to clear sync queue:', error);
    }
  }

  // Clear all local data (on logout)
  clearLocalData(): void {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(SYNC_QUEUE_KEY);
    } catch (error) {
      console.warn('Failed to clear local data:', error);
    }
  }
}

export const pantryPersistence = new PantryService();
