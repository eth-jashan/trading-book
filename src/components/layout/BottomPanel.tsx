'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  HistoryIcon, 
  WalletIcon, 
  PieChartIcon,
  CalendarIcon,
  TrendingUpIcon,
  BarChart3Icon,
  ActivityIcon
} from 'lucide-react';
import { useTradingStore, usePortfolioMetrics } from '@/stores';
import { Card } from '@/components/ui/card';
import { formatNumber, formatTimestamp, cn } from '@/lib/utils';
import { PositionPerformanceDashboard } from '@/components/analytics/PositionPerformanceDashboard';
import { PositionHeatMap } from '@/components/analytics/PositionHeatMap';

type BottomPanelTab = 'history' | 'portfolio' | 'analytics' | 'performance' | 'heatmap';

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState<BottomPanelTab>('history');
  const { transactions, positions, orders } = useTradingStore();
  const { metrics } = usePortfolioMetrics();
  
  return (
    <div className="flex flex-col h-full bg-card/30 backdrop-blur-sm">
      {/* Tab Header */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <TabButton
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          icon={<HistoryIcon className="h-4 w-4" />}
          label="History"
        />
        <TabButton
          active={activeTab === 'portfolio'}
          onClick={() => setActiveTab('portfolio')}
          icon={<WalletIcon className="h-4 w-4" />}
          label="Portfolio"
        />
        <TabButton
          active={activeTab === 'analytics'}
          onClick={() => setActiveTab('analytics')}
          icon={<PieChartIcon className="h-4 w-4" />}
          label="Analytics"
        />
        <TabButton
          active={activeTab === 'performance'}
          onClick={() => setActiveTab('performance')}
          icon={<BarChart3Icon className="h-4 w-4" />}
          label="Performance"
        />
        <TabButton
          active={activeTab === 'heatmap'}
          onClick={() => setActiveTab('heatmap')}
          icon={<ActivityIcon className="h-4 w-4" />}
          label="Activity"
        />
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {activeTab === 'history' && <HistoryPanel transactions={transactions} />}
          {activeTab === 'portfolio' && <PortfolioPanel positions={positions} />}
          {activeTab === 'analytics' && <AnalyticsPanel metrics={metrics} />}
          {activeTab === 'performance' && <PositionPerformanceDashboard className="p-4" />}
          {activeTab === 'heatmap' && <PositionHeatMap className="p-4" />}
        </motion.div>
      </div>
    </div>
  );
}

// Tab Button Component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2',
        active 
          ? 'text-primary border-primary bg-primary/5' 
          : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/50'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// History Panel
