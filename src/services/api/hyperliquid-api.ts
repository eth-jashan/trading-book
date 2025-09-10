//@ts-nocheck
import { 
  Asset, 
  HyperliquidAllMids, 
  HyperliquidMeta, 
  HyperliquidSpotMeta, 
  Candle, 
  OrderBook,
  APIResponse 
} from '@/lib/types';
import { useMarketStore } from '@/stores/market/market.store';
import { useUIStore } from '@/stores/ui/ui.store';
import { API_CONFIG } from '@/lib/constants';
import { CandleData, HyperliquidCandle, ChartInterval } from '@/types/chart.types';
import { useCallback } from 'react';

// Utility function to convert display symbols (BTC-USD) to API symbols (BTC)
const convertSymbolForAPI = (displaySymbol: string): string => {
  // Remove the quote currency part (e.g., 'BTC-USD' -> 'BTC')
  return displaySymbol.split('-')[0];
};

class HyperliquidAPIService {
  private baseURL = API_CONFIG.HYPERLIQUID_BASE_URL;
  private timeout = API_CONFIG.REQUEST_TIMEOUT;
  private lastRequestTime = 0;
  private minRequestInterval = 30000; // 30 seconds minimum between requests
  private chartDataCache = new Map<string, { data: CandleData[]; timestamp: number }>();
  private cacheExpiry = 60000; // 1 minute cache
  
