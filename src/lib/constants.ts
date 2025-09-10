// UI Configuration
export const UI_CONFIG = {
  DEFAULT_THEME: 'dark' as const,
  TOAST_DURATION: 5000,
  SIDEBAR_MIN_WIDTH: 200,
  SIDEBAR_MAX_WIDTH: 400,
  SIDEBAR_DEFAULT_WIDTH: 280,
  RIGHT_PANEL_MIN_WIDTH: 250,
  RIGHT_PANEL_MAX_WIDTH: 500,
  RIGHT_PANEL_DEFAULT_WIDTH: 320,
  BOTTOM_PANEL_MIN_HEIGHT: 200,
  BOTTOM_PANEL_MAX_HEIGHT: 600,
  BOTTOM_PANEL_DEFAULT_HEIGHT: 300,
  SEARCH_DEBOUNCE_MS: 300,
  ANIMATION_DURATION: 150,
  VIRTUAL_LIST_ITEM_HEIGHT: 72,
  VIRTUAL_LIST_ITEM_HEIGHT_COMPACT: 56,
} as const;

// Chart Configuration
export const CHART_CONFIG = {
  DEFAULT_INTERVAL: '1h' as const,
  INTERVALS: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const,
  CHART_TYPES: ['candlestick', 'line', 'area'] as const,
  DEFAULT_INDICATORS: ['MA20', 'MA50'],
  PRICE_HISTORY_LIMIT: 100,
  SPARKLINE_POINTS: 24,
  COLORS: {
    GREEN: '#10B981',
    RED: '#EF4444',
    BLUE: '#3B82F6',
    YELLOW: '#F59E0B',
    PURPLE: '#8B5CF6',
    GRAY: '#6B7280',
  },
} as const;

// Popular trading symbols
export const POPULAR_SYMBOLS = [
  'BTC-USD',
  'ETH-USD',
  'SOL-USD',
  'AVAX-USD',
  'MATIC-USD',
] as const;

// Asset categories
export const ASSET_CATEGORIES = {
  MAJOR: {
    id: 'major',
    name: 'Major',
    description: 'Bitcoin and Ethereum',
    icon: '⭐',
    color: '#FFD700'
  },
  LAYER1: {
    id: 'layer1',
    name: 'Layer 1',
    description: 'Blockchain protocols',
    icon: '🏗️',
    color: '#4F46E5'
  },
  DEFI: {
    id: 'defi',
    name: 'DeFi',
    description: 'Decentralized Finance',
    icon: '🏦',
    color: '#10B981'
  },
  GAMING: {
    id: 'gaming',
    name: 'Gaming',
    description: 'Gaming and Metaverse',
    icon: '🎮',
    color: '#F59E0B'
  },
  MEME: {
    id: 'meme',
    name: 'Meme',
    description: 'Community tokens',
    icon: '🐕',
    color: '#EF4444'
  },
  OTHER: {
    id: 'other',
    name: 'Other',
    description: 'Other cryptocurrencies',
    icon: '📊',
    color: '#6B7280'
  }
} as const;

// API Configuration
export const API_CONFIG = {
  HYPERLIQUID_BASE_URL: 'https://api.hyperliquid.xyz',
  HYPERLIQUID_WS_URL: 'wss://api.hyperliquid.xyz/ws',
  REQUEST_TIMEOUT: 10000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  BATCH_SIZE: 50,
} as const;

// WebSocket Configuration
export const WS_CONFIG = {
  HYPERLIQUID_WS_URL: 'wss://api.hyperliquid.xyz/ws',
  RECONNECT_INTERVAL: 5000,
  RECONNECT_DELAY: 1000,
  MAX_RECONNECT_DELAY: 30000,
  RECONNECT_ATTEMPTS: 10,
  MAX_RECONNECT_ATTEMPTS: 10,
  PING_INTERVAL: 30000,
  CONNECTION_TIMEOUT: 10000,
  SUBSCRIPTION_TIMEOUT: 5000,
} as const;