function HistoryPanel({ transactions }: { transactions: any[] }) {
  const recentTransactions = transactions.slice(-20).reverse();
  
  if (recentTransactions.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No transaction history
      </div>
    );
  }
  
  return (
    <div className="overflow-auto">
      <div className="p-2">
        {/* Header */}
        <div className="grid grid-cols-5 gap-4 p-3 text-xs font-medium text-muted-foreground border-b border-gray-200 dark:border-gray-800">
          <span>Time</span>
          <span>Type</span>
          <span>Description</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Balance</span>
        </div>
        
        {/* Transactions */}
        <div className="space-y-1">
          {recentTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="grid grid-cols-5 gap-4 p-3 hover:bg-accent/30 rounded-lg transition-colors"
            >
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {formatTimestamp(transaction.timestamp, 'short')}
              </div>
              
              <div className={cn(
                'text-xs font-medium capitalize px-2 py-1 rounded w-fit',
                transaction.type === 'deposit' && 'bg-success/20 text-green-500',
                transaction.type === 'trade' && 'bg-primary/20 text-primary',
                transaction.type === 'realized_pnl' && 'bg-info/20 text-info'
              )}>
                {transaction.type.replace('_', ' ')}
              </div>
              
              <div className="text-xs truncate">
                {transaction.description}
              </div>
              
              <div className={cn(
                'text-xs font-mono text-right',
                transaction.amount > 0 ? 'text-green-500' : 'text-destructive'
              )}>
                {formatNumber(transaction.amount, { currency: true })}
              </div>
              
              <div className="text-xs font-mono text-right text-muted-foreground">
                {formatNumber(transaction.balance, { currency: true })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Portfolio Panel
function PortfolioPanel({ positions }: { positions: any[] }) {
  const openPositions = positions.filter(p => p.status === 'open');
  const closedPositions = positions.filter(p => p.status === 'closed');
  
  return (
    <div className="overflow-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Open Positions */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUpIcon className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Open Positions ({openPositions.length})</h3>
          </div>
          
          {openPositions.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              No open positions
            </div>
          ) : (
            <div className="space-y-2">
              {openPositions.slice(0, 5).map((position) => (
                <div key={position.id} className="flex justify-between items-center p-2 rounded bg-accent/20">
                  <div>
                    <div className="font-medium text-sm">{position.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {position.side} • {formatNumber(position.size, { decimals: 4 })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      'text-sm font-mono font-medium',
                      position.pnl > 0 ? 'text-green-500' : position.pnl < 0 ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      {formatNumber(position.pnl, { currency: true })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(position.pnlPercentage, { decimals: 2 })}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        
        {/* Recent Closed Positions */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <HistoryIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Recent Closed ({closedPositions.length})</h3>
          </div>
          
          {closedPositions.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              No closed positions
            </div>
          ) : (
            <div className="space-y-2">
              {closedPositions.slice(-5).reverse().map((position) => (
                <div key={position.id} className="flex justify-between items-center p-2 rounded bg-accent/20">
                  <div>
                    <div className="font-medium text-sm">{position.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {position.side} • {formatTimestamp(position.closedAt!, 'short')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      'text-sm font-mono font-medium',
                      (position.realizedPnl || 0) > 0 ? 'text-green-500' : (position.realizedPnl || 0) < 0 ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      {formatNumber(position.realizedPnl || 0, { currency: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// Analytics Panel
function AnalyticsPanel({ metrics }: { metrics: any }) {
  // Default metrics to prevent undefined errors
  const defaultMetrics = {
    totalPnL: 0,
    totalPnLPercentage: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalValue: 10000, // Default starting balance
    sharpeRatio: 0,
    maxDrawdown: 0,
    currentDrawdown: 0,
  };

  // Safely merge metrics with defaults
  const safeMetrics = { ...defaultMetrics, ...metrics };

  return (
    <div className="overflow-auto p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total P&L"
          value={formatNumber(safeMetrics.totalPnL, { currency: true })}
          subtitle={formatNumber(safeMetrics.totalPnLPercentage, { decimals: 2 }) + '%'}
          color={safeMetrics.totalPnL > 0 ? 'success' : safeMetrics.totalPnL < 0 ? 'destructive' : 'neutral'}
        />
        
        <MetricCard
          title="Win Rate"
          value={formatNumber(safeMetrics.winRate, { decimals: 1 }) + '%'}
          subtitle={`${safeMetrics.winningTrades}W / ${safeMetrics.losingTrades}L`}
          color={safeMetrics.winRate > 50 ? 'success' : 'neutral'}
        />
        
        <MetricCard
          title="Avg Win"
          value={formatNumber(safeMetrics.avgWin, { currency: true })}
          subtitle="Per winning trade"
          color="success"
        />
        
        <MetricCard
          title="Avg Loss"
          value={formatNumber(Math.abs(safeMetrics.avgLoss), { currency: true })}
          subtitle="Per losing trade"
          color="destructive"
        />
        
        <MetricCard
          title="Profit Factor"
          value={formatNumber(safeMetrics.profitFactor, { decimals: 2 })}
          subtitle="Gross profit / Gross loss"
          color={safeMetrics.profitFactor > 1 ? 'success' : 'neutral'}
        />
        
        <MetricCard
          title="Total Trades"
          value={safeMetrics.totalTrades.toString()}
          subtitle="Completed trades"
          color="neutral"
        />
        
        <MetricCard
          title="Portfolio Value"
          value={formatNumber(safeMetrics.totalValue, { currency: true, compact: true })}
          subtitle="Current equity"
          color="neutral"
        />
        
        <MetricCard
          title="Sharpe Ratio"
          value={formatNumber(safeMetrics.sharpeRatio, { decimals: 2 })}
          subtitle="Risk-adjusted return"
          color={safeMetrics.sharpeRatio > 1 ? 'success' : 'neutral'}
        />
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  color 
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  color: 'success' | 'destructive' | 'neutral';
}) {
  return (
    <Card className="p-4">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className={cn(
          'text-lg font-mono font-semibold',
          color === 'success' && 'text-green-500',
          color === 'destructive' && 'text-destructive',
          color === 'neutral' && 'text-foreground'
        )}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </Card>
  );
}