import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAssetsStore } from '@/stores/assets/assets.store';
import { useMarketStore } from '@/stores';
import { Asset, AssetWithMarketData, AssetSearchFilters, SearchSuggestion } from '@/lib/types';
import { debounce } from '@/lib/utils';

interface UseAssetSearchOptions {
  debounceMs?: number;
  maxResults?: number;
  enableSuggestions?: boolean;
  enableHistory?: boolean;
}

interface UseAssetSearchReturn {
  // Search state
  query: string;
  setQuery: (query: string) => void;
  debouncedQuery: string;
  
  // Filters
  filters: AssetSearchFilters;
  updateFilters: (filters: Partial<AssetSearchFilters>) => void;
  resetFilters: () => void;
  
  // Results
  results: AssetWithMarketData[];
  isSearching: boolean;
  hasResults: boolean;
  totalResults: number;
  
  // Suggestions
  suggestions: SearchSuggestion[];
  showSuggestions: boolean;
  
  // Actions
  performSearch: () => void;
  clearSearch: () => void;
  selectAsset: (asset: Asset) => void;
  toggleFavorite: (symbol: string) => void;
  
  // Computed values
  popularAssets: AssetWithMarketData[];
  favoriteAssets: AssetWithMarketData[];
  recentAssets: AssetWithMarketData[];
  
  // Search categories
  categories: Array<{
    id: string;
    name: string;
    count: number;
    assets: AssetWithMarketData[];
  }>;
}

