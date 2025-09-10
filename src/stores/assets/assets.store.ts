// @ts-nocheck
import { create } from 'zustand';
import { Asset, PriceData, AsyncState } from '@/lib/types';
import { createStore } from '../middleware';
import { immer } from 'zustand/middleware/immer';
import { useMarketStore } from '../market/market.store';
import { storeEvents, STORE_EVENTS } from '../middleware';
import React from 'react';

interface AssetSearchFilters {
  type: 'all' | 'spot' | 'perpetual';
  minVolume: number;
  showOnlyFavorites: boolean;
  sortBy: 'symbol' | 'price' | 'change' | 'volume' | 'name';
  sortOrder: 'asc' | 'desc';
  searchQuery: string;
}

interface AssetState {
  // Asset data
  assets: Map<string, Asset>;
  loadingState: AsyncState;
  lastUpdated: number;
  
  // Search and filtering
  searchFilters: AssetSearchFilters;
  searchResults: Asset[];
  searchHistory: string[];
  
  // Asset details
  selectedAsset: Asset | null;
  assetDetailsVisible: boolean;
  
  // Favorites/Watchlist
  favorites: Set<string>;
  
  // Actions - Asset Management
  loadAssets: (assets: Asset[]) => void;
  addAsset: (asset: Asset) => void;
  updateAsset: (symbol: string, updates: Partial<Asset>) => void;
  removeAsset: (symbol: string) => void;
  getAsset: (symbol: string) => Asset | undefined;
  getAllAssets: () => Asset[];
  
  // Actions - Search & Filtering
  setSearchQuery: (query: string) => void;
  updateSearchFilters: (filters: Partial<AssetSearchFilters>) => void;
  performSearch: () => void;
  clearSearch: () => void;
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  
  // Actions - Asset Details
  selectAsset: (asset: Asset | null) => void;
  showAssetDetails: (asset: Asset) => void;
  hideAssetDetails: () => void;
  
  // Actions - Favorites
  toggleFavorite: (symbol: string) => void;
  addToFavorites: (symbol: string) => void;
  removeFromFavorites: (symbol: string) => void;
  isFavorite: (symbol: string) => boolean;
  getFavorites: () => Asset[];
  
  // Computed getters
  getFilteredAssets: () => Asset[];
  getAssetsByType: (type: 'spot' | 'perpetual') => Asset[];
  getPopularAssets: (limit?: number) => Asset[];
  getRecentlyViewed: () => Asset[];
  
  // Enhanced getters with market data
  getAssetsWithMarketData: () => Array<Asset & { priceData?: any; marketRank?: number }>;
  getTopGainers: (limit?: number) => Array<Asset & { priceData: any }>;
  getTopLosers: (limit?: number) => Array<Asset & { priceData: any }>;
  getHighestVolume: (limit?: number) => Array<Asset & { priceData: any }>;
  getAssetsByMarketCap: (limit?: number) => Array<Asset & { priceData: any }>;
  
  // Market data integration
  refreshWithMarketData: () => void;
  
  // Utilities
  reset: () => void;
}

const initialFilters: AssetSearchFilters = {
  type: 'all',
  minVolume: 0,
  showOnlyFavorites: false,
  sortBy: 'volume',
  sortOrder: 'desc',
  searchQuery: '',
};

const initialState = {
  assets: new Map(),
  loadingState: {
    status: 'idle' as const,
    data: null,
    error: null,
  },
  lastUpdated: 0,
  searchFilters: { ...initialFilters },
  searchResults: [],
  searchHistory: [],
  selectedAsset: null,
  assetDetailsVisible: false,
  favorites: new Set(['BTC-USD', 'ETH-USD', 'SOL-USD']), // Default favorites
};

