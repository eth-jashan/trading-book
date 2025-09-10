// @ts-nocheck
import { create } from 'zustand';
import { UIPreferences, ChartSettings, NotificationSettings } from '@/lib/types';
import { createStore } from '../middleware';
import { UI_CONFIG, CHART_CONFIG, POPULAR_SYMBOLS } from '@/lib/constants';

interface UIState extends UIPreferences {
  // Layout state
  sidebarWidth: number;
  rightPanelWidth: number;
  bottomPanelHeight: number;
  
  // Modal/Dialog state
  modals: {
    orderForm: boolean;
    positionDetails: boolean;
    settings: boolean;
    about: boolean;
  };
  
  // Active selections
  selectedSymbol: string | null;
  selectedPosition: string | null;
  selectedOrder: string | null;
  
  // Search and filters
  searchQuery: string;
  assetFilters: {
    type: 'all' | 'spot' | 'perpetual';
    minVolume: number;
    showOnlyFavorites: boolean;
    sortBy: 'symbol' | 'price' | 'change' | 'volume';
    sortOrder: 'asc' | 'desc';
  };
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    persistent?: boolean;
  }>;
  
  // Actions - Theme & Appearance
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setBottomPanelHeight: (height: number) => void;
  
  // Actions - Modals
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
  
  // Actions - Selections
  setSelectedSymbol: (symbol: string | null) => void;
  setSelectedPosition: (positionId: string | null) => void;
  setSelectedOrder: (orderId: string | null) => void;
  
  // Actions - Search & Filters
  setSearchQuery: (query: string) => void;
  updateAssetFilters: (filters: Partial<UIState['assetFilters']>) => void;
  resetFilters: () => void;
  
  // Actions - Favorites
  toggleFavorite: (symbol: string) => void;
  addFavorite: (symbol: string) => void;
  removeFavorite: (symbol: string) => void;
  
  // Actions - Chart Settings
  updateChartSettings: (settings: Partial<ChartSettings>) => void;
  setChartInterval: (interval: ChartSettings['interval']) => void;
  setChartType: (type: ChartSettings['chartType']) => void;
  toggleIndicator: (indicator: string) => void;
  
  // Actions - Notifications
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Computed
  getUnreadNotificationCount: () => number;
  isFavorite: (symbol: string) => boolean;
  
  // Utilities
  reset: () => void;
}

const initialState: Omit<UIState, 'setTheme' | 'toggleSidebar' | 'setSidebarWidth' | 'setRightPanelWidth' | 'setBottomPanelHeight' | 'openModal' | 'closeModal' | 'closeAllModals' | 'setSelectedSymbol' | 'setSelectedPosition' | 'setSelectedOrder' | 'setSearchQuery' | 'updateAssetFilters' | 'resetFilters' | 'toggleFavorite' | 'addFavorite' | 'removeFavorite' | 'updateChartSettings' | 'setChartInterval' | 'setChartType' | 'toggleIndicator' | 'updateNotificationSettings' | 'addNotification' | 'removeNotification' | 'markNotificationRead' | 'clearAllNotifications' | 'getUnreadNotificationCount' | 'isFavorite' | 'reset'> = {
  // Theme & Layout
  theme: UI_CONFIG.DEFAULT_THEME,
  sidebarCollapsed: false,
  sidebarWidth: 280,
  rightPanelWidth: 320,
  bottomPanelHeight: 300,
  
  // Favorites
  favoriteSymbols: [...POPULAR_SYMBOLS],
  
  // Chart Settings
  chartSettings: {
    interval: CHART_CONFIG.DEFAULT_INTERVAL,
    chartType: 'candlestick',
    indicators: ['MA20', 'MA50'],
    showVolume: true,
    showOrderBook: true,
    theme: UI_CONFIG.DEFAULT_THEME,
  },
  
  // Notifications
  notifications: {
    orderFilled: true,
    positionClosed: true,
    priceAlerts: true,
    riskWarnings: true,
    systemUpdates: false,
  },
  
  // Locale
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  
  // Modal state
  modals: {
    orderForm: false,
    positionDetails: false,
    settings: false,
    about: false,
  },
  
  // Selections
  selectedSymbol: 'BTC-USD', // Default to BTC-USD
  selectedPosition: null,
  selectedOrder: null,
  
  // Search & Filters
  searchQuery: '',
  assetFilters: {
    type: 'all',
    minVolume: 0,
    showOnlyFavorites: false,
    sortBy: 'symbol',
    sortOrder: 'asc',
  },
  
  // Notifications array
  notifications: [],
};

