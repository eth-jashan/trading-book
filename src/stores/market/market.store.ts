
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  PriceData, 
  OrderBook, 
  Candle, 
  MarketStatistics, 
  AssetWithMarketData,
  AsyncState 
} from '@/lib/types';
import { storeEvents, STORE_EVENTS } from '../middleware';
import { MARKET_DATA } from '@/lib/constants';
import { calculatePriceChange, generateId } from '@/lib/utils';

interface MarketState {
  // Data
  prices: Map<string, PriceData>;
  orderBooks: Map<string, OrderBook>;
  candles: Map<string, Map<string, Candle[]>>; // symbol -> interval -> candles
  priceHistory: Map<string, Array<{ price: number; timestamp: number }>>;
  
  // Enhanced market data
  marketStatistics: MarketStatistics;
  loadingState: AsyncState;
  
  // Status
  loading: boolean;
  lastUpdate: number;
  subscriptions: Set<string>;
  
  // Actions - Price Management
  updatePrice: (symbol: string, data: Partial<PriceData>) => void;
  updatePrices: (prices: Record<string, number>) => void;
  addPricePoint: (symbol: string, price: number) => void;
  
  // Actions - Order Book Management
  updateOrderBook: (symbol: string, orderBook: Partial<OrderBook>) => void;
  clearOrderBook: (symbol: string) => void;
  
  // Actions - Candle Management
  updateCandles: (symbol: string, interval: string, candles: Candle[]) => void;
  addCandle: (symbol: string, interval: string, candle: Candle) => void;
  
  // Actions - Market Statistics
  updateMarketStatistics: (stats: Partial<MarketStatistics>) => void;
  calculateMarketStatistics: () => void;
  initializeMarketData: (data: {
    prices: Record<string, number>;
    marketData: Record<string, PriceData>;
    marketStats: MarketStatistics;
  }) => void;
  
  // Getters
  getPrice: (symbol: string) => PriceData | undefined;
  getBestBidAsk: (symbol: string) => { bid: number; ask: number; spread: number } | null;
  getPriceHistory: (symbol: string, limit?: number) => Array<{ price: number; timestamp: number }>;
  getCandles: (symbol: string, interval: string) => Candle[];
  getSpread: (symbol: string) => number;
  getMarketOverview: () => {
    totalAssets: number;
    gainers: PriceData[];
    losers: PriceData[];
    topVolume: PriceData[];
    marketCap: number;
  };
  
  // Subscriptions
  addSubscription: (subscription: string) => void;
  removeSubscription: (subscription: string) => void;
  clearSubscriptions: () => void;
  
  // Utility
  reset: () => void;
}

// Add some initial mock data for testing
const mockPrices = new Map<string, PriceData>();
mockPrices.set('BTC-USD', {
  symbol: 'BTC-USD',
  price: 43250.50,
  change24h: 1250.75,
  changePercent24h: 2.98,
  volume24h: 28500000,
  high24h: 44100.00,
  low24h: 41800.25,
  timestamp: Date.now(),
  bid: 43248.25,
  ask: 43252.75,
  spread: 4.50,
});

mockPrices.set('ETH-USD', {
  symbol: 'ETH-USD',
  price: 2648.75,
  change24h: -85.25,
  changePercent24h: -3.12,
  volume24h: 15200000,
  high24h: 2750.80,
  low24h: 2620.15,
  timestamp: Date.now(),
  bid: 2647.50,
  ask: 2649.00,
  spread: 1.50,
});

mockPrices.set('SOL-USD', {
  symbol: 'SOL-USD',
  price: 98.45,
  change24h: 4.25,
  changePercent24h: 4.51,
  volume24h: 8500000,
  high24h: 102.30,
  low24h: 93.80,
  timestamp: Date.now(),
  bid: 98.35,
  ask: 98.55,
  spread: 0.20,
});

const initialMarketStats: MarketStatistics = {
  totalMarketCap: 0,
  total24hVolume: 0,
  totalAssets: 0,
  gainersCount: 0,
  losersCount: 0,
  topGainer: '',
  topLoser: '',
  lastUpdated: Date.now(),
};