export const useAssetsStore = createStore<AssetState>(
  immer((set, get) => ({
    ...initialState,
    
    // Asset Management
    loadAssets: (assets) => {
      set((state) => {
        state.assets.clear();
        assets.forEach(asset => {
          state.assets.set(asset.symbol, asset);
        });
        state.lastUpdated = Date.now();
        state.loadingState.status = 'success';
        state.loadingState.error = null;
        
        // Trigger search refresh
        state.searchResults = get().performSearch();
      });
    },
    
    addAsset: (asset) => {
      set((state) => {
        state.assets.set(asset.symbol, asset);
        state.lastUpdated = Date.now();
      });
    },
    
    updateAsset: (symbol, updates) => {
      set((state) => {
        const existing = state.assets.get(symbol);
        if (existing) {
          state.assets.set(symbol, { ...existing, ...updates });
          state.lastUpdated = Date.now();
        }
      });
    },
    
    removeAsset: (symbol) => {
      set((state) => {
        state.assets.delete(symbol);
        state.favorites.delete(symbol);
        state.lastUpdated = Date.now();
      });
    },
    
    getAsset: (symbol) => {
      return get().assets.get(symbol);
    },
    
    getAllAssets: () => {
      return Array.from(get().assets.values());
    },
    
    // Search & Filtering
    setSearchQuery: (query) => {
      set((state) => {
        state.searchFilters.searchQuery = query;
        
        // Add to search history if query is meaningful
        if (query.length >= 2 && !state.searchHistory.includes(query)) {
          state.searchHistory.unshift(query);
          // Keep only last 10 searches
          state.searchHistory = state.searchHistory.slice(0, 10);
        }
      });
      
      // Trigger search after state update
      setTimeout(() => get().performSearch(), 0);
    },
    
    updateSearchFilters: (filters) => {
      set((state) => {
        Object.assign(state.searchFilters, filters);
      });
      
      // Trigger search after state update
      setTimeout(() => get().performSearch(), 0);
    },
    
    performSearch: () => {
      const { assets, searchFilters, favorites } = get();
      const { searchQuery, type, minVolume, showOnlyFavorites, sortBy, sortOrder } = searchFilters;
      
      let filtered = Array.from(assets.values());
      
      // Apply text search
      if (searchQuery && searchQuery.length >= 1) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(asset => 
          asset.symbol.toLowerCase().includes(query) ||
          asset.name.toLowerCase().includes(query) ||
          asset.baseAsset.toLowerCase().includes(query)
        );
      }
      
      // Apply type filter
      if (type !== 'all') {
        filtered = filtered.filter(asset => asset.type === type);
      }
      
      // Apply favorites filter
      if (showOnlyFavorites) {
        filtered = filtered.filter(asset => favorites.has(asset.symbol));
      }
      
      // Apply volume filter with market data integration
      if (minVolume > 0) {
        // Import market store to get real-time volume data
        const marketStore = useMarketStore?.getState();
        if (marketStore) {
          filtered = filtered.filter(asset => {
            const priceData = marketStore.getPrice(asset.symbol);
            return (priceData?.volume24h || 0) >= minVolume;
          });
        }
      }
      
      // Apply sorting with market data integration
      filtered.sort((a, b) => {
        let aValue: number | string = 0;
        let bValue: number | string = 0;
        
        // Import market store for real-time data
        const marketStore = useMarketStore?.getState();
        
        switch (sortBy) {
          case 'symbol':
          case 'name':
            aValue = a[sortBy].toLowerCase();
            bValue = b[sortBy].toLowerCase();
            break;
          case 'price':
            if (marketStore) {
              const aPriceData = marketStore.getPrice(a.symbol);
              const bPriceData = marketStore.getPrice(b.symbol);
              aValue = aPriceData?.price || 0;
              bValue = bPriceData?.price || 0;
            }
            break;
          case 'change':
            if (marketStore) {
              const aPriceData = marketStore.getPrice(a.symbol);
              const bPriceData = marketStore.getPrice(b.symbol);
              aValue = aPriceData?.changePercent24h || 0;
              bValue = bPriceData?.changePercent24h || 0;
            }
            break;
          case 'volume':
            if (marketStore) {
              const aPriceData = marketStore.getPrice(a.symbol);
              const bPriceData = marketStore.getPrice(b.symbol);
              aValue = aPriceData?.volume24h || 0;
              bValue = bPriceData?.volume24h || 0;
            }
            break;
          default:
            aValue = a.symbol.toLowerCase();
            bValue = b.symbol.toLowerCase();
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortOrder === 'asc' ? comparison : -comparison;
        }
        
        const numComparison = (aValue as number) - (bValue as number);
        return sortOrder === 'asc' ? numComparison : -numComparison;
      });
      
      set((state) => {
        state.searchResults = filtered;
      });
      
      return filtered;
    },
    
    clearSearch: () => {
      set((state) => {
        state.searchFilters = { ...initialFilters };
        state.searchResults = get().getAllAssets();
      });
    },
    
    addToSearchHistory: (query) => {
      set((state) => {
        if (query.length >= 2 && !state.searchHistory.includes(query)) {
          state.searchHistory.unshift(query);
          state.searchHistory = state.searchHistory.slice(0, 10);
        }
      });
    },
    
    clearSearchHistory: () => {
      set((state) => {
        state.searchHistory = [];
      });
    },
    
    // Asset Details
    selectAsset: (asset) => {
      set((state) => {
        state.selectedAsset = asset;
      });
    },
    
    showAssetDetails: (asset) => {
      set((state) => {
        state.selectedAsset = asset;
        state.assetDetailsVisible = true;
      });
    },
    
    hideAssetDetails: () => {
      set((state) => {
        state.assetDetailsVisible = false;
      });
    },
    
    // Favorites Management
    toggleFavorite: (symbol) => {
      set((state) => {
        if (state.favorites.has(symbol)) {
          state.favorites.delete(symbol);
        } else {
          state.favorites.add(symbol);
        }
      });
    },
    
    addToFavorites: (symbol) => {
      set((state) => {
        state.favorites.add(symbol);
      });
    },
    
    removeFromFavorites: (symbol) => {
      set((state) => {
        state.favorites.delete(symbol);
      });
    },
    
    isFavorite: (symbol) => {
      return get().favorites.has(symbol);
    },
    
    getFavorites: () => {
      const { assets, favorites } = get();
      return Array.from(favorites)
        .map(symbol => assets.get(symbol))
        .filter(Boolean) as Asset[];
    },
    
    // Computed Getters
    getFilteredAssets: () => {
      return get().searchResults;
    },
    
    getAssetsByType: (type) => {
      const { assets } = get();
      return Array.from(assets.values()).filter(asset => asset.type === type);
    },
    
    getPopularAssets: (limit = 10) => {
      // This would ideally use volume or market cap data
      // For now, return first N assets
      const { assets } = get();
      return Array.from(assets.values()).slice(0, limit);
    },
    
    getRecentlyViewed: () => {
      // This would need to track asset views
      // For now, return empty array
      return [];
    },
    
    // Enhanced getters with market data integration
    getAssetsWithMarketData: () => {
      const { assets } = get();
      const marketStore = useMarketStore?.getState();
      
      if (!marketStore) return Array.from(assets.values());
      
      return Array.from(assets.values()).map(asset => {
        const priceData = marketStore.getPrice(asset.symbol);
        return {
          ...asset,
          priceData,
          marketRank: priceData ? calculateMarketRank(priceData) : undefined,
        };
      });
    },
    
    getTopGainers: (limit = 10) => {
      const assetsWithMarketData = get().getAssetsWithMarketData();
      
      return assetsWithMarketData
        .filter(asset => asset.priceData?.changePercent24h > 0)
        .sort((a, b) => (b.priceData?.changePercent24h || 0) - (a.priceData?.changePercent24h || 0))
        .slice(0, limit) as Array<Asset & { priceData: any }>;
    },
    
    getTopLosers: (limit = 10) => {
      const assetsWithMarketData = get().getAssetsWithMarketData();
      
      return assetsWithMarketData
        .filter(asset => asset.priceData?.changePercent24h < 0)
        .sort((a, b) => (a.priceData?.changePercent24h || 0) - (b.priceData?.changePercent24h || 0))
        .slice(0, limit) as Array<Asset & { priceData: any }>;
    },
    
    getHighestVolume: (limit = 10) => {
      const assetsWithMarketData = get().getAssetsWithMarketData();
      
      return assetsWithMarketData
        .filter(asset => asset.priceData?.volume24h)
        .sort((a, b) => (b.priceData?.volume24h || 0) - (a.priceData?.volume24h || 0))
        .slice(0, limit) as Array<Asset & { priceData: any }>;
    },
    
    getAssetsByMarketCap: (limit = 10) => {
      const assetsWithMarketData = get().getAssetsWithMarketData();
      
      return assetsWithMarketData
        .filter(asset => asset.priceData?.marketCap)
        .sort((a, b) => (b.priceData?.marketCap || 0) - (a.priceData?.marketCap || 0))
        .slice(0, limit) as Array<Asset & { priceData: any }>;
    },
    
    refreshWithMarketData: () => {
      // Trigger a search refresh to update results with latest market data
      get().performSearch();
      
      // Update loading state
      set((state) => {
        state.loadingState.status = 'success';
        state.loadingState.lastUpdated = Date.now();
      });
    },
    
    // Utilities
    reset: () => {
      set(() => ({
        ...initialState,
        assets: new Map(),
        favorites: new Set(['BTC-USD', 'ETH-USD', 'SOL-USD']),
      }));
    },
  })),
  {
    name: 'assets-store',
    persist: {
      partialize: (state) => ({
        favorites: Array.from(state.favorites),
        searchHistory: state.searchHistory,
        searchFilters: {
          ...state.searchFilters,
          searchQuery: '', // Don't persist active search
        },
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert favorites array back to Set
          state.favorites = new Set(state.favorites || []);
        }
      },
    },
  }
);

