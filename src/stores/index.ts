//@ts-nocheck
// Core stores
export { useMarketStore } from './market/market.store';
export { useTradingStore } from './trading/trading.store';
export { useUIStore } from './ui/ui.store';
export { useAssetsStore } from './assets/assets.store';
export { useWebSocketStore, useWebSocketConnection, useWebSocketActions } from './websocket/websocket.store';
export { usePortfolioStore, usePortfolioMetrics, usePerformanceHistory } from './portfolio/portfolio.store';

// Middleware and utilities
export { storeEvents, STORE_EVENTS } from './middleware';

// Store types (re-export from lib/types for convenience)
export type {
  PriceData,
  OrderBook,
  Candle,
  Position,
  Order,
  Balance,
  Transaction,
  PortfolioMetrics,
  Asset,
  AssetWithMarketData,
  AssetSearchFilters,
  SearchSuggestion,
  UIPreferences,
  ChartSettings,
  NotificationSettings,
} from '@/lib/types';

// Asset search hooks
export { useAssetSearch } from './assets/assets.store';

// Custom hooks for common store patterns
import { useMemo } from 'react';
import { useMarketStore } from './market/market.store';
import { useTradingStore } from './trading/trading.store';
import { useUIStore } from './ui/ui.store';
import { shallow } from 'zustand/shallow';

/**
 * Hook to get current price for a symbol
 */
export const useSymbolPrice = (symbol: string) => {
  return useMarketStore((state) => state.getPrice(symbol));
};

/**
 * Hook to get filtered prices based on search and favorites
 */
export const useFilteredPrices = () => {
  const prices = useMarketStore((state) => state.prices);
  const searchQuery = useUIStore((state) => state.searchQuery);
  const assetFilters = useUIStore((state) => state.assetFilters);
  const favoriteSymbols = useUIStore((state) => state.favoriteSymbols);
  
  return useMemo(() => {
    const priceArray = Array.from(prices.values());
    
    let filtered = priceArray;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(price => 
        price.symbol.toLowerCase().includes(query)
      );
    }
    
    // Apply favorites filter
    if (assetFilters.showOnlyFavorites) {
      filtered = filtered.filter(price => 
        favoriteSymbols.includes(price.symbol)
      );
    }
    
    // Apply volume filter
    if (assetFilters.minVolume > 0) {
      filtered = filtered.filter(price => 
        price.volume24h >= assetFilters.minVolume
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: number;
      let bValue: number;
      
      switch (assetFilters.sortBy) {
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'change':
          aValue = a.changePercent24h;
          bValue = b.changePercent24h;
          break;
        case 'volume':
          aValue = a.volume24h;
          bValue = b.volume24h;
          break;
        default:
          return assetFilters.sortOrder === 'asc' 
            ? a.symbol.localeCompare(b.symbol)
            : b.symbol.localeCompare(a.symbol);
      }
      
      return assetFilters.sortOrder === 'asc' 
        ? aValue - bValue 
        : bValue - aValue;
    });
    
    return filtered;
  }, [prices, searchQuery, assetFilters, favoriteSymbols]);
};

/**
 * Hook to get open positions with live P&L
 */
export const useOpenPositions = () => {
  return useTradingStore((state) => state.getOpenPositions());
};

/**
 * Hook to get pending orders
 */
export const usePendingOrders = () => {
  return useTradingStore((state) => state.getPendingOrders());
};

/**
 * Hook to get account summary with calculated metrics
 */
export const useAccountSummary = () => {
  return useTradingStore(
    (state) => {
      const { balance } = state;
      
      const totalPnl = balance.realizedPnl + balance.unrealizedPnl;
      const equity = balance.total + balance.unrealizedPnl;
      const dayPnl = balance.unrealizedPnl;
      
      return {
        equity,
        freeMargin: balance.freeMargin,
        marginLevel: balance.marginLevel,
        totalPnl,
        dayPnl,
      };
    }
  );
};

/**
 * Hook to get position by ID with live P&L
 */
export const usePosition = (positionId: string | null) => {
  return useTradingStore(
    (state) => positionId ? state.positions.find(p => p.id === positionId) : null
  );
};

/**
 * Hook to get order book for a symbol
 */
export const useOrderBook = (symbol: string) => {
  return useMarketStore(
    (state) => state.orderBooks.get(symbol)
  );
};

/**
 * Hook to get price history for sparklines
 */
export const usePriceHistory = (symbol: string, limit = 50) => {
  return useMarketStore(
    (state) => state.getPriceHistory(symbol, limit)
  );
};

/**
 * Hook to get candles for chart
 */
export const useCandles = (symbol: string, interval: string) => {
  return useMarketStore(
    (state) => state.getCandles(symbol, interval)
  );
};

/**
 * Hook to get assets enriched with market data
 */
export const useAssetsWithMarketData = () => {
  return useAssetsStore((state) => state.getAssetsWithMarketData());
};

/**
 * Hook to get top gaining assets
 */
export const useTopGainers = (limit = 10) => {
  return useAssetsStore((state) => state.getTopGainers(limit));
};

/**
 * Hook to get top losing assets  
 */
export const useTopLosers = (limit = 10) => {
  return useAssetsStore((state) => state.getTopLosers(limit));
};

/**
 * Hook to get highest volume assets
 */
export const useHighestVolume = (limit = 10) => {
  return useAssetsStore((state) => state.getHighestVolume(limit));
};

/**
 * Hook to get assets by market cap
 */
export const useAssetsByMarketCap = (limit = 10) => {
  return useAssetsStore((state) => state.getAssetsByMarketCap(limit));
};

/**
 * Hook to get current theme with system preference detection
 */
export const useTheme = () => {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  
  const resolvedTheme = useMemo(() => {
    if (theme === 'system' && typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);
  
  return { theme: resolvedTheme, setTheme };
};

/**
 * Hook to get notification state
 */
export const useNotifications = () => {
  const notifications = useUIStore((state) => state.notifications);
  const unreadCount = useUIStore((state) => state.getUnreadNotificationCount());
  const addNotification = useUIStore((state) => state.addNotification);
  const removeNotification = useUIStore((state) => state.removeNotification);
  const markNotificationRead = useUIStore((state) => state.markNotificationRead);
  const clearAllNotifications = useUIStore((state) => state.clearAllNotifications);
  
  return {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markNotificationRead,
    clearAllNotifications,
  };
};

/**
 * Hook to manage favorites
 */
export const useFavorites = () => {
  const favoriteSymbols = useUIStore((state) => state.favoriteSymbols);
  const toggleFavorite = useUIStore((state) => state.toggleFavorite);
  const isFavorite = useUIStore((state) => state.isFavorite);
  
  return {
    favorites: favoriteSymbols,
    toggleFavorite,
    isFavorite,
  };
};

/**
 * Hook to get WebSocket connection state
 */
export const useConnectionState = () => {
  return useWebSocketConnection();
};

/**
 * Hook for managing modal state
 */
export const useModal = (modalName: keyof ReturnType<typeof useUIStore>['modals']) => {
  const isOpen = useUIStore((state) => state.modals[modalName]);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  
  return {
    isOpen,
    open: () => openModal(modalName),
    close: () => closeModal(modalName),
  };
};

// Re-export portfolio metrics from the dedicated portfolio store
// The old implementation has been moved to portfolio.store.ts for better organization