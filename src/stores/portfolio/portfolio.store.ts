//@ts-nocheck
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  PortfolioMetrics, 
  PerformanceHistory, 
  TradeAnalytics, 
  LoadingState,
  Position,
  Transaction 
} from '@/lib/types';
import { storeEvents, STORE_EVENTS } from '../middleware';
import { useTradingStore } from '../trading/trading.store';
import { TRADING_CONFIG } from '@/lib/constants';

interface PortfolioState {
  // Historical Data
  performanceHistory: PerformanceHistory[];
  dailySnapshots: Map<string, PerformanceHistory>; // date -> snapshot
  
  // Analytics
  metrics: PortfolioMetrics;
  tradeAnalytics: Map<string, TradeAnalytics>; // symbol -> analytics
  
  // Benchmarking
  benchmarkData: Array<{
    timestamp: number;
    value: number;
    source: string;
  }>;
  
  // State
  loadingState: LoadingState;
  lastUpdate: number;
  autoSnapshotEnabled: boolean;
  snapshotInterval: number; // in milliseconds
  snapshotTimer: NodeJS.Timeout | null;
  
  // Actions - Data Management
  addPerformanceSnapshot: (manual?: boolean) => void;
  updateMetrics: () => void;
  updateTradeAnalytics: (symbol: string, position: Position) => void;
  
  // Actions - Historical Data
  getPerformanceByPeriod: (period: 'day' | 'week' | 'month' | 'year' | 'all') => PerformanceHistory[];
  getPerformanceByDateRange: (startDate: Date, endDate: Date) => PerformanceHistory[];
  getDailyReturns: () => Array<{ date: string; return: number }>;
  getMonthlyReturns: () => Array<{ month: string; return: number }>;
  
  // Actions - Analytics Calculations
  calculateSharpeRatio: (period: number) => number;
  calculateMaxDrawdown: () => { maxDrawdown: number; drawdownDuration: number };
  calculateVolatility: (period: number) => number;
  calculateSortino: (period: number) => number;
  calculateBeta: () => number;
  calculateAlpha: () => number;
  
  // Actions - Trade Analytics
  getWinLossStats: () => {
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    largestWin: number;
    largestLoss: number;
  };
  getTradesBySymbol: (symbol: string) => TradeAnalytics;
  getTopPerformingAssets: (limit?: number) => Array<{ symbol: string; pnl: number; winRate: number }>;
  
  // Actions - Benchmarking
  addBenchmarkData: (timestamp: number, value: number, source: string) => void;
  calculateRelativePerformance: () => number;
  
  // Actions - Configuration
  setAutoSnapshot: (enabled: boolean, intervalMs?: number) => void;
  startAutoSnapshot: () => void;
  stopAutoSnapshot: () => void;
  
  // Utilities
  exportData: () => string;
  importData: (data: string) => void;
  reset: () => void;
}

const INITIAL_METRICS: PortfolioMetrics = {
  totalValue: TRADING_CONFIG.DEFAULT_BALANCE,
  totalPnL: 0,
  totalPnLPercentage: 0,
  winRate: 0,
  avgWin: 0,
  avgLoss: 0,
  profitFactor: 0,
  sharpeRatio: 0,
  maxDrawdown: 0,
  currentDrawdown: 0,
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
};

const initialState = {
  performanceHistory: [],
  dailySnapshots: new Map<string, PerformanceHistory>(),
  metrics: { ...INITIAL_METRICS },
  tradeAnalytics: new Map<string, TradeAnalytics>(),
  benchmarkData: [],
  loadingState: {
    status: 'idle' as const,
    error: null,
    lastUpdated: null,
  },
  lastUpdate: Date.now(),
  autoSnapshotEnabled: true,
  snapshotInterval: 300000, // 5 minutes
  snapshotTimer: null,
};

