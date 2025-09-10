import { 
  Asset, 
  HyperliquidAllMids, 
  HyperliquidMeta, 
  HyperliquidSpotMeta,
  HyperliquidL2Book,
  HyperliquidMetaAndAssetCtxs,
  OrderBook,
  Candle,
  APIResponse,
  PriceData,
  MarketStatistics
} from '@/lib/types';

export class HyperliquidAPIService {
  private baseURL = 'https://api.hyperliquid.xyz';
  private retryAttempts = 3;
  private retryDelay = 1000;
  
  /**
   * Fetch all asset prices (mids)
   */
  async getAllMids(): Promise<HyperliquidAllMids> {
    return this.makeRequest({
      type: 'allMids'
    });
  }
  
  /**
   * Fetch perpetual assets metadata
   */
  async getPerpetualsMeta(): Promise<HyperliquidMeta> {
    return this.makeRequest({
      type: 'meta'
    });
  }
  
  /**
   * Fetch spot assets metadata
   */
  async getSpotMeta(): Promise<HyperliquidSpotMeta> {
    return this.makeRequest({
      type: 'spotMeta'
    });
  }
  
  /**
   * Fetch order book for a specific asset
   */
  async getOrderBook(coin: string): Promise<OrderBook> {
    const response: HyperliquidL2Book = await this.makeRequest({
      type: 'l2Book',
      coin
    });
    
    return {
      symbol: response.coin,
      bids: response.levels[0].map(level => ({
        price: parseFloat(level.px),
        size: parseFloat(level.sz),
        total: parseFloat(level.px) * parseFloat(level.sz)
      })),
      asks: response.levels[1].map(level => ({
        price: parseFloat(level.px),
        size: parseFloat(level.sz),
        total: parseFloat(level.px) * parseFloat(level.sz)
      })),
      timestamp: response.time
    };
  }
  
  /**
   * Fetch candle data for charting
   */
  async getCandleSnapshot(
    coin: string, 
    interval: string, 
    startTime: number,
    endTime?: number
  ): Promise<Candle[]> {
    const response = await this.makeRequest({
      type: 'candleSnapshot',
      req: {
        coin,
        interval,
        startTime,
        endTime
      }
    });
    
    return response.map((candle: any) => ({
      timestamp: candle.t,
      open: parseFloat(candle.o),
      high: parseFloat(candle.h),
      low: parseFloat(candle.l),
      close: parseFloat(candle.c),
      volume: parseFloat(candle.v)
    }));
  }
  
  /**
   * Fetch comprehensive market data including asset contexts
   */
  async getMetaAndAssetCtxs(): Promise<HyperliquidMetaAndAssetCtxs> {
    return this.makeRequest({
      type: 'metaAndAssetCtxs'
    });
  }
  
  /**
   * Fetch 24h statistics for all assets
   */
  async get24hStats(): Promise<Record<string, any>> {
    return this.makeRequest({
      type: 'metaAndAssetCtxs'
    });
  }
  
  /**
   * Initialize and load all asset data with comprehensive market statistics
   */
  async initializeAssets(): Promise<{
    assets: Asset[];
    prices: Record<string, number>;
    marketData: Record<string, PriceData>;
    marketStats: MarketStatistics;
  }> {
    try {
      const [mids, metaAndCtxs] = await Promise.all([
        this.getAllMids(),
        this.getMetaAndAssetCtxs()
      ]);
      
      // Get separate metadata for proper processing
      const [perpMeta, spotMeta] = await Promise.all([
        this.getPerpetualsMeta(),
        this.getSpotMeta()
      ]);
      
      const assets = this.transformMetaToAssets(perpMeta, spotMeta);
      const prices: Record<string, number> = {};
      const marketData: Record<string, PriceData> = {};
      
      // Map price data from allMids
      Object.entries(mids).forEach(([symbol, price]) => {
        prices[symbol] = parseFloat(price);
      });
      
      // Process asset contexts for comprehensive market data
      if (metaAndCtxs.assetCtxs) {
        metaAndCtxs.assetCtxs.forEach(ctx => {
          const markPrice = parseFloat(ctx.markPx || '0');
          const prevDayPrice = parseFloat(ctx.prevDayPx || '0');
          const volume24h = parseFloat(ctx.volume24h || '0');
          
          const change24h = markPrice - prevDayPrice;
          const changePercent24h = prevDayPrice > 0 ? (change24h / prevDayPrice) * 100 : 0;
          
          marketData[ctx.coin] = {
            symbol: ctx.coin,
            price: markPrice,
            change24h,
            changePercent24h,
            volume24h,
            timestamp: Date.now()
          };
          
          // Also update prices object
          prices[ctx.coin] = markPrice;
        });
      }
      
      // Calculate market statistics
      const marketStats = this.calculateMarketStatistics(marketData);
      
      return { assets, prices, marketData, marketStats };
    } catch (error) {
      console.error('Failed to initialize assets:', error);
      throw new Error('Failed to load asset data from Hyperliquid');
    }
  }
  
