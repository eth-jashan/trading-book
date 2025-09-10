// API Configuration
export const API_CONFIG = {
  HYPERLIQUID: {
    BASE_URL: 'https://api.hyperliquid.xyz',
    WS_URL: 'wss://api.hyperliquid.xyz/ws',
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
  },
} as const;

// WebSocket Configuration
export const WS_CONFIG = {
  HYPERLIQUID_WS_URL: 'wss://api.hyperliquid.xyz/ws',
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  PING_INTERVAL: 30000,
  MAX_RECONNECT_DELAY: 30000,
  CONNECTION_TIMEOUT: 10000,
} as const;

// Trading Configuration
export const TRADING_CONFIG = {
  DEFAULT_LEVERAGE: 1,
  MAX_LEVERAGE: 50,
  MIN_ORDER_SIZE: 0.001,
  DEFAULT_BALANCE: 100000, // Paper trading balance
  SLIPPAGE_TOLERANCE: 0.001, // 0.1%
  MAX_OPEN_POSITIONS: 50,
  RISK_WARNING_THRESHOLD: 0.8, // 80% of balance
} as const;

// Chart Configuration
export const CHART_CONFIG = {
  DEFAULT_INTERVAL: '1h',
  INTERVALS: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const,
  CHART_TYPES: ['candlestick', 'line', 'area'] as const,
  MAX_CANDLES: 1000,
  UPDATE_FREQUENCY: 1000, // 1 second
} as const;

// UI Configuration
export const UI_CONFIG = {
  THEMES: ['light', 'dark', 'system'] as const,
  DEFAULT_THEME: 'dark',
  ANIMATION_DURATION: 200,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  TOAST_DURATION: 4000,
} as const;

// Order Types
export const ORDER_TYPES = ['market', 'limit', 'stop', 'stop-limit'] as const;
export const ORDER_SIDES = ['buy', 'sell'] as const;
export const ORDER_STATUS = ['pending', 'filled', 'cancelled', 'rejected', 'partial'] as const;
export const TIME_IN_FORCE = ['GTC', 'IOC', 'FOK'] as const;

// Position Types
export const POSITION_SIDES = ['long', 'short'] as const;
export const POSITION_STATUS = ['open', 'closed'] as const;

// Asset Types
export const ASSET_TYPES = ['spot', 'perpetual'] as const;

// Popular trading pairs
export const POPULAR_SYMBOLS = [
  'BTC',
  'ETH', 
  'SOL',
  'AVAX',
  'ATOM',
  'NEAR',
  'APT',
  'ARB',
  'OP',
  'MATIC',
] as const;

// Color Palette
export const COLORS = {
  SUCCESS: '#00D964',
  DANGER: '#FF3B30',
  WARNING: '#FF9500',
  INFO: '#007AFF',
  NEUTRAL: '#8E8E93',
  
  // Chart colors
  CHART: {
    BULLISH: '#00D964',
    BEARISH: '#FF3B30',
    VOLUME: '#8E8E93',
    GRID: '#2C2C2E',
    BACKGROUND: '#1C1C1E',
  },
} as const;

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// LocalStorage Keys
export const STORAGE_KEYS = {
  TRADING_STORE: 'trading-storage',
  UI_PREFERENCES: 'ui-preferences',
  PORTFOLIO_STORAGE: 'portfolio-storage',
  ASSETS_STORAGE: 'assets-storage',
  CHART_SETTINGS: 'chart-settings',
} as const;

// Error Codes
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  WS_CONNECTION_FAILED: 'WS_CONNECTION_FAILED',
  INVALID_ORDER: 'INVALID_ORDER',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  MARKET_CLOSED: 'MARKET_CLOSED',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  ORDER_FILLED: 'order_filled',
  POSITION_CLOSED: 'position_closed',
  PRICE_ALERT: 'price_alert',
  RISK_WARNING: 'risk_warning',
  SYSTEM_UPDATE: 'system_update',
  CONNECTION_STATUS: 'connection_status',
} as const;

// Performance Metrics
export const PERFORMANCE_METRICS = {
  UPDATE_FREQUENCY: 5000, // 5 seconds
  HISTORY_RETENTION: 1000, // Keep last 1000 snapshots
  CHART_DATA_POINTS: 100,
} as const;

// Risk Management
export const RISK_LEVELS = {
  LOW: 0.25,
  MEDIUM: 0.5,
  HIGH: 0.75,
  EXTREME: 0.9,
} as const;

// Market Data
export const MARKET_DATA = {
  PRICE_PRECISION: 8,
  VOLUME_PRECISION: 4,
  PERCENTAGE_PRECISION: 2,
  UPDATE_THROTTLE: 100, // 100ms
} as const;

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  BUY: 'KeyB',
  SELL: 'KeyS',
  CLOSE_ALL: 'KeyC',
  SEARCH: 'KeyF',
  SETTINGS: 'KeyP',
  TOGGLE_SIDEBAR: 'KeyT',
} as const;

// Feature Flags (for progressive enhancement)
export const FEATURE_FLAGS = {
  ADVANCED_CHARTS: true,
  OPTIONS_TRADING: false,
  SOCIAL_TRADING: false,
  NEWS_FEED: false,
  PORTFOLIO_ANALYTICS: true,
} as const;

// Development/Debug
export const DEBUG = {
  ENABLED: process.env.NODE_ENV === 'development',
  LOG_WEBSOCKET: process.env.NODE_ENV === 'development',
  LOG_STORE_ACTIONS: process.env.NODE_ENV === 'development',
} as const;