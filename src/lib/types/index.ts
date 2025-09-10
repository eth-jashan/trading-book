// Core trading types
export interface Asset {
  symbol: string;
  name: string;
  type: 'spot' | 'perpetual';
  baseAsset: string;
  quoteAsset: string;
  minSize: number;
  maxSize: number;
  tickSize: number;
  marginTiers?: MarginTier[];
  leverage?: number;
  
  // Additional metadata for discovery
  category?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  whitepaper?: string;
  tags?: string[];
  
  // Trading specifications
  tradingEnabled?: boolean;
  maintenanceMargin?: number;
  fundingRate?: number;
  
  // Market statistics (may be populated from market data)
  marketCap?: number;
  circulatingSupply?: number;
  totalSupply?: number;
}

// Asset search and filtering types
export interface AssetSearchFilters {
  type: 'all' | 'spot' | 'perpetual';
  minVolume: number;
  showOnlyFavorites: boolean;
  sortBy: 'symbol' | 'price' | 'change' | 'volume' | 'name' | 'marketcap';
  sortOrder: 'asc' | 'desc';
  searchQuery: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

// Asset with market data combined
export interface AssetWithMarketData extends Asset {
  priceData?: PriceData;
  priceHistory?: Array<{ price: number; timestamp: number }>;
  orderBook?: OrderBook;
  isFavorite: boolean;
  
  // Computed fields
  marketValue?: number;
  priceChange24h?: number;
  priceChangePercent24h?: number;
  volume24h?: number;
}

export interface MarginTier {
  notionalFloor: number;
  notionalCap: number;
  maintenanceMarginRate: number;
  maxLeverage: number;
}

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
  bid?: number;
  ask?: number;
  spread?: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total?: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  margin: number;
  leverage: number;
  pnl: number;
  pnlPercentage: number;
  timestamp: number;
  status: 'open' | 'closed';
  stopLoss?: number;
  takeProfit?: number;
  closedAt?: number;
  closedPrice?: number;
  realizedPnl?: number;
  liquidationPrice?: number;
}

export interface Order {
  id: string;
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop-limit';
  side: 'buy' | 'sell';
  size: number;
  price?: number;
  stopPrice?: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partial';
  timestamp: number;
  filledPrice?: number;
  filledSize?: number;
  filledAt?: number;
  reason?: string;
  reduceOnly?: boolean;
  postOnly?: boolean;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  clientOrderId?: string;
}

export interface Balance {
  total: number;
  available: number;
  margin: number;
  unrealizedPnl: number;
  realizedPnl: number;
  marginLevel: number;
  freeMargin: number;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'fee' | 'funding' | 'realized_pnl';
  amount: number;
  balance: number;
  timestamp: number;
  description: string;
  relatedOrderId?: string;
  relatedPositionId?: string;
  fee?: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalPnL: number;
  totalPnLPercentage: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export interface PerformanceSnapshot {
  timestamp: number;
  balance: number;
  pnl: number;
  equity: number;
  positions: number;
  drawdown: number;
}

export interface RiskMetrics {
  riskAmount: number;
  riskPercentage: number;
  liquidationPrice: number;
  marginLevel: number;
  freeMargin: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// WebSocket types
export interface WebSocketMessage {
  channel: string;
  data: unknown;
  timestamp: number;
}

export interface WebSocketSubscription {
  id: string;
  type: 'allMids' | 'l2Book' | 'trades' | 'candle';
  params?: Record<string, unknown>;
}

export interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  reconnectAttempts: number;
  lastError?: string;
  latency: number;
  subscriptions: Set<string>;
}

// UI types
export interface ChartSettings {
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';
  chartType: 'candlestick' | 'line' | 'area';
  indicators: string[];
  showVolume: boolean;
  showOrderBook: boolean;
  theme: 'light' | 'dark';
}

export interface NotificationSettings {
  orderFilled: boolean;
  positionClosed: boolean;
  priceAlerts: boolean;
  riskWarnings: boolean;
  systemUpdates: boolean;
}

export interface UIPreferences {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  favoriteSymbols: string[];
  chartSettings: ChartSettings;
  notifications: NotificationSettings;
  language: string;
  timezone: string;
}

// API Response types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface HyperliquidAllMids {
  [symbol: string]: string;
}

export interface HyperliquidMeta {
  universe: Array<{
    name: string;
    szDecimals: number;
    pxDecimals: number;
    maxLeverage: number;
    marginTiers?: MarginTier[];
  }>;
}

export interface HyperliquidSpotMeta {
  universe?: Array<{
    name?: string;
    tokens: [string, string];
  }>;
}

export interface HyperliquidL2Book {
  coin: string;
  levels: [OrderBookLevel[], OrderBookLevel[]]; // [bids, asks]
  time: number;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
}

// Store types
export interface StoreState {
  loading: boolean;
  error: AppError | null;
  lastUpdated: number;
}

// Asset discovery types
export interface AssetDiscoveryState {
  searchQuery: string;
  filters: AssetSearchFilters;
  results: AssetWithMarketData[];
  favorites: Set<string>;
  recentlyViewed: string[];
  searchHistory: string[];
  selectedAsset: Asset | null;
  loading: boolean;
  error: string | null;
}

// Search suggestion types
export interface SearchSuggestion {
  type: 'asset' | 'category' | 'history';
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

// Asset category definitions
export interface AssetCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  assets: string[];
}

// Common utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T = unknown> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
}

// Search result types
export interface SearchResultItem extends AssetWithMarketData {
  relevanceScore?: number;
  matchedFields?: string[];
  highlightedText?: string;
}

// Virtual list item for performance
export interface VirtualListItem {
  index: number;
  data: AssetWithMarketData;
  height: number;
}