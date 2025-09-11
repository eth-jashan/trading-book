//@ts-nocheck
import { useMemo } from 'react';
import { useTradingStore } from '@/stores/trading/trading.store';
import { useMarketStore } from '@/stores/market/market.store';
import { Position } from '@/lib/types';

export interface PositionPerformanceMetrics {
  // Basic counts
  totalTrades: number;
  openPositions: number;
  
  // Win/Loss statistics
  winRate: number;
  winners: number;
  losers: number;
  
  // P&L metrics
  totalRealizedPnl: number;
  totalUnrealizedPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  
  // Time metrics
  avgHoldingTime: number;
  
  // Best/worst performance
  bestTrade: Position | null;
  worstTrade: Position | null;
  
  // Asset performance breakdown
  assetPerformance: AssetPerformance[];
  
  // Risk metrics
  maxDrawdown: number;
  currentDrawdown: number;
  sharpeRatio: number;
  
  // Volume metrics
  totalVolume: number;
  avgTradeSize: number;
}

export interface AssetPerformance {
  symbol: string;
  trades: number;
  wins: number;
  totalPnl: number;
  winRate: number;
  avgHoldTime: number;
  volume: number;
  maxWin: number;
  maxLoss: number;
}

export interface TradePerformanceByDay {
  date: string;
  trades: number;
  pnl: number;
  winRate: number;
}