  /**
   * Generic request method with error handling and rate limiting
   */
  private async request<T>(endpoint: string, payload: Record<string, unknown>): Promise<T> {
    // Rate limiting: ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data as T;
      
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      
      // Add error notification
      useUIStore.getState().addNotification({
        type: 'error',
        title: 'API Error',
        message: error instanceof Error ? error.message : 'Unknown API error',
      });
      
      throw error;
    }
  }
  
  /**
   * Initialize market data - load initial prices and asset metadata
   */
  async initialize(): Promise<void> {
    try {
      const [mids, meta, spotMeta] = await Promise.allSettled([
        this.getAllMids(),
        this.getMeta(),
        this.getSpotMeta(),
      ]);
      
      const marketStore = useMarketStore.getState();
      
      // Process all mids (current prices)
      if (mids.status === 'fulfilled' && mids.value) {
        const prices: Record<string, number> = {};
        Object.entries(mids.value).forEach(([symbol, priceStr]) => {
          prices[symbol] = parseFloat(priceStr as string);
        });
        marketStore.updatePrices(prices);
      }
      
      // Process perpetuals metadata
      if (meta.status === 'fulfilled' && meta.value) {
        // This would typically be stored in an assets store
        console.log('Loaded perpetuals metadata:', meta.value.universe.length, 'assets');
      }
      
      // Process spot metadata
      if (spotMeta.status === 'fulfilled' && spotMeta.value) {
        console.log('Loaded spot metadata:', spotMeta.value.universe?.length || 0, 'assets');
      }
      
      useUIStore.getState().addNotification({
        type: 'success',
        title: 'Market Data Loaded',
        message: 'Initial market data loaded successfully',
      });
      
    } catch (error) {
      console.error('Failed to initialize market data:', error);
      throw error;
    }
  }
  
  /**
   * Get current market prices for all assets
   */
  async getAllMids(): Promise<HyperliquidAllMids> {
    return this.request<HyperliquidAllMids>('/info', {
      type: 'allMids',
    });
  }
  
  /**
   * Get perpetuals contract metadata
   */
  async getMeta(): Promise<HyperliquidMeta> {
    return this.request<HyperliquidMeta>('/info', {
      type: 'meta',
    });
  }
  
  /**
   * Get spot trading pairs metadata
   */
  async getSpotMeta(): Promise<HyperliquidSpotMeta> {
    return this.request<HyperliquidSpotMeta>('/info', {
      type: 'spotMeta',
    });
  }
  
  /**
   * Get order book for a specific asset
   */
  async getL2Book(symbol: string): Promise<OrderBook> {
    const data = await this.request<{
      coin: string;
      levels: [Array<{ px: string; sz: string }>, Array<{ px: string; sz: string }>];
      time: number;
    }>('/info', {
      type: 'l2Book',
      coin: symbol,
    });
    
    const orderBook: OrderBook = {
      symbol: data.coin,
      bids: data.levels[0].map(level => ({
        price: parseFloat(level.px),
        size: parseFloat(level.sz),
      })),
      asks: data.levels[1].map(level => ({
        price: parseFloat(level.px),
        size: parseFloat(level.sz),
      })),
      timestamp: data.time,
    };
    
    // Update market store
    useMarketStore.getState().updateOrderBook(symbol, orderBook);
    
    return orderBook;
  }
  
  /**
   * Get historical candle data
   */
  async getCandleSnapshot(
    symbol: string,
    interval: string,
    startTime: number
  ): Promise<Candle[]> {
    const data = await this.request<Array<{
      t: number;
      o: string;
      h: string;
      l: string;
      c: string;
      v: string;
    }>>('/info', {
      type: 'candleSnapshot',
      req: {
        coin: symbol,
        interval,
        startTime,
      },
    });
    
    const candles: Candle[] = data.map(candle => ({
      timestamp: candle.t,
      open: parseFloat(candle.o),
      high: parseFloat(candle.h),
      low: parseFloat(candle.l),
      close: parseFloat(candle.c),
      volume: parseFloat(candle.v),
    }));
    
    // Update market store
    useMarketStore.getState().updateCandles(symbol, interval, candles);
    
    return candles;
  }

  /**
   * Get candle data formatted for Lightweight Charts with caching
   */
  async getChartCandles(
    symbol: string,
    interval: ChartInterval,
    startTime?: number
  ): Promise<CandleData[]> {
    const apiSymbol = convertSymbolForAPI(symbol);
    
    // Create cache key
    const cacheKey = `${symbol}-${interval}-${startTime}`;
    
    // Check cache first
    const cached = this.chartDataCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      console.log(`Using cached chart data for ${symbol} ${interval}`);
      return cached.data;
    }

    // Calculate default time range if not provided
    const now = Date.now();
    const start = startTime || now - (1000 * 60 * 60 * 24 * 7); // Default to 7 days

    console.log(`Fetching chart data for ${symbol} -> ${apiSymbol} ${interval} (rate limited)`);

    const data = await this.request<HyperliquidCandle[]>('/info', {
      type: 'candleSnapshot',
      req: {
        coin: apiSymbol,
        interval,
        startTime: start,
      },
    });

    // Convert to Lightweight Charts format
    // Note: Lightweight Charts expects time in seconds, not milliseconds
    const chartCandles: CandleData[] = data.map(candle => ({
      time: Math.floor(candle.t / 1000), // Convert to seconds
      open: parseFloat(candle.o),
      high: parseFloat(candle.h),
      low: parseFloat(candle.l),
      close: parseFloat(candle.c),
      volume: parseFloat(candle.v),
    }));

    // Sort by time (ascending order for Lightweight Charts)
    chartCandles.sort((a, b) => a.time - b.time);

    // Cache the result
    this.chartDataCache.set(cacheKey, {
      data: chartCandles,
      timestamp: Date.now()
    });

    return chartCandles;
  }
  
  /**
   * Get recent trades for a symbol
   */
  async getTrades(symbol: string, limit = 100): Promise<Array<{
    price: number;
    size: number;
    timestamp: number;
    side: 'buy' | 'sell';
  }>> {
    const apiSymbol = convertSymbolForAPI(symbol);
    
    const data = await this.request<Array<{
      px: string;
      sz: string;
      time: number;
      side: string;
    }>>('/info', {
      type: 'recentTrades',
      coin: apiSymbol,
      limit,
    });
    
    return data.map(trade => ({
      price: parseFloat(trade.px),
      size: parseFloat(trade.sz),
      timestamp: trade.time,
      side: trade.side === 'A' ? 'buy' : 'sell',
    }));
  }
  
  /**
   * Get 24h statistics for a symbol
   */
  async get24hStats(symbol: string): Promise<{
    volume: number;
    high: number;
    low: number;
    change: number;
    changePercent: number;
  }> {
    // This would be a specific API call if available
    // For now, we'll simulate it with current data
    const marketStore = useMarketStore.getState();
    const priceData = marketStore.getPrice(symbol);
    
    if (!priceData) {
      throw new Error(`No price data available for ${symbol}`);
    }
    
    return {
      volume: priceData.volume24h,
      high: priceData.high24h,
      low: priceData.low24h,
      change: priceData.change24h,
      changePercent: priceData.changePercent24h,
    };
  }
  
  /**
   * Search for assets by symbol or name
   */
  async searchAssets(query: string): Promise<Asset[]> {
    try {
      const [meta, spotMeta] = await Promise.all([
        this.getMeta(),
        this.getSpotMeta(),
      ]);
      
      const assets: Asset[] = [];
      
      // Search perpetuals
      meta.universe.forEach(asset => {
        if (asset.name.toLowerCase().includes(query.toLowerCase())) {
          assets.push({
            symbol: asset.name,
            name: asset.name,
            type: 'perpetual',
            baseAsset: asset.name,
            quoteAsset: 'USDC',
            minSize: Math.pow(10, -asset.szDecimals),
            maxSize: asset.maxLeverage * 1000000, // Simplified
            tickSize: Math.pow(10, -asset.pxDecimals),
            leverage: asset.maxLeverage,
            marginTiers: asset.marginTiers,
          });
        }
      });
      
      // Search spot pairs
      if (spotMeta.universe) {
        spotMeta.universe.forEach((spot, index) => {
          const symbol = `@${index}`;
          const name = spot.name || `${spot.tokens[0]}/${spot.tokens[1]}`;
          
          if (name.toLowerCase().includes(query.toLowerCase()) ||
              spot.tokens[0].toLowerCase().includes(query.toLowerCase()) ||
              spot.tokens[1].toLowerCase().includes(query.toLowerCase())) {
            assets.push({
              symbol,
              name,
              type: 'spot',
              baseAsset: spot.tokens[0],
              quoteAsset: spot.tokens[1],
              minSize: 0.001,
              maxSize: 1000000,
              tickSize: 0.01,
            });
          }
        });
      }
      
      return assets;
      
    } catch (error) {
      console.error('Asset search failed:', error);
      return [];
    }
  }
  
  /**
   * Get funding rate for perpetual contracts
   */
  async getFundingRate(symbol: string): Promise<{
    rate: number;
    nextFunding: number;
  }> {
    const data = await this.request<{
      funding: string;
      nextFunding: number;
    }>('/info', {
      type: 'funding',
      coin: symbol,
    });
    
    return {
      rate: parseFloat(data.funding),
      nextFunding: data.nextFunding,
    };
  }
  
  /**
   * Get open interest for a symbol
   */
  async getOpenInterest(symbol: string): Promise<{
    openInterest: number;
    timestamp: number;
  }> {
    const data = await this.request<{
      oi: string;
      time: number;
    }>('/info', {
      type: 'openInterest',
      coin: symbol,
    });
    
    return {
      openInterest: parseFloat(data.oi),
      timestamp: data.time,
    };
  }
  
  /**
   * Clear chart data cache
   */
  clearChartCache(): void {
    this.chartDataCache.clear();
    console.log('Chart data cache cleared');
  }

  /**
   * Health check - verify API is responsive
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.request('/info', { type: 'meta' });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get server timestamp
   */
  async getServerTime(): Promise<number> {
    const start = Date.now();
    
    try {
      await this.request('/info', { type: 'meta' });
      const roundTrip = Date.now() - start;
      
      // Estimate server time (simplified)
      return Date.now() - (roundTrip / 2);
      
    } catch {
      return Date.now();
    }
  }
  
  /**
   * Transform raw API data to internal Asset format
   */
  private transformMetaToAssets(perpMeta: HyperliquidMeta, spotMeta: HyperliquidSpotMeta): Asset[] {
    const assets: Asset[] = [];
    
    // Transform perpetuals
    perpMeta.universe.forEach(perp => {
      assets.push({
        symbol: perp.name,
        name: perp.name,
        type: 'perpetual',
        baseAsset: perp.name,
        quoteAsset: 'USDC',
        minSize: Math.pow(10, -perp.szDecimals),
        maxSize: perp.maxLeverage * 1000000,
        tickSize: Math.pow(10, -perp.pxDecimals),
        leverage: perp.maxLeverage,
        marginTiers: perp.marginTiers,
      });
    });
    
    // Transform spot pairs
    if (spotMeta.universe) {
      spotMeta.universe.forEach((spot, index) => {
        assets.push({
          symbol: `@${index}`,
          name: spot.name || `${spot.tokens[0]}/${spot.tokens[1]}`,
          type: 'spot',
          baseAsset: spot.tokens[0],
          quoteAsset: spot.tokens[1],
          minSize: 0.001,
          maxSize: 1000000,
          tickSize: 0.01,
        });
      });
    }
    
    return assets;
  }
}