export const usePortfolioStore = create<PortfolioState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Data Management
        addPerformanceSnapshot: (manual = false) => {
          const tradingStore = useTradingStore.getState();
          const { balance, positions } = tradingStore;
          
          const timestamp = Date.now();
          const totalPnL = balance.realizedPnl + balance.unrealizedPnl;
          const equity = balance.total + balance.unrealizedPnl;
          
          const snapshot: PerformanceHistory = {
            timestamp,
            balance: balance.total,
            pnl: totalPnL,
            equity,
          };
          
          set((state) => {
            // Add to performance history
            state.performanceHistory.push(snapshot);
            
            // Keep only last 10,000 snapshots for performance
            if (state.performanceHistory.length > 10000) {
              state.performanceHistory = state.performanceHistory.slice(-10000);
            }
            
            // Add daily snapshot (one per day)
            const dateKey = new Date(timestamp).toISOString().split('T')[0];
            state.dailySnapshots.set(dateKey, snapshot);
            
            state.lastUpdate = timestamp;
          });
          
          // Update metrics after adding snapshot
          get().updateMetrics();
          
          if (manual) {
            console.log('Manual portfolio snapshot added:', snapshot);
          }
        },
        
        updateMetrics: () => {
          const tradingStore = useTradingStore.getState();
          const { balance, positions } = tradingStore;
          
          const closedPositions = positions.filter(p => p.status === 'closed');
          const wins = closedPositions.filter(p => (p.realizedPnl || 0) > 0);
          const losses = closedPositions.filter(p => (p.realizedPnl || 0) < 0);
          
          const totalWins = wins.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
          const totalLosses = Math.abs(losses.reduce((sum, p) => sum + (p.realizedPnl || 0), 0));
          
          const totalTrades = closedPositions.length;
          const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
          const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
          const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
          const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
          
          const totalPnL = balance.realizedPnl + balance.unrealizedPnl;
          const totalPnLPercentage = (totalPnL / TRADING_CONFIG.DEFAULT_BALANCE) * 100;
          
          const sharpeRatio = get().calculateSharpeRatio(252); // Annualized
          const { maxDrawdown, drawdownDuration } = get().calculateMaxDrawdown();
          
          const metrics: PortfolioMetrics = {
            totalValue: balance.total + balance.unrealizedPnl,
            totalPnL,
            totalPnLPercentage,
            winRate,
            avgWin,
            avgLoss,
            profitFactor,
            sharpeRatio,
            maxDrawdown,
            currentDrawdown: 0, // Calculate based on recent peak
            totalTrades,
            winningTrades: wins.length,
            losingTrades: losses.length,
          };
          
          set((state) => {
            state.metrics = metrics;
          });
        },
        
        updateTradeAnalytics: (symbol: string, position: Position) => {
          if (position.status !== 'closed' || !position.realizedPnl) return;
          
          set((state) => {
            const existing = state.tradeAnalytics.get(symbol) || {
              symbol,
              totalTrades: 0,
              winRate: 0,
              avgProfit: 0,
              avgLoss: 0,
              largestWin: 0,
              largestLoss: 0,
              totalVolume: 0,
              avgHoldTime: 0,
            };
            
            const isWin = position.realizedPnl > 0;
            const holdTime = position.closedAt ? position.closedAt - position.timestamp : 0;
            
            // Update statistics
            existing.totalTrades++;
            existing.totalVolume += position.size * position.entryPrice;
            
            if (isWin) {
              existing.largestWin = Math.max(existing.largestWin, position.realizedPnl);
              existing.avgProfit = ((existing.avgProfit * (existing.totalTrades - 1)) + position.realizedPnl) / existing.totalTrades;
            } else {
              existing.largestLoss = Math.min(existing.largestLoss, position.realizedPnl);
              existing.avgLoss = ((existing.avgLoss * (existing.totalTrades - 1)) + Math.abs(position.realizedPnl)) / existing.totalTrades;
            }
            
            // Calculate win rate
            const wins = existing.totalTrades > 0 ? existing.avgProfit * existing.totalTrades / (existing.avgProfit || 1) : 0;
            existing.winRate = (wins / existing.totalTrades) * 100;
            
            // Update average hold time
            existing.avgHoldTime = ((existing.avgHoldTime * (existing.totalTrades - 1)) + holdTime) / existing.totalTrades;
            
            state.tradeAnalytics.set(symbol, existing);
          });
        },
        
        // Historical Data Queries
        getPerformanceByPeriod: (period: 'day' | 'week' | 'month' | 'year' | 'all') => {
          const history = get().performanceHistory;
          if (history.length === 0) return [];
          
          const now = Date.now();
          const periodMs = {
            day: 24 * 60 * 60 * 1000,
            week: 7 * 24 * 60 * 60 * 1000,
            month: 30 * 24 * 60 * 60 * 1000,
            year: 365 * 24 * 60 * 60 * 1000,
            all: Infinity,
          };
          
          const cutoff = now - periodMs[period];
          return history.filter(h => h.timestamp >= cutoff);
        },
        
        getPerformanceByDateRange: (startDate: Date, endDate: Date) => {
          const history = get().performanceHistory;
          const start = startDate.getTime();
          const end = endDate.getTime();
          
          return history.filter(h => h.timestamp >= start && h.timestamp <= end);
        },
        
        getDailyReturns: () => {
          const dailySnapshots = Array.from(get().dailySnapshots.values())
            .sort((a, b) => a.timestamp - b.timestamp);
          
          if (dailySnapshots.length < 2) return [];
          
          return dailySnapshots.slice(1).map((current, index) => {
            const previous = dailySnapshots[index];
            const returnPct = ((current.equity - previous.equity) / previous.equity) * 100;
            
            return {
              date: new Date(current.timestamp).toISOString().split('T')[0],
              return: returnPct,
            };
          });
        },
        
        getMonthlyReturns: () => {
          const monthlyData = new Map<string, PerformanceHistory>();
          
          // Group by month
          get().performanceHistory.forEach(snapshot => {
            const date = new Date(snapshot.timestamp);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            const existing = monthlyData.get(monthKey);
            if (!existing || snapshot.timestamp > existing.timestamp) {
              monthlyData.set(monthKey, snapshot);
            }
          });
          
          const sortedMonths = Array.from(monthlyData.entries())
            .sort(([a], [b]) => a.localeCompare(b));
          
          if (sortedMonths.length < 2) return [];
          
          return sortedMonths.slice(1).map(([month, current], index) => {
            const [, previous] = sortedMonths[index];
            const returnPct = ((current.equity - previous.equity) / previous.equity) * 100;
            
            return {
              month,
              return: returnPct,
            };
          });
        },
        
        // Analytics Calculations
        calculateSharpeRatio: (period: number) => {
          const dailyReturns = get().getDailyReturns();
          if (dailyReturns.length < 2) return 0;
          
          const returns = dailyReturns.map(r => r.return / 100);
          const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
          
          const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
          const volatility = Math.sqrt(variance);
          
          if (volatility === 0) return 0;
          
          // Annualize the Sharpe ratio
          const annualizedReturn = avgReturn * Math.sqrt(period);
          const annualizedVolatility = volatility * Math.sqrt(period);
          
          // Risk-free rate assumed to be 0 for crypto
          return annualizedReturn / annualizedVolatility;
        },
        
        calculateMaxDrawdown: () => {
          const history = get().performanceHistory;
          if (history.length < 2) return { maxDrawdown: 0, drawdownDuration: 0 };
          
          let maxDrawdown = 0;
          let drawdownDuration = 0;
          let peak = history[0].equity;
          let peakTime = history[0].timestamp;
          let currentDrawdownStart = 0;
          
          for (let i = 1; i < history.length; i++) {
            const current = history[i];
            
            if (current.equity > peak) {
              peak = current.equity;
              peakTime = current.timestamp;
              currentDrawdownStart = 0;
            } else {
              if (currentDrawdownStart === 0) {
                currentDrawdownStart = peakTime;
              }
              
              const drawdown = ((peak - current.equity) / peak) * 100;
              if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
                drawdownDuration = current.timestamp - currentDrawdownStart;
              }
            }
          }
          
          return { maxDrawdown, drawdownDuration };
        },
        
        calculateVolatility: (period: number) => {
          const dailyReturns = get().getDailyReturns();
          if (dailyReturns.length < 2) return 0;
          
          const returns = dailyReturns.map(r => r.return / 100);
          const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
          
          const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
          const volatility = Math.sqrt(variance);
          
          // Annualize volatility
          return volatility * Math.sqrt(period) * 100;
        },
        
        calculateSortino: (period: number) => {
          const dailyReturns = get().getDailyReturns();
          if (dailyReturns.length < 2) return 0;
          
          const returns = dailyReturns.map(r => r.return / 100);
          const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
          
          // Only consider negative returns for downside deviation
          const negativeReturns = returns.filter(r => r < 0);
          if (negativeReturns.length === 0) return Infinity;
          
          const downside = negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length;
          const downsideDeviation = Math.sqrt(downside);
          
          if (downsideDeviation === 0) return Infinity;
          
          // Annualize the Sortino ratio
          const annualizedReturn = avgReturn * Math.sqrt(period);
          const annualizedDownside = downsideDeviation * Math.sqrt(period);
          
          return annualizedReturn / annualizedDownside;
        },
        
        calculateBeta: () => {
          // Would need benchmark data to calculate beta
          // Placeholder for now
          return 1.0;
        },
        
        calculateAlpha: () => {
          // Would need benchmark data and risk-free rate to calculate alpha
          // Placeholder for now
          return 0.0;
        },
        
        // Trade Analytics
        getWinLossStats: () => {
          const tradingStore = useTradingStore.getState();
          const closedPositions = tradingStore.positions.filter(p => p.status === 'closed');
          
          const wins = closedPositions.filter(p => (p.realizedPnl || 0) > 0);
          const losses = closedPositions.filter(p => (p.realizedPnl || 0) < 0);
          
          const totalWins = wins.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
          const totalLosses = Math.abs(losses.reduce((sum, p) => sum + (p.realizedPnl || 0), 0));
          
          const largestWin = Math.max(...wins.map(p => p.realizedPnl || 0), 0);
          const largestLoss = Math.min(...losses.map(p => p.realizedPnl || 0), 0);
          
          return {
            totalTrades: closedPositions.length,
            wins: wins.length,
            losses: losses.length,
            winRate: closedPositions.length > 0 ? (wins.length / closedPositions.length) * 100 : 0,
            avgWin: wins.length > 0 ? totalWins / wins.length : 0,
            avgLoss: losses.length > 0 ? totalLosses / losses.length : 0,
            profitFactor: totalLosses > 0 ? totalWins / totalLosses : 0,
            largestWin,
            largestLoss,
          };
        },
        
        getTradesBySymbol: (symbol: string) => {
          return get().tradeAnalytics.get(symbol) || {
            symbol,
            totalTrades: 0,
            winRate: 0,
            avgProfit: 0,
            avgLoss: 0,
            largestWin: 0,
            largestLoss: 0,
            totalVolume: 0,
            avgHoldTime: 0,
          };
        },
        
        getTopPerformingAssets: (limit = 10) => {
          const analytics = Array.from(get().tradeAnalytics.values());
          
          return analytics
            .map(a => ({
              symbol: a.symbol,
              pnl: (a.avgProfit * a.totalTrades) - (a.avgLoss * (a.totalTrades - a.totalTrades * (a.winRate / 100))),
              winRate: a.winRate,
            }))
            .sort((a, b) => b.pnl - a.pnl)
            .slice(0, limit);
        },
        
        // Benchmarking
        addBenchmarkData: (timestamp: number, value: number, source: string) => {
          set((state) => {
            state.benchmarkData.push({ timestamp, value, source });
            
            // Keep only last 1000 benchmark points
            if (state.benchmarkData.length > 1000) {
              state.benchmarkData = state.benchmarkData.slice(-1000);
            }
          });
        },
        
        calculateRelativePerformance: () => {
          // Would compare portfolio performance to benchmark
          // Placeholder for now
          return 0.0;
        },
        
        // Configuration
        setAutoSnapshot: (enabled: boolean, intervalMs?: number) => {
          set((state) => {
            state.autoSnapshotEnabled = enabled;
            if (intervalMs) {
              state.snapshotInterval = intervalMs;
            }
          });
          
          if (enabled) {
            get().startAutoSnapshot();
          } else {
            get().stopAutoSnapshot();
          }
        },
        
        startAutoSnapshot: () => {
          get().stopAutoSnapshot(); // Clear existing timer
          
          const timer = setInterval(() => {
            get().addPerformanceSnapshot(false);
          }, get().snapshotInterval);
          
          set((state) => {
            state.snapshotTimer = timer;
          });
        },
        
        stopAutoSnapshot: () => {
          const timer = get().snapshotTimer;
          if (timer) {
            clearInterval(timer);
            set((state) => {
              state.snapshotTimer = null;
            });
          }
        },
        
        // Utilities
        exportData: () => {
          const state = get();
          const exportData = {
            performanceHistory: state.performanceHistory,
            metrics: state.metrics,
            tradeAnalytics: Array.from(state.tradeAnalytics.entries()),
            benchmarkData: state.benchmarkData,
            timestamp: Date.now(),
          };
          
          return JSON.stringify(exportData, null, 2);
        },
        
        importData: (data: string) => {
          try {
            const importData = JSON.parse(data);
            
            set((state) => {
              state.performanceHistory = importData.performanceHistory || [];
              state.metrics = importData.metrics || { ...INITIAL_METRICS };
              state.tradeAnalytics = new Map(importData.tradeAnalytics || []);
              state.benchmarkData = importData.benchmarkData || [];
              
              // Rebuild daily snapshots
              state.dailySnapshots.clear();
              state.performanceHistory.forEach(snapshot => {
                const dateKey = new Date(snapshot.timestamp).toISOString().split('T')[0];
                state.dailySnapshots.set(dateKey, snapshot);
              });
            });
            
            console.log('Portfolio data imported successfully');
          } catch (error) {
            console.error('Failed to import portfolio data:', error);
          }
        },
        
        reset: () => {
          get().stopAutoSnapshot();
          
          set(() => ({
            ...initialState,
            performanceHistory: [],
            dailySnapshots: new Map<string, PerformanceHistory>(),
            tradeAnalytics: new Map<string, TradeAnalytics>(),
            metrics: { ...INITIAL_METRICS },
          }));
          
          // Add initial snapshot
          get().addPerformanceSnapshot(false);
          
          if (get().autoSnapshotEnabled) {
            get().startAutoSnapshot();
          }
        },
      })),
      {
        name: 'portfolio-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          performanceHistory: state.performanceHistory.slice(-1000), // Keep last 1000 snapshots
          dailySnapshots: Array.from(state.dailySnapshots.entries()),
          metrics: state.metrics,
          tradeAnalytics: Array.from(state.tradeAnalytics.entries()),
          benchmarkData: state.benchmarkData.slice(-100), // Keep last 100 benchmark points
          autoSnapshotEnabled: state.autoSnapshotEnabled,
          snapshotInterval: state.snapshotInterval,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Restore Maps
            state.dailySnapshots = new Map(state.dailySnapshots as any);
            state.tradeAnalytics = new Map(state.tradeAnalytics as any);
            
            // Start auto snapshot if enabled
            if (state.autoSnapshotEnabled) {
              state.startAutoSnapshot();
            }
          }
        },
      }
    ),
    { name: 'portfolio-store' }
  )
);