  /**
   * Transform Hyperliquid metadata into our Asset format
   */
  private transformMetaToAssets(perpMeta: HyperliquidMeta, spotMeta: HyperliquidSpotMeta): Asset[] {
    const assets: Asset[] = [];
    
    // Transform perpetual contracts
    if (perpMeta?.universe) {
      perpMeta.universe.forEach((perp) => {
        // Extract base asset from symbol (e.g., "BTC-USD" -> "BTC")
        const symbol = perp.name;
        const baseAsset = symbol.includes('-') ? symbol.split('-')[0] : symbol;
        const quoteAsset = symbol.includes('-') ? symbol.split('-')[1] || 'USD' : 'USD';
        
        assets.push({
          symbol: perp.name,
          name: `${baseAsset} Perpetual`,
          type: 'perpetual',
          baseAsset,
          quoteAsset,
          minSize: Math.pow(10, -perp.szDecimals),
          maxSize: perp.maxLeverage * 1000000, // Rough estimate
          tickSize: Math.pow(10, -perp.pxDecimals),
          marginTiers: perp.marginTiers,
          leverage: perp.maxLeverage,
          
          // Additional metadata
          tradingEnabled: true,
          category: this.categorizeAsset(baseAsset),
          tags: this.getAssetTags(baseAsset),
          icon: this.getAssetIcon(baseAsset),
        });
      });
    }
    
    // Transform spot markets - Fix the @index display issue
    if (spotMeta?.universe) {
      spotMeta.universe.forEach((spot, index) => {
        const baseAsset = spot.tokens[0];
        const quoteAsset = spot.tokens[1];
        
        // Use the actual spot market name if available, otherwise construct from tokens
        const displaySymbol = spot.name || `${baseAsset}/${quoteAsset}`;
        const apiSymbol = `@${index}`;
        
        assets.push({
          symbol: displaySymbol, // Use readable symbol for display
          name: `${baseAsset}/${quoteAsset}`,
          type: 'spot',
          baseAsset,
          quoteAsset,
          minSize: 0.001,
          maxSize: 1000000,
          tickSize: 0.01,
          leverage: 1,
          
          // Additional metadata
          tradingEnabled: true,
          category: this.categorizeAsset(baseAsset),
          tags: this.getAssetTags(baseAsset),
          icon: this.getAssetIcon(baseAsset),
          
          // Store API symbol for internal use
          apiSymbol: apiSymbol,
          spotIndex: index,
        });
      });
    }
    
    return assets;
  }
  
  /**
   * Calculate comprehensive market statistics
   */
  private calculateMarketStatistics(marketData: Record<string, PriceData>): MarketStatistics {
    const assets = Object.values(marketData);
    const totalAssets = assets.length;
    
    let totalVolume = 0;
    let gainers = 0;
    let losers = 0;
    let topGainer = '';
    let topLoser = '';
    let maxGain = -Infinity;
    let maxLoss = Infinity;
    
    assets.forEach(asset => {
      if (asset.volume24h) {
        totalVolume += asset.volume24h;
      }
      
      if (asset.changePercent24h) {
        if (asset.changePercent24h > 0) {
          gainers++;
          if (asset.changePercent24h > maxGain) {
            maxGain = asset.changePercent24h;
            topGainer = asset.symbol;
          }
        } else if (asset.changePercent24h < 0) {
          losers++;
          if (asset.changePercent24h < maxLoss) {
            maxLoss = asset.changePercent24h;
            topLoser = asset.symbol;
          }
        }
      }
    });
    
    return {
      totalMarketCap: 0, // Would need additional data for market cap calculation
      total24hVolume: totalVolume,
      totalAssets,
      gainersCount: gainers,
      losersCount: losers,
      topGainer,
      topLoser,
      lastUpdated: Date.now(),
    };
  }
  
  /**
   * Get asset icon/symbol from constants or fallback
   */
  private getAssetIcon(baseAsset: string): string {
    // This will reference the expanded constants we'll create
    const assetIcons: Record<string, string> = {
      'BTC': '₿',
      'ETH': 'Ξ',
      'SOL': '◎',
      'AVAX': '🔺',
      'MATIC': '💜',
      'ADA': '₳',
      'DOT': '●',
      'ATOM': '⚛️',
      'NEAR': 'Ⓝ',
      'FTM': '👻',
      'UNI': '🦄',
      'AAVE': '👻',
      'COMP': '🏛️',
      'MKR': '🔴',
      'LINK': '🔗',
      'AXS': '🎮',
      'MANA': '🌐',
      'SAND': '🏖️',
      'DOGE': '🐕',
      'SHIB': '🐶',
    };
    
    const asset = baseAsset.toUpperCase();
    return assetIcons[asset] || '💰';
  }
  