// Trading Configuration
export const TRADING_CONFIG = {
  DEFAULT_BALANCE: 100000, // $100k paper money
  DEFAULT_LEVERAGE: 1,
  MAX_LEVERAGE: 50,
  MIN_ORDER_SIZE: 0.001,
  MAX_ORDER_SIZE: 1000000,
  DEFAULT_SLIPPAGE: 0.5, // 0.5%
  POSITION_SIZE_STEPS: [0.25, 0.5, 0.75, 1.0], // 25%, 50%, 75%, 100%
  RISK_LEVELS: {
    LOW: { percentage: 1, color: '#10B981' },
    MEDIUM: { percentage: 2, color: '#F59E0B' },
    HIGH: { percentage: 5, color: '#EF4444' },
  },
  ORDER_TYPES: ['market', 'limit', 'stop', 'stop-limit'] as const,
  TIME_IN_FORCE: ['GTC', 'IOC', 'FOK'] as const,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  UI_PREFERENCES: 'ui-store',
  TRADING_DATA: 'trading-storage',
  ASSETS_DATA: 'assets-storage',
  PORTFOLIO_DATA: 'portfolio-storage',
  WEBSOCKET_SUBSCRIPTIONS: 'websocket-subscriptions',
  SEARCH_HISTORY: 'search-history',
  FAVORITES: 'favorites',
  RECENT_ASSETS: 'recent-assets',
} as const;

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  VIRTUAL_LIST_OVERSCAN: 5,
  DEBOUNCE_SEARCH: 300,
  DEBOUNCE_RESIZE: 100,
  DEBOUNCE_SCROLL: 50,
  BATCH_UPDATE_INTERVAL: 100,
  MAX_HISTORY_ITEMS: 1000,
  MAX_SEARCH_HISTORY: 10,
  MAX_RECENT_ITEMS: 20,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
  API_ERROR: 'Unable to fetch data from the server. Please try again later.',
  WEBSOCKET_ERROR: 'Real-time connection lost. Attempting to reconnect...',
  VALIDATION_ERROR: 'Please check your input and try again.',
  INSUFFICIENT_BALANCE: 'Insufficient balance for this transaction.',
  INVALID_ORDER_SIZE: 'Order size is outside the allowed range.',
  MARKET_CLOSED: 'Market is currently closed.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  ORDER_PLACED: 'Order placed successfully',
  ORDER_CANCELLED: 'Order cancelled successfully',
  POSITION_CLOSED: 'Position closed successfully',
  FAVORITE_ADDED: 'Added to favorites',
  FAVORITE_REMOVED: 'Removed from favorites',
  SETTINGS_SAVED: 'Settings saved successfully',
  DATA_EXPORTED: 'Data exported successfully',
  COPIED_TO_CLIPBOARD: 'Copied to clipboard',
} as const;

// Date/Time Formats
export const DATE_FORMATS = {
  SHORT_DATE: 'MMM dd',
  LONG_DATE: 'MMM dd, yyyy',
  SHORT_TIME: 'HH:mm',
  LONG_TIME: 'HH:mm:ss',
  DATETIME: 'MMM dd, HH:mm',
  ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx',
} as const;

// Number Formats
export const NUMBER_FORMATS = {
  PRICE_DECIMALS: 4,
  VOLUME_DECIMALS: 2,
  PERCENTAGE_DECIMALS: 2,
  SIZE_DECIMALS: 8,
  PNL_DECIMALS: 2,
  LARGE_NUMBER_THRESHOLD: 1000,
} as const;

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  SEARCH: 'cmd+k',
  NEW_ORDER: 'cmd+enter',
  CLOSE_POSITION: 'cmd+shift+c',
  TOGGLE_SIDEBAR: 'cmd+b',
  TOGGLE_THEME: 'cmd+shift+t',
  REFRESH_DATA: 'cmd+r',
  EXPORT_DATA: 'cmd+e',
  FOCUS_SEARCH: '/',
  ESCAPE: 'escape',
} as const;

// Breakpoints for responsive design
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536,
} as const;

// Z-Index values
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1010,
  OVERLAY: 1020,
  MODAL: 1030,
  POPOVER: 1040,
  TOOLTIP: 1050,
  TOAST: 1060,
} as const;