// Subscribe to trading events to update portfolio analytics
storeEvents.subscribe(STORE_EVENTS.POSITION_CLOSED, (data: any) => {
  const portfolioStore = usePortfolioStore.getState();
  const tradingStore = useTradingStore.getState();
  
  const position = tradingStore.positions.find(p => p.id === data.positionId);
  if (position) {
    portfolioStore.updateTradeAnalytics(position.symbol, position);
    portfolioStore.addPerformanceSnapshot(false);
  }
});

// Subscribe to balance updates to trigger metrics updates
storeEvents.subscribe(STORE_EVENTS.BALANCE_UPDATED, () => {
  const portfolioStore = usePortfolioStore.getState();
  portfolioStore.updateMetrics();
});

// Custom hooks for portfolio analytics
export const usePortfolioMetrics = () => {
  const metrics = usePortfolioStore(state => state.metrics);
  const getWinLossStats = usePortfolioStore(state => state.getWinLossStats);
  const calculateSharpeRatio = usePortfolioStore(state => state.calculateSharpeRatio);
  const calculateMaxDrawdown = usePortfolioStore(state => state.calculateMaxDrawdown);
  
  return {
    metrics,
    getWinLossStats,
    calculateSharpeRatio,
    calculateMaxDrawdown,
  };
};

export const usePerformanceHistory = () => {
  const performanceHistory = usePortfolioStore(state => state.performanceHistory);
  const getPerformanceByPeriod = usePortfolioStore(state => state.getPerformanceByPeriod);
  const getDailyReturns = usePortfolioStore(state => state.getDailyReturns);
  const getMonthlyReturns = usePortfolioStore(state => state.getMonthlyReturns);
  
  return {
    performanceHistory,
    getPerformanceByPeriod,
    getDailyReturns,
    getMonthlyReturns,
  };
};