const initialLoadingState: AsyncState = {
  loading: false,
  error: null,
  lastUpdated: null,
};

const initialState = {
  // Data
  prices: mockPrices,
  orderBooks: new Map<string, OrderBook>(),
  candles: new Map<string, Map<string, Candle[]>>(),
  priceHistory: new Map<string, Array<{ price: number; timestamp: number }>>(),
  
  // Enhanced market data
  marketStatistics: initialMarketStats,
  loadingState: initialLoadingState,
  
  // Status
  loading: false,
  lastUpdate: Date.now(),
  subscriptions: new Set<string>(),
};

export const useMarketStore = create<MarketState>()(
  devtools(
    immer((set: any, get: any) => ({
      ...initialState,
      
      // Price Management
      updatePrice: (symbol: string, data: Partial<PriceData>) => {
        set((state: MarketState): void => {
          const current = state.prices.get(symbol);
          const timestamp = Date.now();
          
          // Calculate 24h change if not provided
          let change24h = data.change24h || 0;
          let changePercent24h = data.changePercent24h || 0;
          
          if (current && data.price && !data.change24h) {
            change24h = data.price - current.price;
            changePercent24h = calculatePriceChange(data.price, current.price);
          }
          
          const updated: PriceData = {
            symbol,
            price: data.price || current?.price || 0,
            change24h,
            changePercent24h,
            volume24h: data.volume24h || current?.volume24h || 0,
            high24h: data.high24h || current?.high24h || data.price || 0,
            low24h: data.low24h || current?.low24h || data.price || 0,
            bid: data.bid || current?.bid,
            ask: data.ask || current?.ask,
            spread: data.spread || current?.spread,
            timestamp,
          };
          
          state.prices.set(symbol, updated);
          
          // Add to price history for sparklines
          if (data.price) {
            get().addPricePoint(symbol, data.price);
          }
          
          state.lastUpdate = timestamp;
          
          // Emit price update event
          storeEvents.emit(STORE_EVENTS.PRICE_UPDATE, {
            symbol,
            price: updated.price,
            change: changePercent24h,
          });
        });
      },
      
      updatePrices: (prices: Record<string, number>) => {
        set((state: MarketState): void => {
          const timestamp = Date.now();
          
          Object.entries(prices).forEach(([symbol, price]) => {
            const current = state.prices.get(symbol);
            const change24h = current ? price - current.price : 0;
            const changePercent24h = current && current.price > 0 
              ? calculatePriceChange(price, current.price) 
              : 0;
            
            const updated: PriceData = {
              symbol,
              price,
              change24h,
              changePercent24h,
              volume24h: current?.volume24h || 0,
              high24h: Math.max(current?.high24h || price, price),
              low24h: Math.min(current?.low24h || price, price),
              bid: current?.bid,
              ask: current?.ask,
              spread: current?.spread,
              timestamp,
            };
            
            state.prices.set(symbol, updated);
            
            // Add to price history
            get().addPricePoint(symbol, price);
            
            // Emit individual price updates
            storeEvents.emit(STORE_EVENTS.PRICE_UPDATE, {
              symbol,
              price,
              change: changePercent24h,
            });
          });
          
          state.lastUpdate = timestamp;
        });
      },
      
      addPricePoint: (symbol: string, price: number) => {
        set((state: MarketState): void => {
          const history = state.priceHistory.get(symbol) || [];
          history.push({ price, timestamp: Date.now() });
          
          // Keep only last 100 points for performance
          if (history.length > 100) {
            history.shift();
          }
          
          state.priceHistory.set(symbol, history);
        });
      },
      
      // Order Book Management
      updateOrderBook: (symbol: string, orderBook: Partial<OrderBook>) => {
        set((state: MarketState): void => {
          const current = state.orderBooks.get(symbol);
          const updated: OrderBook = {
            symbol,
            bids: orderBook.bids || current?.bids || [],
            asks: orderBook.asks || current?.asks || [],
            timestamp: orderBook.timestamp || Date.now(),
          };
          
          // Sort order book levels
          updated.bids.sort((a, b) => b.price - a.price); // Highest bid first
          updated.asks.sort((a, b) => a.price - b.price); // Lowest ask first
          
          // Calculate running totals
          let bidTotal = 0;
          updated.bids.forEach(level => {
            bidTotal += level.size;
            level.total = bidTotal;
          });
          
          let askTotal = 0;
          updated.asks.forEach(level => {
            askTotal += level.size;
            level.total = askTotal;
          });
          
          state.orderBooks.set(symbol, updated);
          
          // Update bid/ask in price data
          if (updated.bids.length > 0 && updated.asks.length > 0) {
            const bestBid = updated.bids[0].price;
            const bestAsk = updated.asks[0].price;
            const spread = bestAsk - bestBid;
            
            get().updatePrice(symbol, {
              bid: bestBid,
              ask: bestAsk,
              spread,
            });
          }
        });
      },
      
      clearOrderBook: (symbol: string) => {
        set((state: MarketState): void => {
          state.orderBooks.delete(symbol);
        });
      },
      
      // Candle Management
      updateCandles: (symbol: string, interval: string, candles: Candle[]) => {
        set((state: MarketState): void => {
          if (!state.candles.has(symbol)) {
            state.candles.set(symbol, new Map());
          }
          
          const symbolCandles = state.candles.get(symbol)!;
          const sortedCandles = [...candles].sort((a, b) => a.timestamp - b.timestamp);
          
          // Keep only the most recent candles
          const maxCandles = MARKET_DATA.UPDATE_THROTTLE;
          symbolCandles.set(interval, sortedCandles.slice(-maxCandles));
          
          // Update current price from latest candle
          const latestCandle = sortedCandles[sortedCandles.length - 1];
          if (latestCandle) {
            get().updatePrice(symbol, { price: latestCandle.close });
          }
        });
      },
      
      addCandle: (symbol: string, interval: string, candle: Candle) => {
        set((state: MarketState): void => {
          if (!state.candles.has(symbol)) {
            state.candles.set(symbol, new Map());
          }
          
          const symbolCandles = state.candles.get(symbol)!;
          const intervalCandles = symbolCandles.get(interval) || [];
          
          // Check if we should update the last candle or add a new one
          if (intervalCandles.length > 0) {
            const lastCandle = intervalCandles[intervalCandles.length - 1];
            if (lastCandle.timestamp === candle.timestamp) {
              // Update existing candle
              intervalCandles[intervalCandles.length - 1] = candle;
            } else {
              // Add new candle
              intervalCandles.push(candle);
            }
          } else {
            intervalCandles.push(candle);
          }
          
          // Keep only recent candles
          const maxCandles = MARKET_DATA.UPDATE_THROTTLE;
          symbolCandles.set(interval, intervalCandles.slice(-maxCandles));
          
          // Update current price
          get().updatePrice(symbol, { price: candle.close });
        });
      },
      
      // Getters
      getPrice: (symbol: string) => {
        return get().prices.get(symbol);
      },
      
      getBestBidAsk: (symbol: string) => {
        const orderBook = get().orderBooks.get(symbol);
        if (!orderBook || orderBook.bids.length === 0 || orderBook.asks.length === 0) {
          return null;
        }
        
        const bid = orderBook.bids[0].price;
        const ask = orderBook.asks[0].price;
        const spread = ask - bid;
        
        return { bid, ask, spread };
      },
      
      getPriceHistory: (symbol: string, limit = 100) => {
        const history = get().priceHistory.get(symbol) || [];
        return history.slice(-limit);
      },
      
      getCandles: (symbol: string, interval: string) => {
        const symbolCandles = get().candles.get(symbol);
        if (!symbolCandles) return [];
        return symbolCandles.get(interval) || [];
      },
      
      getSpread: (symbol: string) => {
        const bidAsk = get().getBestBidAsk(symbol);
        return bidAsk?.spread || 0;
      },
      
      // Market Statistics
      updateMarketStatistics: (stats: Partial<MarketStatistics>) => {
        set((state: MarketState): void => {
          state.marketStatistics = {
            ...state.marketStatistics,
            ...stats,
            lastUpdated: Date.now(),
          };
        });
      },
      
      calculateMarketStatistics: () => {
        const state = get();
        const prices: PriceData[] = Array.from(state.prices.values());
        
        let totalVolume = 0;
        let gainers = 0;
        let losers = 0;
        let topGainer = '';
        let topLoser = '';
        let maxGain = -Infinity;
        let maxLoss = Infinity;
        
        prices.forEach((price: PriceData) => {
          if (price.volume24h) {
            totalVolume += price.volume24h;
          }
          
          if (price.changePercent24h) {
            if (price.changePercent24h > 0) {
              gainers++;
              if (price.changePercent24h > maxGain) {
                maxGain = price.changePercent24h;
                topGainer = price.symbol;
              }
            } else if (price.changePercent24h < 0) {
              losers++;
              if (price.changePercent24h < maxLoss) {
                maxLoss = price.changePercent24h;
                topLoser = price.symbol;
              }
            }
          }
        });
        
        get().updateMarketStatistics({
          totalAssets: prices.length,
          total24hVolume: totalVolume,
          gainersCount: gainers,
          losersCount: losers,
          topGainer,
          topLoser,
        });
      },
      
      initializeMarketData: (data: {
        prices: Record<string, number>;
        marketData: Record<string, PriceData>;
        marketStats: MarketStatistics;
      }) => {
        set((state: MarketState): void => {
          // Clear existing data
          state.prices.clear();
          
          // Add new price data
          Object.values(data.marketData).forEach(priceData => {
            state.prices.set(priceData.symbol, priceData);
          });
          
          // Add simple prices for any missing symbols
          Object.entries(data.prices).forEach(([symbol, price]) => {
            if (!state.prices.has(symbol)) {
              state.prices.set(symbol, {
                symbol,
                price,
                timestamp: Date.now(),
              });
            }
          });
          
          // Update market statistics
          state.marketStatistics = data.marketStats;
          state.lastUpdate = Date.now();
          
          // Update loading state
          state.loadingState = {
            loading: false,
            error: null,
            lastUpdated: Date.now(),
          };
        });
      },
      
      getMarketOverview: () => {
        const state = get();
        const prices: PriceData[] = Array.from(state.prices.values());
        
        const gainers: PriceData[] = prices
          .filter((p: PriceData) => (p.changePercent24h || 0) > 0)
          .sort((a: PriceData, b: PriceData) => (b.changePercent24h || 0) - (a.changePercent24h || 0))
          .slice(0, 10);
        
        const losers: PriceData[] = prices
          .filter((p: PriceData) => (p.changePercent24h || 0) < 0)
          .sort((a: PriceData, b: PriceData) => (a.changePercent24h || 0) - (b.changePercent24h || 0))
          .slice(0, 10);
        
        const topVolume: PriceData[] = prices
          .filter((p: PriceData) => p.volume24h && p.volume24h > 0)
          .sort((a: PriceData, b: PriceData) => (b.volume24h || 0) - (a.volume24h || 0))
          .slice(0, 10);
        
        const totalMarketCap = prices
          .reduce((sum: number, p: PriceData) => sum + (p.marketCap || 0), 0);
        
        return {
          totalAssets: prices.length,
          gainers,
          losers,
          topVolume,
          marketCap: totalMarketCap,
        };
      },
      
      // Subscriptions
      addSubscription: (subscription: string) => {
        set((state: MarketState): void => {
          state.subscriptions.add(subscription);
        });
      },
      
      removeSubscription: (subscription: string) => {
        set((state: MarketState): void => {
          state.subscriptions.delete(subscription);
        });
      },
      
      clearSubscriptions: () => {
        set((state: MarketState): void => {
          state.subscriptions.clear();
        });
      },
      
      // Utility
      reset: () => {
        set(() => ({
          ...initialState,
          prices: new Map(),
          orderBooks: new Map(),
          candles: new Map(),
          priceHistory: new Map(),
          subscriptions: new Set(),
        }));
      },
    })),
    { name: 'market-store' }
  )
);

// Subscribe to connection events
storeEvents.subscribe(STORE_EVENTS.CONNECTION_CHANGED, (data: any) => {
  console.log('Market store: Connection status changed:', data);
});

// Hook to get price data for a specific symbol
export const useSymbolPrice = (symbol: string) => {
  return useMarketStore((state) => state.getPrice(symbol));
};