// Helper function to calculate market rank based on various factors
const calculateMarketRank = (priceData: any): number => {
  if (!priceData) return 0;
  
  let rank = 0;
  
  // Volume factor (higher volume = higher rank)
  if (priceData.volume24h) {
    rank += Math.log10(priceData.volume24h) * 10;
  }
  
  // Price stability factor (lower volatility = slightly higher rank)
  const volatility = Math.abs(priceData.changePercent24h || 0);
  if (volatility < 5) rank += 5; // Bonus for low volatility
  else if (volatility > 20) rank -= 5; // Penalty for high volatility
  
  // Market cap factor (if available)
  if (priceData.marketCap) {
    rank += Math.log10(priceData.marketCap) * 5;
  }
  
  return Math.max(0, rank);
};

// Subscribe to price updates to refresh asset search results
let unsubscribePriceUpdates: (() => void) | null = null;

// Auto-refresh search results when market data changes (throttled)
let refreshTimeout: NodeJS.Timeout | null = null;
const scheduleRefresh = () => {
  if (refreshTimeout) return;
  
  refreshTimeout = setTimeout(() => {
    const assetsStore = useAssetsStore.getState();
    assetsStore.refreshWithMarketData();
    refreshTimeout = null;
  }, 1000); // Throttle refreshes to once per second
};

// Subscribe to market data changes
if (!unsubscribePriceUpdates) {
  unsubscribePriceUpdates = storeEvents.subscribe(STORE_EVENTS.PRICE_UPDATE, () => {
    scheduleRefresh();
  });
}

// Helper hook for search with debouncing
export const useAssetSearch = () => {
  const searchQuery = useAssetsStore(state => state.searchFilters.searchQuery);
  const searchResults = useAssetsStore(state => state.searchResults);
  const setSearchQuery = useAssetsStore(state => state.setSearchQuery);
  const updateSearchFilters = useAssetsStore(state => state.updateSearchFilters);
  const searchFilters = useAssetsStore(state => state.searchFilters);
  
  return {
    searchQuery,
    searchResults,
    setSearchQuery,
    updateSearchFilters,
    searchFilters,
  };
};