export const useAssetSearch = (options: UseAssetSearchOptions = {}): UseAssetSearchReturn => {
  const {
    debounceMs = 300,
    maxResults = 100,
    enableSuggestions = true,
    enableHistory = true,
  } = options;
  
  // Local state
  const [query, setQueryState] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Store state
  const {
    searchFilters,
    searchResults,
    searchHistory,
    getAllAssets,
    getFilteredAssets,
    updateSearchFilters,
    setSearchQuery,
    performSearch: storePerformSearch,
    clearSearch: storeClearSearch,
    selectAsset: storeSelectAsset,
    toggleFavorite: storeToggleFavorite,
    addToSearchHistory,
    favorites,
  } = useAssetsStore();
  
  // Market data
  const prices = useMarketStore(state => state.prices);
  const getPriceHistory = useMarketStore(state => state.getPriceHistory);
  
  // Debounced query update
  const debouncedSetQuery = useMemo(
    () => debounce((newQuery: string) => {
      setDebouncedQuery(newQuery);
      setIsSearching(false);
    }, debounceMs),
    [debounceMs]
  );
  
  // Update debounced query when query changes
  useEffect(() => {
    if (query !== debouncedQuery) {
      setIsSearching(true);
      debouncedSetQuery(query);
    }
  }, [query, debouncedQuery, debouncedSetQuery]);
  
  // Update store when debounced query changes
  useEffect(() => {
    setSearchQuery(debouncedQuery);
  }, [debouncedQuery, setSearchQuery]);
  
  // Set query with suggestion handling
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
    setShowSuggestions(newQuery.length > 0 && enableSuggestions);
    
    if (enableHistory && newQuery.length >= 2) {
      addToSearchHistory(newQuery);
    }
  }, [enableSuggestions, enableHistory, addToSearchHistory]);
  
  // Enhanced results with market data
  const results = useMemo((): AssetWithMarketData[] => {
    return searchResults.slice(0, maxResults).map(asset => {
      const priceData = prices.get(asset.symbol);
      const priceHistory = getPriceHistory(asset.symbol, 24);
      
      return {
        ...asset,
        priceData,
        priceHistory,
        isFavorite: favorites.has(asset.symbol),
        marketValue: priceData?.price ? priceData.price * 1000000 : 0,
        priceChange24h: priceData?.change24h || 0,
        priceChangePercent24h: priceData?.changePercent24h || 0,
        volume24h: priceData?.volume24h || 0,
      };
    });
  }, [searchResults, maxResults, prices, getPriceHistory, favorites]);
  
  // Search suggestions
  const suggestions = useMemo((): SearchSuggestion[] => {
    if (!enableSuggestions || !query || query.length < 1) {
      return [];
    }
    
    const suggestions: SearchSuggestion[] = [];
    const queryLower = query.toLowerCase();
    const allAssets = getAllAssets();
    
    // Asset matches
    const assetMatches = allAssets
      .filter(asset => 
        asset.symbol.toLowerCase().includes(queryLower) ||
        asset.name.toLowerCase().includes(queryLower) ||
        asset.baseAsset.toLowerCase().includes(queryLower)
      )
      .slice(0, 5)
      .map(asset => ({
        type: 'asset' as const,
        value: asset.symbol,
        label: asset.symbol,
        description: asset.name,
        icon: '💱',
      }));
    
    suggestions.push(...assetMatches);
    
    // Search history matches
    if (enableHistory) {
      const historyMatches = searchHistory
        .filter(term => term.toLowerCase().includes(queryLower) && term !== query)
        .slice(0, 3)
        .map(term => ({
          type: 'history' as const,
          value: term,
          label: term,
          description: 'Recent search',
          icon: '🕐',
        }));
      
      suggestions.push(...historyMatches);
    }
    
    // Category matches
    const categories = ['major', 'defi', 'gaming', 'layer1'];
    const categoryMatches = categories
      .filter(category => category.includes(queryLower))
      .slice(0, 2)
      .map(category => ({
        type: 'category' as const,
        value: category,
        label: category.charAt(0).toUpperCase() + category.slice(1),
        description: 'Asset category',
        icon: '📁',
      }));
    
    suggestions.push(...categoryMatches);
    
    return suggestions.slice(0, 8);
  }, [query, enableSuggestions, enableHistory, getAllAssets, searchHistory]);
  
  // Popular assets (by volume or favorites)
  const popularAssets = useMemo((): AssetWithMarketData[] => {
    const allAssets = getAllAssets();
    return allAssets
      .map(asset => {
        const priceData = prices.get(asset.symbol);
        return {
          ...asset,
          priceData,
          priceHistory: getPriceHistory(asset.symbol, 24),
          isFavorite: favorites.has(asset.symbol),
          marketValue: priceData?.price ? priceData.price * 1000000 : 0,
          priceChange24h: priceData?.change24h || 0,
          priceChangePercent24h: priceData?.changePercent24h || 0,
          volume24h: priceData?.volume24h || 0,
        };
      })
      .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
      .slice(0, 10);
  }, [getAllAssets, prices, getPriceHistory, favorites]);
  
  // Favorite assets
  const favoriteAssets = useMemo((): AssetWithMarketData[] => {
    const allAssets = getAllAssets();
    return allAssets
      .filter(asset => favorites.has(asset.symbol))
      .map(asset => {
        const priceData = prices.get(asset.symbol);
        return {
          ...asset,
          priceData,
          priceHistory: getPriceHistory(asset.symbol, 24),
          isFavorite: true,
          marketValue: priceData?.price ? priceData.price * 1000000 : 0,
          priceChange24h: priceData?.change24h || 0,
          priceChangePercent24h: priceData?.changePercent24h || 0,
          volume24h: priceData?.volume24h || 0,
        };
      });
  }, [getAllAssets, favorites, prices, getPriceHistory]);
  
  // Recent assets (placeholder - would track user interactions)
  const recentAssets = useMemo((): AssetWithMarketData[] => {
    // This would be implemented with user interaction tracking
    return [];
  }, []);
  
  // Categories with asset counts
  const categories = useMemo(() => {
    const allAssets = getAllAssets();
    const categoryMap = new Map<string, AssetWithMarketData[]>();
    
    allAssets.forEach(asset => {
      const category = asset.category || 'other';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      
      const priceData = prices.get(asset.symbol);
      const enhancedAsset: AssetWithMarketData = {
        ...asset,
        priceData,
        priceHistory: getPriceHistory(asset.symbol, 24),
        isFavorite: favorites.has(asset.symbol),
        marketValue: priceData?.price ? priceData.price * 1000000 : 0,
        priceChange24h: priceData?.change24h || 0,
        priceChangePercent24h: priceData?.changePercent24h || 0,
        volume24h: priceData?.volume24h || 0,
      };
      
      categoryMap.get(category)!.push(enhancedAsset);
    });
    
    return Array.from(categoryMap.entries()).map(([id, assets]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      count: assets.length,
      assets: assets.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0)),
    }));
  }, [getAllAssets, prices, getPriceHistory, favorites]);
  
  // Action handlers
  const performSearch = useCallback(() => {
    storePerformSearch();
  }, [storePerformSearch]);
  
  const clearSearch = useCallback(() => {
    setQueryState('');
    setDebouncedQuery('');
    setShowSuggestions(false);
    storeClearSearch();
  }, [storeClearSearch]);
  
  const selectAsset = useCallback((asset: Asset) => {
    storeSelectAsset(asset);
    setShowSuggestions(false);
  }, [storeSelectAsset]);
  
  const toggleFavorite = useCallback((symbol: string) => {
    storeToggleFavorite(symbol);
  }, [storeToggleFavorite]);
  
  const resetFilters = useCallback(() => {
    updateSearchFilters({
      type: 'all',
      minVolume: 0,
      showOnlyFavorites: false,
      sortBy: 'volume',
      sortOrder: 'desc',
      category: undefined,
      minPrice: undefined,
      maxPrice: undefined,
    });
  }, [updateSearchFilters]);
  
  return {
    // Search state
    query,
    setQuery,
    debouncedQuery,
    
    // Filters
    filters: searchFilters,
    updateFilters: updateSearchFilters,
    resetFilters,
    
    // Results
    results,
    isSearching,
    hasResults: results.length > 0,
    totalResults: results.length,
    
    // Suggestions
    suggestions,
    showSuggestions,
    
    // Actions
    performSearch,
    clearSearch,
    selectAsset,
    toggleFavorite,
    
    // Computed values
    popularAssets,
    favoriteAssets,
    recentAssets,
    categories,
  };
};

export default useAssetSearch;