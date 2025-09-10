// Core Asset Types
export interface Asset {
  symbol: string;
  name: string;
  type: 'spot' | 'perpetual';
  baseAsset: string;
  quoteAsset: string;
  minSize: number;
  maxSize: number;
  tickSize: number;
  leverage?: number;
  marginTiers?: MarginTier[];
  
  // Enhanced metadata
  tradingEnabled: boolean;
  category: string;
  tags: string[];
  icon?: string;
  
  // API-specific fields for spot markets
  apiSymbol?: string; // The @index symbol used by API
  spotIndex?: number; // The index for spot markets
}

export interface MarginTier {
  bracket: number;
  initialMarginFr: string;
  maintenanceMarginFr: string;
  maxNotional: string;
}

// Market Data Types
export interface PriceData {
  symbol: string;
  price: number;
  change24h?: number;
  changePercent24h?: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
  marketCap?: number;
  bid?: number;
  ask?: number;
  spread?: number;
  timestamp: number;
  priceHistory?: Array<{ price: number; timestamp: number }>;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Hyperliquid API Response Types
export interface HyperliquidAllMids {
  [symbol: string]: string;
}

export interface HyperliquidMeta {
  universe: HyperliquidPerpetual[];
}

export interface HyperliquidPerpetual {
  name: string;
  szDecimals: number;
  pxDecimals: number;
  maxLeverage: number;
  marginTiers: MarginTier[];
}

export interface HyperliquidSpotMeta {
  universe: HyperliquidSpotMarket[];
  tokens: HyperliquidToken[];
}

export interface HyperliquidSpotMarket {
  name: string;
  tokens: [string, string]; // [base, quote]
  index: number;
  isCanonical?: boolean;
}

export interface HyperliquidToken {
  name: string;
  szDecimals: number;
  weiDecimals: number;
  index: number;
  tokenId: string;
  isCanonical?: boolean;
}

export interface HyperliquidL2Book {
  coin: string;
  levels: [OrderBookRawLevel[], OrderBookRawLevel[]]; // [bids, asks]
  time: number;
}

export interface OrderBookRawLevel {
  px: string;
  sz: string;
  n: number;
}

// Enhanced Market Statistics
export interface MarketStatistics {
  totalMarketCap: number;
  total24hVolume: number;
  totalAssets: number;
  gainersCount: number;
  losersCount: number;
  topGainer: string;
  topLoser: string;
  lastUpdated: number;
}

export interface AssetWithMarketData extends Asset {
  priceData?: PriceData;
  marketRank?: number;
  isGainer?: boolean;
  isLoser?: boolean;
}

// API State Types
export interface AsyncState {
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

export interface APIResponse<T = any> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: number;
}

// Enhanced Asset Categories
export interface AssetCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  count?: number;
}

// Search and Filter Types
export interface AssetSearchFilters {
  query: string;
  type: 'all' | 'spot' | 'perpetual';
  category: string;
  minVolume: number;
  maxPrice: number;
  minPrice: number;
  showOnlyFavorites: boolean;
  sortBy: 'symbol' | 'price' | 'change' | 'volume' | 'marketCap' | 'name';
  sortOrder: 'asc' | 'desc';
  tags: string[];
}

// Comprehensive Market Data for Enhanced API
export interface HyperliquidMetaAndAssetCtxs {
  meta: HyperliquidMeta;
  assetCtxs: HyperliquidAssetContext[];
  spotMeta?: HyperliquidSpotMeta;
}

export interface HyperliquidAssetContext {
  coin: string;
  markPx: string;
  midPx?: string;
  prevDayPx: string;
  volume24h: string;
  openInterest?: string;
  fundingRate?: string;
}

// Trading Types (referenced in API)
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
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  timestamp: number;
  filledPrice?: number;
  filledSize?: number;
  filledAt?: number;
  reason?: string;
  reduceOnly?: boolean;
  postOnly?: boolean;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

// Utility Types
export type AssetType = 'spot' | 'perpetual';
export type SortDirection = 'asc' | 'desc';
export type AssetSortField = 'symbol' | 'price' | 'change' | 'volume' | 'marketCap' | 'name';

// Error Types
export interface HyperliquidAPIError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

// WebSocket Types
export interface WebSocketMessage {
  channel: string;
  data: any;
  timestamp?: number;
}

export interface WebSocketSubscription {
  type: string;
  coin?: string;
  user?: string;
}

// Trading Types (Complete definitions)
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
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface RiskMetrics {
  riskAmount: number;
  riskPercentage: number;
  liquidationPrice: number;
  marginLevel: number;
  freeMargin: number;
}

// Portfolio Analytics Types
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

export interface PerformanceHistory {
  timestamp: number;
  balance: number;
  pnl: number;
  equity: number;
}

// UI and Preference Types
export interface ChartSettings {
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';
  chartType: 'candlestick' | 'line' | 'area';
  indicators: string[];
  showVolume: boolean;
  showOrderBook: boolean;
  theme: 'light' | 'dark' | 'system';
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

// Search and Suggestion Types
export interface SearchSuggestion {
  symbol: string;
  name: string;
  type: 'asset' | 'category' | 'tag';
  relevance: number;
}

// WebSocket Connection Types
export interface WebSocketConnectionState {
  connected: boolean;
  connecting: boolean;
  reconnectAttempts: number;
  lastError: string | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  latency: number;
  subscriptions: Set<string>;
}

// Advanced Trading Types
export interface TradingConfig {
  DEFAULT_BALANCE: number;
  DEFAULT_LEVERAGE: number;
  MAX_LEVERAGE: number;
  MIN_ORDER_SIZE: number;
  MAX_ORDER_SIZE: number;
  RISK_WARNING_THRESHOLD: number;
  MARGIN_CALL_THRESHOLD: number;
}

export interface LeverageSettings {
  symbol: string;
  maxLeverage: number;
  currentLeverage: number;
  marginTiers: MarginTier[];
}

// Enhanced Order Types
export interface OrderExecution {
  orderId: string;
  symbol: string;
  executionPrice: number;
  executionSize: number;
  fees: number;
  timestamp: number;
}

// Market Data Enhancement
export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  type: 'above' | 'below';
  active: boolean;
  triggered: boolean;
  createdAt: number;
  triggeredAt?: number;
}

// API Integration Types
export interface APIRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// Performance and Analytics
export interface TradeAnalytics {
  symbol: string;
  totalTrades: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  totalVolume: number;
  avgHoldTime: number;
}

export interface SystemPerformance {
  memoryUsage: number;
  priceUpdateLatency: number;
  orderExecutionTime: number;
  websocketLatency: number;
  apiResponseTime: number;
}

// Utility Types for Store State
export type StoreStatus = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingState {
  status: StoreStatus;
  error: string | null;
  lastUpdated: number | null;
}

// Re-export commonly used types
export type OrderType = Order['type'];
export type OrderStatus = Order['status'];
export type OrderSide = Order['side'];
export type PositionSide = Position['side'];
export type PositionStatus = Position['status'];
export type TransactionType = Transaction['type'];
export type Theme = UIPreferences['theme'];
export type ChartInterval = ChartSettings['interval'];
export type ChartType = ChartSettings['chartType'];