// Animation Easing
export const EASING = {
  EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
  EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
  BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// Comprehensive asset icons mapping
export const ASSET_ICONS: Record<string, string> = {
  // Major cryptocurrencies
  BTC: '₿',
  ETH: 'Ξ',
  
  // Layer 1 protocols
  SOL: '◎',
  ADA: '₳',
  DOT: '●',
  AVAX: '🔺',
  ATOM: '⚛️',
  NEAR: 'Ⓝ',
  ALGO: '○',
  ONE: '1️⃣',
  LUNA: '🌙',
  EGLD: '⚡',
  
  // Layer 2 & Scaling
  MATIC: '💜',
  ARB: '🔵',
  OP: '🔴',
  IMX: '🎮',
  LRC: '🔄',
  
  // DeFi tokens
  UNI: '🦄',
  AAVE: '👻',
  COMP: '🏛️',
  MKR: '🔴',
  SNX: '📊',
  YFI: '💙',
  SUSHI: '🍣',
  CAKE: '🥞',
  CRV: '🌊',
  BAL: '⚖️',
  
  // Exchange tokens
  BNB: '🟡',
  CRO: '💎',
  KCS: '🔷',
  HT: '🔥',
  LEO: '🦁',
  
  // Smart contract platforms
  LINK: '🔗',
  VET: '💚',
  THETA: 'θ',
  NEO: '🟢',
  EOS: '⚫',
  TRX: '🔺',
  
  // Privacy coins
  XMR: '🕶️',
  ZEC: '🛡️',
  DASH: '💨',
  
  // Payment & Transfer
  XRP: '💧',
  XLM: '⭐',
  LTC: 'Ł',
  BCH: '₿',
  
  // Gaming & NFT
  AXS: '🎮',
  MANA: '🌐',
  SAND: '🏖️',
  ENJ: '🎯',
  GALA: '🎪',
  FLOW: '🌊',
  APE: '🐵',
  
  // Meme coins
  DOGE: '🐕',
  SHIB: '🐶',
  PEPE: '🐸',
  FLOKI: '🐕‍🦺',
  
  // Enterprise & Business
  XTZ: '🔵',
  HBAR: 'ħ',
  IOTA: '○',
  
  // Other popular tokens
  FTM: '👻',
  RUNE: 'ᚱ',
  KAVA: '🌿',
  OSMO: '🧪',
  JUNO: '🪐',
  SCRT: '🤫',
  
  // Stablecoins
  USDT: '💵',
  USDC: '💵',
  BUSD: '💵',
  DAI: '💰',
  FRAX: '💱',
  
  // Wrapped tokens
  WBTC: '₿',
  WETH: 'Ξ',
  WBNB: '🟡',
  
  // Default fallback
  DEFAULT: '💰',
} as const;

// Enhanced asset categories with counts and metadata
export const ENHANCED_ASSET_CATEGORIES = {
  MAJOR: {
    id: 'major',
    name: 'Major',
    description: 'Bitcoin and Ethereum - the foundational cryptocurrencies',
    icon: '⭐',
    color: '#FFD700',
    bgColor: '#FFF9E6',
    assets: ['BTC', 'ETH'],
    priority: 1,
  },
  LAYER1: {
    id: 'layer1',
    name: 'Layer 1',
    description: 'Base blockchain protocols and networks',
    icon: '🏗️',
    color: '#4F46E5',
    bgColor: '#EEF2FF',
    assets: ['SOL', 'ADA', 'DOT', 'AVAX', 'ATOM', 'NEAR', 'ALGO', 'ONE'],
    priority: 2,
  },
  LAYER2: {
    id: 'layer2',
    name: 'Layer 2',
    description: 'Scaling solutions and sidechains',
    icon: '⚡',
    color: '#7C3AED',
    bgColor: '#F3E8FF',
    assets: ['MATIC', 'ARB', 'OP', 'IMX', 'LRC'],
    priority: 3,
  },
  DEFI: {
    id: 'defi',
    name: 'DeFi',
    description: 'Decentralized Finance protocols',
    icon: '🏦',
    color: '#10B981',
    bgColor: '#ECFDF5',
    assets: ['UNI', 'AAVE', 'COMP', 'MKR', 'SNX', 'YFI', 'SUSHI', 'CAKE'],
    priority: 4,
  },
  GAMING: {
    id: 'gaming',
    name: 'Gaming',
    description: 'Gaming, Metaverse and NFT platforms',
    icon: '🎮',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    assets: ['AXS', 'MANA', 'SAND', 'ENJ', 'GALA', 'FLOW', 'APE'],
    priority: 5,
  },
  EXCHANGE: {
    id: 'exchange',
    name: 'Exchange',
    description: 'Exchange and trading platform tokens',
    icon: '🏢',
    color: '#059669',
    bgColor: '#ECFDF5',
    assets: ['BNB', 'CRO', 'KCS', 'HT', 'LEO'],
    priority: 6,
  },
  MEME: {
    id: 'meme',
    name: 'Meme',
    description: 'Community-driven meme tokens',
    icon: '🐕',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    assets: ['DOGE', 'SHIB', 'PEPE', 'FLOKI'],
    priority: 7,
  },
  STABLE: {
    id: 'stable',
    name: 'Stablecoin',
    description: 'Price-stable cryptocurrencies',
    icon: '💵',
    color: '#6B7280',
    bgColor: '#F9FAFB',
    assets: ['USDT', 'USDC', 'BUSD', 'DAI', 'FRAX'],
    priority: 8,
  },
  OTHER: {
    id: 'other',
    name: 'Other',
    description: 'Other cryptocurrencies and tokens',
    icon: '📊',
    color: '#6B7280',
    bgColor: '#F9FAFB',
    assets: [],
    priority: 9,
  }
} as const;

// Debug Configuration
export const DEBUG = {
  ENABLED: process.env.NODE_ENV === 'development',
  LOG_LEVEL: 'info' as const,
  STORE_LOGGING: true,
  API_LOGGING: true,
} as const;

// Market Data Configuration
export const MARKET_DATA = {
  UPDATE_THROTTLE: 1000, // Max candles to keep
  PRICE_PRECISION: 8,
  VOLUME_PRECISION: 4,
  BATCH_SIZE: 50,
  CACHE_TTL: 30000, // 30 seconds
} as const;

// Default asset data for development
export const DEFAULT_ASSETS = [
  {
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    baseAsset: 'BTC',
    quoteAsset: 'USD',
    type: 'perpetual' as const,
    category: 'major',
    tags: ['popular', 'store-of-value'],
  },
  {
    symbol: 'ETH-USD',
    name: 'Ethereum',
    baseAsset: 'ETH',
    quoteAsset: 'USD',
    type: 'perpetual' as const,
    category: 'major',
    tags: ['popular', 'smart-contracts'],
  },
  {
    symbol: 'SOL-USD',
    name: 'Solana',
    baseAsset: 'SOL',
    quoteAsset: 'USD',
    type: 'perpetual' as const,
    category: 'layer1',
    tags: ['popular', 'high-throughput'],
  },
] as const;