//@ts-nocheck
import { 
  HyperliquidAllMids, 
  HyperliquidMeta, 
  HyperliquidSpotMeta,
  PriceData,
  Asset
} from '@/lib/types';

const API_BASE_URL = '/api/hyperliquid';

interface EnhancedPriceData extends PriceData {
  marketType: 'spot' | 'perpetual';
  displayName: string;
  apiSymbol: string;
  baseAsset?: string;
  quoteAsset?: string;
}

export class HyperliquidService {
  private static instance: HyperliquidService;
  private spotMetaCache: HyperliquidSpotMeta | null = null;
  private perpsMetaCache: HyperliquidMeta | null = null;
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): HyperliquidService {
    if (!HyperliquidService.instance) {
      HyperliquidService.instance = new HyperliquidService();
    }
    return HyperliquidService.instance;
  }

  private async fetchFromAPI(endpoint: string, body: any): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching from Hyperliquid API:`, error);
      throw error;
    }
  }

  async fetchAllPrices(): Promise<HyperliquidAllMids> {
    return this.fetchFromAPI('', { type: 'allMids' });
  }

  async fetchSpotMeta(): Promise<HyperliquidSpotMeta> {
    if (this.spotMetaCache && Date.now() - this.lastCacheUpdate < this.CACHE_DURATION) {
      return this.spotMetaCache;
    }

    const meta = await this.fetchFromAPI('', { type: 'spotMeta' });
    this.spotMetaCache = meta;
    this.lastCacheUpdate = Date.now();
    return meta;
  }

  async fetchPerpsMeta(): Promise<HyperliquidMeta> {
    if (this.perpsMetaCache && Date.now() - this.lastCacheUpdate < this.CACHE_DURATION) {
      return this.perpsMetaCache;
    }

    const meta = await this.fetchFromAPI('', { type: 'meta' });
    this.perpsMetaCache = meta;
    this.lastCacheUpdate = Date.now();
    return meta;
  }

  async fetchL2Book(coin: string): Promise<any> {
    return this.fetchFromAPI('', { 
      type: 'l2Book', 
      coin 
    });
  }

  async fetchCandles(coin: string, interval: string, startTime?: number, endTime?: number): Promise<any> {
    return this.fetchFromAPI('', {
      type: 'candles',
      coin,
      interval,
      startTime,
      endTime
    });
  }

  async getAllEnhancedPrices(): Promise<Map<string, EnhancedPriceData>> {
    try {
      // Use the GET endpoint that fetches all data at once
      const response = await fetch('/api/hyperliquid');
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }
      
      const { allMids: allPrices, spotMeta, perpsMeta } = await response.json();

      const enhancedPrices = new Map<string, EnhancedPriceData>();

      console.log('Fetched data:', {
        allPricesCount: Object.keys(allPrices).length,
        perpsCount: perpsMeta?.universe?.length || 0,
        spotCount: spotMeta?.universe?.length || 0
      });

      // Process perpetual markets
      if (perpsMeta?.universe) {
        perpsMeta.universe.forEach(perp => {
          const priceStr = allPrices[perp.name];
          if (priceStr) {
            const price = parseFloat(priceStr);
            enhancedPrices.set(perp.name, {
              symbol: perp.name,
              price,
              timestamp: Date.now(),
              marketType: 'perpetual',
              displayName: perp.name,
              apiSymbol: perp.name,
              baseAsset: perp.name,
              quoteAsset: 'USD',
              change24h: 0,
              changePercent24h: 0,
              volume24h: 0
            });
          }
        });
      }

      // Skip spot markets with @index notation for now
      // We'll only process spot markets that have proper names
      // This filters out all @1, @2, etc. coins

      // Handle special case for PURR
      if (allPrices['PURR/USDC']) {
        const price = parseFloat(allPrices['PURR/USDC']);
        enhancedPrices.set('PURR/USDC', {
          symbol: 'PURR/USDC',
          price,
          timestamp: Date.now(),
          marketType: 'spot',
          displayName: 'PURR/USDC',
          apiSymbol: 'PURR/USDC',
          baseAsset: 'PURR',
          quoteAsset: 'USDC',
          change24h: 0,
          changePercent24h: 0,
          volume24h: 0
        });
      }

      console.log('Enhanced prices count:', enhancedPrices.size);
      console.log('Sample prices:', Array.from(enhancedPrices.entries()).slice(0, 3));

      return enhancedPrices;
    } catch (error) {
      console.error('Error fetching enhanced prices:', error);
      throw error;
    }
  }

  async getMarketInfo(symbol: string): Promise<Asset | null> {
    try {
      const [spotMeta, perpsMeta] = await Promise.all([
        this.fetchSpotMeta(),
        this.fetchPerpsMeta()
      ]);

      // Check if it's a perpetual
      const perp = perpsMeta.universe.find(p => p.name === symbol);
      if (perp) {
        return {
          symbol: perp.name,
          name: perp.name,
          type: 'perpetual',
          baseAsset: perp.name,
          quoteAsset: 'USD',
          minSize: Math.pow(10, -perp.szDecimals),
          maxSize: 1000000,
          tickSize: Math.pow(10, -perp.pxDecimals),
          leverage: perp.maxLeverage,
          marginTiers: perp.marginTiers,
          tradingEnabled: true,
          category: 'perpetual',
          tags: ['futures', 'leverage'],
          apiSymbol: perp.name
        };
      }

      // Check if it's a spot market
      const spotIndex = spotMeta.universe.findIndex(s => {
        if (s.name === symbol) return true;
        
        // Also check by reconstructing the name from tokens
        const baseToken = spotMeta.tokens.find(t => t.index === parseInt(s.tokens[0]));
        const quoteToken = spotMeta.tokens.find(t => t.index === parseInt(s.tokens[1]));
        return baseToken && quoteToken && `${baseToken.name}/${quoteToken.name}` === symbol;
      });

      if (spotIndex !== -1) {
        const spotMarket = spotMeta.universe[spotIndex];
        const baseToken = spotMeta.tokens.find(t => t.index === parseInt(spotMarket.tokens[0]));
        const quoteToken = spotMeta.tokens.find(t => t.index === parseInt(spotMarket.tokens[1]));

        if (baseToken && quoteToken) {
          return {
            symbol: `${baseToken.name}/${quoteToken.name}`,
            name: `${baseToken.name}/${quoteToken.name}`,
            type: 'spot',
            baseAsset: baseToken.name,
            quoteAsset: quoteToken.name,
            minSize: Math.pow(10, -baseToken.szDecimals),
            maxSize: 1000000,
            tickSize: 0.0001,
            tradingEnabled: true,
            category: 'spot',
            tags: ['spot'],
            apiSymbol: `@${spotIndex}`,
            spotIndex
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching market info:', error);
      return null;
    }
  }

  getApiSymbol(displaySymbol: string, marketType: 'spot' | 'perpetual'): string {
    if (marketType === 'perpetual') {
      return displaySymbol;
    }
    
    // For spot markets, we need to look up the @index
    // This would require accessing the cached spotMeta
    if (displaySymbol === 'PURR/USDC') {
      return 'PURR/USDC';
    }
    
    // For other spot markets, return the display symbol
    // The actual @index lookup would need to be done with spotMeta
    return displaySymbol;
  }
}

export const hyperliquidService = HyperliquidService.getInstance();