export function usePositionPerformance() {
  const { positions } = useTradingStore();
  const marketStore = useMarketStore();

  const performanceMetrics = useMemo((): PositionPerformanceMetrics => {
    const openPositions = positions.filter(p => p.status === 'open');
    const closedPositions = positions.filter(p => p.status === 'closed');
    
    // Win/Loss Statistics
    const winners = closedPositions.filter(p => (p.realizedPnl || 0) > 0);
    const losers = closedPositions.filter(p => (p.realizedPnl || 0) < 0);
    const winRate = closedPositions.length > 0 ? (winners.length / closedPositions.length) * 100 : 0;
    
    // P&L Statistics
    const totalRealizedPnl = closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
    const avgWin = winners.length > 0 ? winners.reduce((sum, p) => sum + (p.realizedPnl || 0), 0) / winners.length : 0;
    const avgLoss = losers.length > 0 ? Math.abs(losers.reduce((sum, p) => sum + (p.realizedPnl || 0), 0)) / losers.length : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * winners.length) / (avgLoss * losers.length) : 0;
    
    // Current unrealized P&L for open positions
    let totalUnrealizedPnl = 0;
    openPositions.forEach(position => {
      const currentPrice = marketStore.getPrice(position.symbol)?.price || position.currentPrice;
      const priceDiff = currentPrice - position.entryPrice;
      const multiplier = position.side === 'long' ? 1 : -1;
      const unrealizedPnl = priceDiff * position.size * multiplier;
      totalUnrealizedPnl += unrealizedPnl;
    });
    
    // Time analysis
    const now = Date.now();
    const avgHoldingTime = closedPositions.length > 0 
      ? closedPositions.reduce((sum, p) => sum + ((p.closedAt || now) - p.timestamp), 0) / closedPositions.length 
      : 0;
    
    // Best and worst trades
    const bestTrade = closedPositions.reduce((best, p) => 
      (p.realizedPnl || 0) > (best?.realizedPnl || -Infinity) ? p : best, null);
    const worstTrade = closedPositions.reduce((worst, p) => 
      (p.realizedPnl || 0) < (worst?.realizedPnl || Infinity) ? p : worst, null);
    
    // Volume metrics
    const totalVolume = positions.reduce((sum, p) => sum + (p.size * p.entryPrice), 0);
    const avgTradeSize = positions.length > 0 ? totalVolume / positions.length : 0;
    
    // Asset performance breakdown
    const assetMap = new Map<string, {
      symbol: string;
      trades: number;
      wins: number;
      totalPnl: number;
      winRate: number;
      avgHoldTime: number;
      volume: number;
      maxWin: number;
      maxLoss: number;
      totalHoldTime: number;
    }>();
    
    closedPositions.forEach(position => {
      const existing = assetMap.get(position.symbol) || {
        symbol: position.symbol,
        trades: 0,
        wins: 0,
        totalPnl: 0,
        winRate: 0,
        avgHoldTime: 0,
        volume: 0,
        maxWin: 0,
        maxLoss: 0,
        totalHoldTime: 0,
      };
      
      const pnl = position.realizedPnl || 0;
      const holdTime = (position.closedAt || now) - position.timestamp;
      const positionVolume = position.size * position.entryPrice;
      
      existing.trades++;
      existing.totalPnl += pnl;
      existing.totalHoldTime += holdTime;
      existing.volume += positionVolume;
      existing.maxWin = Math.max(existing.maxWin, pnl);
      existing.maxLoss = Math.min(existing.maxLoss, pnl);
      
      if (pnl > 0) existing.wins++;
      
      existing.winRate = (existing.wins / existing.trades) * 100;
      existing.avgHoldTime = existing.totalHoldTime / existing.trades;
      
      assetMap.set(position.symbol, existing);
    });
    
    const assetPerformance: AssetPerformance[] = Array.from(assetMap.values())
      .sort((a, b) => b.totalPnl - a.totalPnl);
    
    // Calculate drawdown metrics
    let peak = 0;
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    let runningPnl = 0;
    
    // Sort positions by timestamp for drawdown calculation
    const chronologicalPositions = [...closedPositions].sort((a, b) => a.timestamp - b.timestamp);
    
    chronologicalPositions.forEach(position => {
      runningPnl += (position.realizedPnl || 0);
      
      if (runningPnl > peak) {
        peak = runningPnl;
      }
      
      const drawdown = peak - runningPnl;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });
    
    // Current drawdown is based on current running P&L vs historical peak
    currentDrawdown = peak - (totalRealizedPnl + totalUnrealizedPnl);
    
    // Simple Sharpe ratio calculation (annualized)
    // This is simplified - in reality, you'd want risk-free rate and more sophisticated calculation
    const returns = closedPositions.map(p => (p.realizedPnl || 0) / (p.size * p.entryPrice));
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const returnVariance = returns.length > 1 
      ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)
      : 0;
    const returnStdDev = Math.sqrt(returnVariance);
    const sharpeRatio = returnStdDev > 0 ? (avgReturn / returnStdDev) * Math.sqrt(252) : 0; // Annualized
    
    return {
      totalTrades: closedPositions.length,
      openPositions: openPositions.length,
      winRate,
      winners: winners.length,
      losers: losers.length,
      totalRealizedPnl,
      totalUnrealizedPnl,
      avgWin,
      avgLoss,
      profitFactor,
      avgHoldingTime,
      bestTrade,
      worstTrade,
      assetPerformance,
      maxDrawdown,
      currentDrawdown,
      sharpeRatio,
      totalVolume,
      avgTradeSize,
    };
  }, [positions, marketStore]);

  // Performance by time period
  const performanceByDay = useMemo((): TradePerformanceByDay[] => {
    const closedPositions = positions.filter(p => p.status === 'closed');
    const dayMap = new Map<string, { trades: number; pnl: number; wins: number }>();
    
    closedPositions.forEach(position => {
      if (!position.closedAt) return;
      
      const date = new Date(position.closedAt).toISOString().split('T')[0];
      const existing = dayMap.get(date) || { trades: 0, pnl: 0, wins: 0 };
      
      existing.trades++;
      existing.pnl += (position.realizedPnl || 0);
      if ((position.realizedPnl || 0) > 0) existing.wins++;
      
      dayMap.set(date, existing);
    });
    
    return Array.from(dayMap.entries())
      .map(([date, data]) => ({
        date,
        trades: data.trades,
        pnl: data.pnl,
        winRate: (data.wins / data.trades) * 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [positions]);

  return {
    performanceMetrics,
    performanceByDay,
  };
}