// Singleton instance
export const hyperliquidAPI = new HyperliquidAPIService();

// React hook for API operations
export const useHyperliquidAPI = () => {
  const initialize = useCallback(() => hyperliquidAPI.initialize(), []);
  const getAllMids = useCallback(() => hyperliquidAPI.getAllMids(), []);
  const getMeta = useCallback(() => hyperliquidAPI.getMeta(), []);
  const getSpotMeta = useCallback(() => hyperliquidAPI.getSpotMeta(), []);
  const getL2Book = useCallback((symbol: string) => hyperliquidAPI.getL2Book(symbol), []);
  const getCandleSnapshot = useCallback((symbol: string, interval: string, startTime: number) => 
    hyperliquidAPI.getCandleSnapshot(symbol, interval, startTime), []);
  const getChartCandles = useCallback((symbol: string, interval: ChartInterval, startTime?: number) => 
    hyperliquidAPI.getChartCandles(symbol, interval, startTime), []);
  const getTrades = useCallback((symbol: string, limit?: number) => hyperliquidAPI.getTrades(symbol, limit), []);
  const get24hStats = useCallback((symbol: string) => hyperliquidAPI.get24hStats(symbol), []);
  const searchAssets = useCallback((query: string) => hyperliquidAPI.searchAssets(query), []);
  const getFundingRate = useCallback((symbol: string) => hyperliquidAPI.getFundingRate(symbol), []);
  const getOpenInterest = useCallback((symbol: string) => hyperliquidAPI.getOpenInterest(symbol), []);
  const clearChartCache = useCallback(() => hyperliquidAPI.clearChartCache(), []);
  const healthCheck = useCallback(() => hyperliquidAPI.healthCheck(), []);
  const getServerTime = useCallback(() => hyperliquidAPI.getServerTime(), []);

  return {
    initialize,
    getAllMids,
    getMeta,
    getSpotMeta,
    getL2Book,
    getCandleSnapshot,
    getChartCandles,
    getTrades,
    get24hStats,
    searchAssets,
    getFundingRate,
    getOpenInterest,
    clearChartCache,
    healthCheck,
    getServerTime,
  };
};