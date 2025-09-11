'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUpIcon, 
  TrendingDownIcon,
  TargetIcon,
  ClockIcon,
  TrophyIcon,
  AlertTriangleIcon,
  BarChart3Icon,
  PieChartIcon,
  ActivityIcon,
  CalendarIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatNumber } from '@/lib/utils';
import { useTradingStore } from '@/stores/trading/trading.store';
import { useMarketStore } from '@/stores/market/market.store';
import { Position } from '@/lib/types';

interface PositionPerformanceProps {
  className?: string;
}

export function PositionPerformanceDashboard({ className }: PositionPerformanceProps) {
  const { positions } = useTradingStore();
  const marketStore = useMarketStore();

  // Calculate position performance metrics
  const performanceMetrics = useMemo(() => {
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
    
    // Holding time analysis
    const now = Date.now();
    const avgHoldingTime = closedPositions.length > 0 
      ? closedPositions.reduce((sum, p) => sum + ((p.closedAt || now) - p.timestamp), 0) / closedPositions.length 
      : 0;
    
    // Best and worst trades
    const bestTrade = closedPositions.reduce((best, p) => 
      (p.realizedPnl || 0) > (best?.realizedPnl || -Infinity) ? p : best, null);
    const worstTrade = closedPositions.reduce((worst, p) => 
      (p.realizedPnl || 0) < (worst?.realizedPnl || Infinity) ? p : worst, null);
    
    // Asset performance breakdown
    const assetPerformance = new Map<string, {
      symbol: string;
      trades: number;
      wins: number;
      totalPnl: number;
      winRate: number;
    }>();
    
    closedPositions.forEach(position => {
      const existing = assetPerformance.get(position.symbol) || {
        symbol: position.symbol,
        trades: 0,
        wins: 0,
        totalPnl: 0,
        winRate: 0
      };
      
      existing.trades++;
      existing.totalPnl += (position.realizedPnl || 0);
      if ((position.realizedPnl || 0) > 0) existing.wins++;
      existing.winRate = (existing.wins / existing.trades) * 100;
      
      assetPerformance.set(position.symbol, existing);
    });
    
    return {
      // Basic metrics
      totalTrades: closedPositions.length,
      openPositions: openPositions.length,
      winRate,
      winners: winners.length,
      losers: losers.length,
      
      // P&L metrics
      totalRealizedPnl,
      totalUnrealizedPnl,
      avgWin,
      avgLoss,
      profitFactor,
      
      // Time metrics
      avgHoldingTime,
      
      // Best/worst trades
      bestTrade,
      worstTrade,
      
      // Asset breakdown
      assetPerformance: Array.from(assetPerformance.values())
        .sort((a, b) => b.totalPnl - a.totalPnl)
        .slice(0, 10) // Top 10 performing assets
    };
  }, [positions, marketStore]);

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))}m`;
    return `${Math.floor(ms / (1000 * 60))}m`;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      {/* <div className="flex items-center gap-2">
        <BarChart3Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Position Performance Analytics</h2>
      </div> */}

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {performanceMetrics.winRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {performanceMetrics.winners}W / {performanceMetrics.losers}L
                </p>
              </div>
              <div className={cn(
                "p-2 rounded-full",
                performanceMetrics.winRate > 50 
                  ? "bg-green-100 dark:bg-green-900/20" 
                  : "bg-red-100 dark:bg-red-900/20"
              )}>
                <TrophyIcon className={cn(
                  "h-4 w-4",
                  performanceMetrics.winRate > 50 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-red-600 dark:text-red-400"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total P&L</p>
                <p className={cn(
                  "text-2xl font-bold",
                  performanceMetrics.totalRealizedPnl > 0 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-red-600 dark:text-red-400"
                )}>
                  {formatNumber(performanceMetrics.totalRealizedPnl, { currency: true, compact: true })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Realized from {performanceMetrics.totalTrades} trades
                </p>
              </div>
              <div className={cn(
                "p-2 rounded-full",
                performanceMetrics.totalRealizedPnl > 0 
                  ? "bg-green-100 dark:bg-green-900/20" 
                  : "bg-red-100 dark:bg-red-900/20"
              )}>
                {performanceMetrics.totalRealizedPnl > 0 ? (
                  <TrendingUpIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDownIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profit Factor</p>
                <p className={cn(
                  "text-2xl font-bold",
                  performanceMetrics.profitFactor > 1 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-red-600 dark:text-red-400"
                )}>
                  {performanceMetrics.profitFactor.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Gross profit / Gross loss
                </p>
              </div>
              <div className={cn(
                "p-2 rounded-full",
                performanceMetrics.profitFactor > 1 
                  ? "bg-green-100 dark:bg-green-900/20" 
                  : "bg-red-100 dark:bg-red-900/20"
              )}>
                <TargetIcon className={cn(
                  "h-4 w-4",
                  performanceMetrics.profitFactor > 1 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-red-600 dark:text-red-400"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Hold Time</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatDuration(performanceMetrics.avgHoldingTime)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Per position
                </p>
              </div>
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <ClockIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Open Positions Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-4 w-4" />
            Current Positions ({performanceMetrics.openPositions})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Unrealized P&L</p>
              <p className={cn(
                "text-xl font-bold",
                performanceMetrics.totalUnrealizedPnl > 0 
                  ? "text-green-600 dark:text-green-400" 
                  : performanceMetrics.totalUnrealizedPnl < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
              )}>
                {performanceMetrics.totalUnrealizedPnl > 0 && '+'}
                {formatNumber(performanceMetrics.totalUnrealizedPnl, { currency: true })}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Open Positions</p>
              <p className="text-xl font-bold text-foreground">
                {performanceMetrics.openPositions}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best and Worst Trades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <TrophyIcon className="h-4 w-4" />
              Best Trade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {performanceMetrics.bestTrade ? (
              <div className="space-y-2">
                <p className="font-semibold">{performanceMetrics.bestTrade.symbol}</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  +{formatNumber(performanceMetrics.bestTrade.realizedPnl || 0, { currency: true })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {performanceMetrics.bestTrade.side.toUpperCase()} • 
                  Size: {performanceMetrics.bestTrade.size}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No completed trades yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangleIcon className="h-4 w-4" />
              Worst Trade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {performanceMetrics.worstTrade ? (
              <div className="space-y-2">
                <p className="font-semibold">{performanceMetrics.worstTrade.symbol}</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatNumber(performanceMetrics.worstTrade.realizedPnl || 0, { currency: true })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {performanceMetrics.worstTrade.side.toUpperCase()} • 
                  Size: {performanceMetrics.worstTrade.size}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No completed trades yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Asset Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {performanceMetrics.assetPerformance.length > 0 ? (
            <div className="space-y-3">
              {performanceMetrics.assetPerformance.map((asset, index) => (
                <motion.div
                  key={asset.symbol}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/20"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0 ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400" :
                      index === 1 ? "bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400" :
                      index === 2 ? "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400" :
                      "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{asset.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.trades} trades • {asset.winRate.toFixed(1)}% win rate
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-bold",
                      asset.totalPnl > 0 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {asset.totalPnl > 0 && '+'}
                      {formatNumber(asset.totalPnl, { currency: true })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No completed trades yet. Your asset performance will appear here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}