export const useUIStore = createStore<UIState>(
    (set, get) => ({
      ...initialState,
      
      // Theme & Appearance
      setTheme: (theme) => {
        set((state) => {
          state.theme = theme;
          state.chartSettings.theme = theme;
          
          // Apply theme to document
          if (typeof window !== 'undefined') {
            const root = window.document.documentElement;
            
            if (theme === 'system') {
              const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
                ? 'dark' 
                : 'light';
              root.classList.toggle('dark', systemTheme === 'dark');
            } else {
              root.classList.toggle('dark', theme === 'dark');
            }
          }
        });
      },
      
      toggleSidebar: () => {
        set((state) => {
          state.sidebarCollapsed = !state.sidebarCollapsed;
        });
      },
      
      setSidebarWidth: (width) => {
        set((state) => {
          state.sidebarWidth = Math.max(200, Math.min(400, width));
        });
      },
      
      setRightPanelWidth: (width) => {
        set((state) => {
          state.rightPanelWidth = Math.max(250, Math.min(500, width));
        });
      },
      
      setBottomPanelHeight: (height) => {
        set((state) => {
          state.bottomPanelHeight = Math.max(200, Math.min(600, height));
        });
      },
      
      // Modals
      openModal: (modal) => {
        set((state) => {
          state.modals[modal] = true;
        });
      },
      
      closeModal: (modal) => {
        set((state) => {
          state.modals[modal] = false;
        });
      },
      
      closeAllModals: () => {
        set((state) => {
          Object.keys(state.modals).forEach(modal => {
            state.modals[modal as keyof typeof state.modals] = false;
          });
        });
      },
      
      // Selections
      setSelectedSymbol: (symbol) => {
        set((state) => {
          state.selectedSymbol = symbol;
        });
      },
      
      setSelectedPosition: (positionId) => {
        set((state) => {
          state.selectedPosition = positionId;
        });
      },
      
      setSelectedOrder: (orderId) => {
        set((state) => {
          state.selectedOrder = orderId;
        });
      },
      
      // Search & Filters
      setSearchQuery: (query) => {
        set((state) => {
          state.searchQuery = query;
        });
      },
      
      updateAssetFilters: (filters) => {
        set((state) => {
          Object.assign(state.assetFilters, filters);
        });
      },
      
      resetFilters: () => {
        set((state) => {
          state.assetFilters = {
            type: 'all',
            minVolume: 0,
            showOnlyFavorites: false,
            sortBy: 'symbol',
            sortOrder: 'asc',
          };
          state.searchQuery = '';
        });
      },
      
      // Favorites
      toggleFavorite: (symbol) => {
        set((state) => {
          const index = state.favoriteSymbols.indexOf(symbol);
          if (index >= 0) {
            state.favoriteSymbols.splice(index, 1);
          } else {
            state.favoriteSymbols.push(symbol);
          }
        });
      },
      
      addFavorite: (symbol) => {
        set((state) => {
          if (!state.favoriteSymbols.includes(symbol)) {
            state.favoriteSymbols.push(symbol);
          }
        });
      },
      
      removeFavorite: (symbol) => {
        set((state) => {
          const index = state.favoriteSymbols.indexOf(symbol);
          if (index >= 0) {
            state.favoriteSymbols.splice(index, 1);
          }
        });
      },
      
      // Chart Settings
      updateChartSettings: (settings) => {
        set((state) => {
          Object.assign(state.chartSettings, settings);
        });
      },
      
      setChartInterval: (interval) => {
        set((state) => {
          state.chartSettings.interval = interval;
        });
      },
      
      setChartType: (type) => {
        set((state) => {
          state.chartSettings.chartType = type;
        });
      },
      
      toggleIndicator: (indicator) => {
        set((state) => {
          const indicators = state.chartSettings.indicators;
          const index = indicators.indexOf(indicator);
          
          if (index >= 0) {
            indicators.splice(index, 1);
          } else {
            indicators.push(indicator);
          }
        });
      },
      
      // Notification Settings
      updateNotificationSettings: (settings) => {
        set((state) => {
          Object.assign(state.notifications, settings);
        });
      },
      
      addNotification: (notification) => {
        set((state) => {
          const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          state.notifications.push({
            ...notification,
            id,
            timestamp: Date.now(),
            read: false,
          });
          
          // Auto-remove non-persistent notifications after duration
          if (!notification.persistent) {
            setTimeout(() => {
              get().removeNotification(id);
            }, UI_CONFIG.TOAST_DURATION);
          }
        });
      },
      
      removeNotification: (id) => {
        set((state) => {
          const index = state.notifications.findIndex(n => n.id === id);
          if (index >= 0) {
            state.notifications.splice(index, 1);
          }
        });
      },
      
      markNotificationRead: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification) {
            notification.read = true;
          }
        });
      },
      
      clearAllNotifications: () => {
        set((state) => {
          state.notifications = [];
        });
      },
      
      // Computed
      getUnreadNotificationCount: () => {
        return get().notifications.filter(n => !n.read).length;
      },
      
      isFavorite: (symbol) => {
        return get().favoriteSymbols.includes(symbol);
      },
      
      // Utilities
      reset: () => {
        set(() => ({
          ...initialState,
          favoriteSymbols: [...POPULAR_SYMBOLS],
          notifications: [],
        }));
      },
    }),
    {
      name: 'ui-store',
      persist: {
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          sidebarWidth: state.sidebarWidth,
          rightPanelWidth: state.rightPanelWidth,
          bottomPanelHeight: state.bottomPanelHeight,
          favoriteSymbols: state.favoriteSymbols,
          chartSettings: state.chartSettings,
          notifications: state.notifications,
          language: state.language,
          timezone: state.timezone,
          assetFilters: state.assetFilters,
        }),
      },
    }
  );