  /**
   * Categorize assets based on their base asset using enhanced categories
   */
  private categorizeAsset(baseAsset: string): string {
    const asset = baseAsset.toUpperCase();
    
    // Import from constants when available, for now use the comprehensive mapping
    const categoryMap = {
      // Major cryptocurrencies
      'major': ['BTC', 'ETH'],
      
      // Layer 1 protocols
      'layer1': ['SOL', 'ADA', 'DOT', 'AVAX', 'ATOM', 'NEAR', 'ALGO', 'ONE', 'LUNA', 'EGLD'],
      
      // Layer 2 & Scaling
      'layer2': ['MATIC', 'ARB', 'OP', 'IMX', 'LRC'],
      
      // DeFi tokens
      'defi': ['UNI', 'AAVE', 'COMP', 'MKR', 'SNX', 'YFI', 'SUSHI', 'CAKE', 'CRV', 'BAL'],
      
      // Exchange tokens
      'exchange': ['BNB', 'CRO', 'KCS', 'HT', 'LEO'],
      
      // Gaming/NFT
      'gaming': ['AXS', 'MANA', 'SAND', 'ENJ', 'GALA', 'FLOW', 'APE'],
      
      // Meme coins
      'meme': ['DOGE', 'SHIB', 'PEPE', 'FLOKI'],
      
      // Stablecoins
      'stable': ['USDT', 'USDC', 'BUSD', 'DAI', 'FRAX'],
      
      // Smart contract platforms & utilities
      'platform': ['LINK', 'VET', 'THETA', 'NEO', 'EOS', 'TRX'],
      
      // Privacy coins
      'privacy': ['XMR', 'ZEC', 'DASH'],
      
      // Payment & Transfer
      'payment': ['XRP', 'XLM', 'LTC', 'BCH'],
      
      // Enterprise & Business
      'enterprise': ['XTZ', 'HBAR', 'IOTA'],
    };
    
    for (const [category, assets] of Object.entries(categoryMap)) {
      if (assets.includes(asset)) {
        return category;
      }
    }
    
    return 'other';
  }
  
  /**
   * Get relevant tags for an asset
   */
  private getAssetTags(baseAsset: string): string[] {
    const asset = baseAsset.toUpperCase();
    const tags: string[] = [];
    
    // Add category-based tags
    const category = this.categorizeAsset(asset);
    tags.push(category);
    
    // Add specific tags
    if (['BTC', 'ETH', 'SOL'].includes(asset)) {
      tags.push('popular');
    }
    
    if (['BTC'].includes(asset)) {
      tags.push('digital-gold', 'store-of-value');
    }
    
    if (['ETH'].includes(asset)) {
      tags.push('smart-contracts', 'defi');
    }
    
    if (['SOL', 'AVAX', 'NEAR'].includes(asset)) {
      tags.push('high-throughput');
    }
    
    return tags;
  }
  
  /**
   * Make HTTP request to Hyperliquid API with retry logic
   */
  private async makeRequest(payload: any): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseURL}/info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          // Network error, might be worth retrying
        } else if (error instanceof Error && error.message.includes('HTTP 4')) {
          // Client error, don't retry
          throw error;
        }
        
        // Wait before retrying
        if (attempt < this.retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        }
      }
    }
    
    throw lastError || new Error('Unknown error occurred');
  }
  
  /**
   * Get asset categories with metadata
   */
  getAssetCategories() {
    return [
      {
        id: 'major',
        name: 'Major',
        description: 'Bitcoin and Ethereum',
        icon: '⭐',
        color: '#FFD700'
      },
      {
        id: 'layer1',
        name: 'Layer 1',
        description: 'Blockchain protocols',
        icon: '🏗️',
        color: '#4F46E5'
      },
      {
        id: 'defi',
        name: 'DeFi',
        description: 'Decentralized Finance',
        icon: '🏦',
        color: '#10B981'
      },
      {
        id: 'gaming',
        name: 'Gaming',
        description: 'Gaming and Metaverse',
        icon: '🎮',
        color: '#F59E0B'
      },
      {
        id: 'meme',
        name: 'Meme',
        description: 'Community tokens',
        icon: '🐕',
        color: '#EF4444'
      },
      {
        id: 'other',
        name: 'Other',
        description: 'Other cryptocurrencies',
        icon: '📊',
        color: '#6B7280'
      }
    ];
  }
  
  /**
   * Search assets by query
   */
  async searchAssets(query: string): Promise<Asset[]> {
    // This would implement server-side search if available
    // For now, return empty array as we'll handle client-side search
    return [];
  }
}

// Export singleton instance
export const hyperliquidAPI = new HyperliquidAPIService();

// Export error types
export class HyperliquidAPIError extends Error {
  constructor(
    message: string, 
    public code: string, 
    public details?: any
  ) {
    super(message);
    this.name = 'HyperliquidAPIError';
  }
}

// Rate limiting helper
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;
  
  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.checkLimit();
    }
    
    this.requests.push(now);
    return true;
  }
}

export const apiRateLimiter = new RateLimiter();