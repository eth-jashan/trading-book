'use client';

import React, { useMemo, useState } from 'react';
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
  CalendarIcon,
  DollarSignIcon,
  FilterIcon,
  InfoIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StarIcon,
  ShieldIcon,
  TimerIcon,
  ZapIcon
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
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

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
    <div className={cn("p-4 space-y-6", className)}>
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <BarChart3Icon className="h-5 w-5" />
          </div>
          <div>
            {/* <h3 className="text-lg font-semibold">Performance Analytics</h3> */}
            <p className="text-sm text-muted-foreground">Comprehensive trading performance overview</p>
          </div>
        </div>

       
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PerformanceCard
          title="Total P&L"
          value={formatNumber(performanceMetrics.totalRealizedPnl, { currency: true })}
          subtitle={`From ${performanceMetrics.totalTrades} completed trades`}
          trend={performanceMetrics.totalRealizedPnl > 0 ? 'up' : performanceMetrics.totalRealizedPnl < 0 ? 'down' : 'neutral'}
          icon={<DollarSignIcon className="h-4 w-4" />}
          featured
        />

        <PerformanceCard
          title="Win Rate"
          value={`${performanceMetrics.winRate.toFixed(1)}%`}
          subtitle={`${performanceMetrics.winners}W • ${performanceMetrics.losers}L`}
          trend={performanceMetrics.winRate > 50 ? 'up' : performanceMetrics.winRate < 50 ? 'down' : 'neutral'}
          icon={<TargetIcon className="h-4 w-4" />}
          progress={performanceMetrics.winRate}
        />

        <PerformanceCard
          title="Profit Factor"
          value={performanceMetrics.profitFactor.toFixed(2)}
          subtitle="Gross profit / loss ratio"
          trend={performanceMetrics.profitFactor > 1 ? 'up' : 'down'}
          icon={<TrophyIcon className="h-4 w-4" />}
        />

        <PerformanceCard
          title="Avg Hold Time"
          value={formatDuration(performanceMetrics.avgHoldingTime)}
          subtitle="Average position duration"
          trend="neutral"
          icon={<TimerIcon className="h-4 w-4" />}
        />
      </div>

      {/* Live Position Status */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ZapIcon className="h-4 w-4 text-orange-500" />
              Live Positions ({performanceMetrics.openPositions})
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Real-time P&L
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Open Positions</span>
              </div>
              <div className="text-2xl font-bold">
                {performanceMetrics.openPositions}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {performanceMetrics.totalUnrealizedPnl > 0 ? (
                  <ArrowUpIcon className="h-4 w-4 text-green-500" />
                ) : performanceMetrics.totalUnrealizedPnl < 0 ? (
                  <ArrowDownIcon className="h-4 w-4 text-red-500" />
                ) : (
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-muted-foreground">Unrealized P&L</span>
              </div>
              <div className={cn(
                "text-2xl font-bold",
                performanceMetrics.totalUnrealizedPnl > 0 && 'text-green-500',
                performanceMetrics.totalUnrealizedPnl < 0 && 'text-red-500',
                performanceMetrics.totalUnrealizedPnl === 0 && 'text-muted-foreground'
              )}>
                {performanceMetrics.totalUnrealizedPnl > 0 && '+'}
                {formatNumber(performanceMetrics.totalUnrealizedPnl, { currency: true })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldIcon className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-muted-foreground">Total Exposure</span>
              </div>
              <div className="text-2xl font-bold text-blue-500">
                {formatNumber(Math.abs(performanceMetrics.totalUnrealizedPnl) + Math.abs(performanceMetrics.totalRealizedPnl), { currency: true, compact: true })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === 'overview' ? (
        <>
          {/* Trading Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TradingHighlight
              type="best"
              trade={performanceMetrics.bestTrade}
              formatNumber={formatNumber}
            />
            
            <TradingHighlight
              type="worst"
              trade={performanceMetrics.worstTrade}
              formatNumber={formatNumber}
            />
          </div>

          {/* Top Assets Performance */}
          <AssetPerformanceOverview
            assetPerformance={performanceMetrics.assetPerformance.slice(0, 5)}
            formatNumber={formatNumber}
          />
        </>
      ) : (
        <>
          {/* Detailed Performance Breakdown */}
          <DetailedPerformanceBreakdown
            avgWin={performanceMetrics.avgWin}
            avgLoss={performanceMetrics.avgLoss}
            profitFactor={performanceMetrics.profitFactor}
            formatNumber={formatNumber}
          />

          {/* Complete Asset Performance */}
          <AssetPerformanceDetailed
            assetPerformance={performanceMetrics.assetPerformance}
            formatNumber={formatNumber}
          />
        </>
      )}
    </div>
  );
}

// Performance Card Component
function PerformanceCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  icon, 
  featured = false,
  progress 
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  trend: 'up' | 'down' | 'neutral'; 
  icon: React.ReactNode;
  featured?: boolean;
  progress?: number;
}) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getTrendBg = () => {
    if (trend === 'up') return 'bg-green-500/10 text-green-500';
    if (trend === 'down') return 'bg-red-500/10 text-red-500';
    return 'bg-accent text-muted-foreground';
  };

  return (
    <Card className={cn(
      "transition-all hover:shadow-sm",
      featured && "border-primary/20 bg-primary/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-muted-foreground">{title}</div>
          <div className={cn("p-2 rounded-lg", getTrendBg())}>
            {icon}
          </div>
        </div>
        
        <div className={cn("text-2xl font-bold mb-1", getTrendColor())}>
          {value}
        </div>
        
        {progress !== undefined && (
          <div className="mb-2">
            <div className="h-2 bg-accent rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  trend === 'up' && 'bg-green-500',
                  trend === 'down' && 'bg-red-500',
                  trend === 'neutral' && 'bg-primary'
                )}
                style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

// Trading Highlight Component
function TradingHighlight({ 
  type, 
  trade, 
  formatNumber 
}: { 
  type: 'best' | 'worst'; 
  trade: Position | null;
  formatNumber: (value: number, options?: any) => string;
}) {
  const isBest = type === 'best';
  
  return (
    <Card className={cn(
      "transition-all hover:shadow-sm",
      isBest ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className={cn(
          "flex items-center gap-2 text-base",
          isBest ? "text-green-500" : "text-red-500"
        )}>
          {isBest ? <StarIcon className="h-5 w-5" /> : <AlertTriangleIcon className="h-5 w-5" />}
          {isBest ? 'Best Performing Trade' : 'Most Challenging Trade'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trade ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{trade.symbol}</p>
                <p className="text-sm text-muted-foreground">
                  {trade.side.toUpperCase()} • Size: {trade.size}
                </p>
              </div>
              <div className="text-right">
                <p className={cn(
                  "text-2xl font-bold",
                  isBest ? "text-green-500" : "text-red-500"
                )}>
                  {isBest ? '+' : ''}{formatNumber(trade.realizedPnl || 0, { currency: true })}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p>No completed trades yet</p>
            <p className="text-xs mt-1">Your trading highlights will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Asset Performance Overview Component
function AssetPerformanceOverview({ 
  assetPerformance, 
  formatNumber 
}: {
  assetPerformance: Array<{
    symbol: string;
    trades: number;
    wins: number;
    totalPnl: number;
    winRate: number;
  }>;
  formatNumber: (value: number, options?: any) => string;
}) {
  if (assetPerformance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Top Asset Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <PieChartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No asset performance data yet</p>
            <p className="text-xs mt-1">Complete some trades to see your top performers</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-4 w-4" />
          Top Asset Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {assetPerformance.map((asset, index) => (
            <motion.div
              key={asset.symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  index === 0 && "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400",
                  index === 1 && "bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400",
                  index === 2 && "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400",
                  index > 2 && "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
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
                  "text-lg font-bold",
                  asset.totalPnl > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {asset.totalPnl > 0 && '+'}
                  {formatNumber(asset.totalPnl, { currency: true })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Detailed Performance Breakdown Component
function DetailedPerformanceBreakdown({ 
  avgWin, 
  avgLoss, 
  profitFactor, 
  formatNumber 
}: {
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  formatNumber: (value: number, options?: any) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3Icon className="h-4 w-4" />
          Detailed Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUpIcon className="h-4 w-4 text-green-500" />
              <span className="font-medium">Average Win</span>
            </div>
            <div className="text-2xl font-bold text-green-500">
              {formatNumber(avgWin, { currency: true })}
            </div>
            <div className="text-xs text-muted-foreground">
              Per winning trade
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowDownIcon className="h-4 w-4 text-red-500" />
              <span className="font-medium">Average Loss</span>
            </div>
            <div className="text-2xl font-bold text-red-500">
              {formatNumber(Math.abs(avgLoss), { currency: true })}
            </div>
            <div className="text-xs text-muted-foreground">
              Per losing trade
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TargetIcon className="h-4 w-4 text-primary" />
              <span className="font-medium">Risk-Reward Ratio</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              1:{avgLoss > 0 ? (avgWin / Math.abs(avgLoss)).toFixed(2) : '0.00'}
            </div>
            <div className="text-xs text-muted-foreground">
              Win to loss ratio
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Asset Performance Detailed Component
function AssetPerformanceDetailed({ 
  assetPerformance, 
  formatNumber 
}: {
  assetPerformance: Array<{
    symbol: string;
    trades: number;
    wins: number;
    totalPnl: number;
    winRate: number;
  }>;
  formatNumber: (value: number, options?: any) => string;
}) {
  if (assetPerformance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Complete Asset Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <PieChartIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No trading data available</p>
            <p className="text-sm mt-2">Start trading to see detailed asset performance analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-4 w-4" />
          Complete Asset Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Asset</th>
                <th className="text-center py-2">Trades</th>
                <th className="text-center py-2">Win Rate</th>
                <th className="text-right py-2">Total P&L</th>
              </tr>
            </thead>
            <tbody>
              {assetPerformance.map((asset, index) => (
                <tr key={asset.symbol} className="border-b hover:bg-accent/50 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        index < 3 ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <span className="font-medium">{asset.symbol}</span>
                    </div>
                  </td>
                  <td className="text-center py-3">
                    <span className="px-2 py-1 bg-accent rounded text-sm">
                      {asset.trades}
                    </span>
                  </td>
                  <td className="text-center py-3">
                    <span className={cn(
                      "px-2 py-1 rounded text-sm font-medium",
                      asset.winRate >= 50 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {asset.winRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right py-3">
                    <span className={cn(
                      "font-bold",
                      asset.totalPnl > 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {asset.totalPnl > 0 && '+'}
                      {formatNumber(asset.totalPnl, { currency: true })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}