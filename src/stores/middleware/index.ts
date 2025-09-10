import { create } from 'zustand';
import { devtools, persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { DEBUG } from '@/lib/constants';

// Enable Immer MapSet plugin for Map and Set support
enableMapSet();

// Simple store creator for Zustand stores with basic middleware
export const createStore = <T>(
  stateCreator: any,
  options: {
    name: string;
    persist?: {
      partialize?: (state: T) => Partial<T>;
      version?: number;
      migrate?: (persistedState: unknown, version: number) => T | Promise<T>;
    };
  }
) => {
  if (options.persist) {
    return create<T>()(
      devtools(
        persist(
          subscribeWithSelector(
            immer(stateCreator)
          ),
          {
            name: options.name,
            storage: createJSONStorage(() => localStorage),
            partialize: options.persist.partialize,
            version: options.persist.version || 1,
            migrate: options.persist.migrate,
          }
        ),
        DEBUG.ENABLED ? { name: options.name } : undefined
      )
    );
  } else {
    return create<T>()(
      devtools(
        subscribeWithSelector(
          immer(stateCreator)
        ),
        DEBUG.ENABLED ? { name: options.name } : undefined
      )
    );
  }
};

// Utility type for creating typed selectors
export type StoreSelector<T, R> = (state: T) => R;

// Create a selector hook with shallow comparison
export const createShallowSelector = <T>() => {
  return <R>(selector: StoreSelector<T, R>) => selector;
};

// Subscription manager for cross-store communication
class StoreEventManager {
  private events = new Map<string, Set<(data: unknown) => void>>();
  
  emit(event: string, data: unknown) {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in store event listener for ${event}:`, error);
        }
      });
    }
  }
  
  subscribe(event: string, listener: (data: unknown) => void) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.events.get(event);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.events.delete(event);
        }
      }
    };
  }
  
  clear() {
    this.events.clear();
  }
}

export const storeEvents = new StoreEventManager();

// Store event types
export const STORE_EVENTS = {
  PRICE_UPDATE: 'price:update',
  ORDER_FILLED: 'order:filled',
  POSITION_OPENED: 'position:opened',
  POSITION_CLOSED: 'position:closed',
  BALANCE_UPDATED: 'balance:updated',
  CONNECTION_CHANGED: 'connection:changed',
} as const;