'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  HistoryIcon, 
  WalletIcon, 
  PieChartIcon,
  TrendingUpIcon,
  BarChart3Icon,
  ActivityIcon,
  TrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  DollarSignIcon,
  TargetIcon,
  ShieldIcon,
  SearchIcon,
  ClockIcon,
  ExternalLinkIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayCircleIcon,
  EyeIcon,
  MoreHorizontalIcon
} from 'lucide-react';
import { useTradingStore, usePortfolioMetrics } from '@/stores';
import { Card } from '@/components/ui/card';
import { formatNumber, formatTimestamp, cn } from '@/lib/utils';
import { PositionPerformanceDashboard } from '@/components/analytics/PositionPerformanceDashboard';
import { PositionHeatMap } from '@/components/analytics/PositionHeatMap';
import { OrdersList } from '@/components/trading/OrdersList';

type BottomPanelTab = 'orders' | 'history' | 'portfolio' | 'analytics' | 'performance' | 'heatmap';

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState<BottomPanelTab>('orders');
  const { transactions, positions, orders, getPendingOrders } = useTradingStore();
  const { metrics } = usePortfolioMetrics();
  const pendingOrders = getPendingOrders();

  // Tab configuration with enhanced metadata
  const tabs = [
    {
      id: 'orders' as const,
      label: 'Orders',
      shortLabel: 'Orders',
      icon: <ClockIcon className="h-4 w-4" />,
      description: 'Your pending and recent orders',
      color: 'blue',
      count: pendingOrders.length
    },
    {
      id: 'history' as const,
      label: 'History',
      shortLabel: 'History',
      icon: <HistoryIcon className="h-4 w-4" />,
      description: 'Transaction history',
      color: 'blue',
      count: transactions.length
    },
    {
      id: 'portfolio' as const,
      label: 'Portfolio',
      shortLabel: 'Portfolio',
      icon: <WalletIcon className="h-4 w-4" />,
      description: 'Your positions',
      color: 'green',
      count: positions.filter(p => p.status === 'open').length
    },
    {
      id: 'analytics' as const,
      label: 'Analytics',
      shortLabel: 'Analytics',
      icon: <PieChartIcon className="h-4 w-4" />,
      description: 'Performance metrics',
      color: 'purple',
      count: null
    },
    {
      id: 'performance' as const,
      label: 'Performance',
      shortLabel: 'Performance',
      icon: <BarChart3Icon className="h-4 w-4" />,
      description: 'Detailed analysis',
      color: 'orange',
      count: null
    },
    {
      id: 'heatmap' as const,
      label: 'Activity',
      shortLabel: 'Activity',
      icon: <ActivityIcon className="h-4 w-4" />,
      description: 'Trading activity',
      color: 'red',
      count: null
    }
  ];
  
  return (
    <div className="flex flex-col bg-card/50 backdrop-blur-sm border-t border-border/50">
      {/* Enhanced Tab Header */}
      <div className="relative">
        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-2 sm:px-4 py-2 bg-background/80 backdrop-blur-sm">
          {/* Mobile: Simplified Layout */}
          <div className="flex items-center w-full lg:w-auto">
            <div className="flex items-center gap-1 p-1 overflow-x-auto scrollbar-hide w-full lg:w-auto">
              <div className="flex items-center gap-1 sm:gap-2">
                {tabs.map((tab) => (
                  <TabButton
                    key={tab.id}
                    tab={tab}
                    active={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  />
                ))}
              </div>
            </div>
          </div>
          {/* Mobile: Compact More Button */}
          <div className="lg:hidden flex items-center ml-2 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1.5 rounded-md hover:bg-accent/50 transition-colors"
              title="More options"
            >
              <MoreHorizontalIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </motion.button>
          </div>
        </div>

        {/* Active Tab Indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      </div>
      
      {/* Tab Content */}
      <div className="">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className=""
        >
          {activeTab === 'orders' && <OrdersPanel />}
          {activeTab === 'history' && <HistoryPanel transactions={transactions} />}
          {activeTab === 'portfolio' && <PortfolioPanel positions={positions} />}
          {activeTab === 'analytics' && <AnalyticsPanel metrics={metrics} />}
          {activeTab === 'performance' && <PositionPerformanceDashboard className="overflow-auto" />}
          {activeTab === 'heatmap' && <PositionHeatMap className="overflow-auto" />}
        </motion.div>
      </div>
    </div>
  );
}

// Enhanced Tab Button Component
interface TabButtonProps {
  tab: {
    id: string;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    description: string;
    color: string;
    count: number | null;
  };
  active: boolean;
  onClick: () => void;
}

function TabButton({ tab, active, onClick }: TabButtonProps) {
  const getColorClasses = (color: string, active: boolean) => {
    const colorMap = {
      blue: {
        active: 'bg-blue-500/15 text-blue-600 border-blue-500 shadow-blue-500/10',
        inactive: 'text-muted-foreground hover:text-blue-600 hover:bg-blue-500/5 border-transparent',
        icon: 'text-blue-500',
        badge: 'bg-blue-500 text-white'
      },
      green: {
        active: 'bg-green-500/15 text-green-600 border-green-500 shadow-green-500/10',
        inactive: 'text-muted-foreground hover:text-green-600 hover:bg-green-500/5 border-transparent',
        icon: 'text-green-500',
        badge: 'bg-green-500 text-white'
      },
      purple: {
        active: 'bg-purple-500/15 text-purple-600 border-purple-500 shadow-purple-500/10',
        inactive: 'text-muted-foreground hover:text-purple-600 hover:bg-purple-500/5 border-transparent',
        icon: 'text-purple-500',
        badge: 'bg-purple-500 text-white'
      },
      orange: {
        active: 'bg-orange-500/15 text-orange-600 border-orange-500 shadow-orange-500/10',
        inactive: 'text-muted-foreground hover:text-orange-600 hover:bg-orange-500/5 border-transparent',
        icon: 'text-orange-500',
        badge: 'bg-orange-500 text-white'
      },
      red: {
        active: 'bg-red-500/15 text-red-600 border-red-500 shadow-red-500/10',
        inactive: 'text-muted-foreground hover:text-red-600 hover:bg-red-500/5 border-transparent',
        icon: 'text-red-500',
        badge: 'bg-red-500 text-white'
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const colors = getColorClasses(tab.color, active);

  return (
    <motion.button
      layoutId={`tab-${tab.id}`}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative flex items-center gap-2.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 rounded-lg border border-b-2 whitespace-nowrap flex-shrink-0 group',
        active 
          ? `${colors.active} shadow-sm`
          : `${colors.inactive} hover:shadow-sm`
      )}
      title={tab.description}
    >
      {/* Icon with enhanced styling */}
      <div className={cn(
        'transition-colors duration-200',
        active ? colors.icon : 'text-muted-foreground group-hover:' + colors.icon
      )}>
        {tab.icon}
      </div>

      {/* Label with responsive behavior */}
      <span className="hidden sm:inline font-medium">
        {tab.label}
      </span>
      <span className="sm:hidden font-medium">
        {tab.shortLabel}
      </span>

      {/* Count Badge */}
      {tab.count !== null && tab.count > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            'flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold',
            active ? colors.badge : 'bg-muted text-muted-foreground'
          )}
        >
          {tab.count > 99 ? '99+' : tab.count}
        </motion.div>
      )}

      {/* Active indicator line */}
      {active && (
        <motion.div
          layoutId="activeTab"
          className={cn(
            'absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 rounded-full',
            `bg-${tab.color}-500`
          )}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}

      {/* Hover glow effect */}
      <div className={cn(
        'absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none',
        active ? 'bg-gradient-to-r from-transparent via-white/5 to-transparent' : 'bg-gradient-to-r from-transparent via-white/3 to-transparent'
      )} />
    </motion.button>
  );
}

// History Panel
function HistoryPanel({ transactions }: { transactions: any[] }) {
  const [filterType] = useState<'all' | 'deposit' | 'trade' | 'realized_pnl'>('all');
  const [sortOrder] = useState<'newest' | 'oldest'>('newest');
  const [searchTerm] = useState('');

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter(transaction => {
      if (filterType !== 'all' && transaction.type !== filterType) return false;
      if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => sortOrder === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);

  const displayTransactions = filteredTransactions.slice(0, 50);

  // Transaction type summary
  const transactionSummary = {
    total: transactions.length,
    deposits: transactions.filter(t => t.type === 'deposit').length,
    trades: transactions.filter(t => t.type === 'trade').length,
    realized_pnl: transactions.filter(t => t.type === 'realized_pnl').length,
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownIcon className="h-4 w-4 text-green-500" />;
      case 'trade':
        return <ExternalLinkIcon className="h-4 w-4 text-blue-500" />;
      case 'realized_pnl':
        return <DollarSignIcon className="h-4 w-4 text-orange-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No transaction history</p>
        <p className="text-sm mt-1">Your trading activity will appear here</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <HistoryIcon className="h-5 w-5" />
          </div>
          <div>
            {/* <h3 className="text-lg font-semibold">Transaction History</h3> */}
            <p className="text-sm text-muted-foreground">{transactions.length} total transactions</p>
          </div>
        </div>

       
      </div>

      {/* Transaction Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">{transactionSummary.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <ArrowDownIcon className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm font-semibold">{transactionSummary.deposits}</p>
              <p className="text-xs text-muted-foreground">Deposits</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <ExternalLinkIcon className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-semibold">{transactionSummary.trades}</p>
              <p className="text-xs text-muted-foreground">Trades</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <DollarSignIcon className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-sm font-semibold">{transactionSummary.realized_pnl}</p>
              <p className="text-xs text-muted-foreground">P&L Events</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="flex-1 overflow-hidden">
        {displayTransactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <SearchIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No transactions match your filters</p>
            <p className="text-xs mt-1">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="overflow-auto h-full">
            <div className="space-y-1 p-2">
              {displayTransactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center justify-between p-3 rounded-lg border hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-xs font-medium px-2 py-1 rounded capitalize',
                          transaction.type === 'deposit' && 'bg-green-500/10 text-green-500',
                          transaction.type === 'trade' && 'bg-blue-500/10 text-blue-500',
                          transaction.type === 'realized_pnl' && 'bg-orange-500/10 text-orange-500'
                        )}>
                          {transaction.type.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(transaction.timestamp, 'short')}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate mt-1">
                        {transaction.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className={cn(
                        'text-sm font-bold',
                        transaction.amount > 0 ? 'text-green-500' : 'text-red-500'
                      )}>
                        {transaction.amount > 0 ? '+' : ''}
                        {formatNumber(transaction.amount, { currency: true })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Balance: {formatNumber(transaction.balance, { currency: true })}
                      </div>
                    </div>
                    
                    <button className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      <EyeIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Footer Info */}
      {filteredTransactions.length > 50 && (
        <div className="text-center text-xs text-muted-foreground flex-shrink-0">
          Showing {displayTransactions.length} of {filteredTransactions.length} transactions
        </div>
      )}
    </div>
  );
}

// Portfolio Panel
function PortfolioPanel({ positions }: { positions: any[] }) {
  const [selectedView, setSelectedView] = useState<'overview' | 'open' | 'closed'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'pnl' | 'size' | 'symbol'>('pnl');

  const openPositions = positions.filter(p => p.status === 'open');
  const closedPositions = positions.filter(p => p.status === 'closed');

  // Filter positions based on search
  const filteredOpenPositions = openPositions.filter(position =>
    position.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClosedPositions = closedPositions.filter(position =>
    position.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort positions
  const sortPositions = (positions: any[]) => {
    return [...positions].sort((a, b) => {
      switch (sortBy) {
        case 'pnl':
          return (b.pnl || b.realizedPnl || 0) - (a.pnl || a.realizedPnl || 0);
        case 'size':
          return b.size - a.size;
        case 'symbol':
          return a.symbol.localeCompare(b.symbol);
        default:
          return 0;
      }
    });
  };

  // Portfolio Summary Statistics
  const portfolioStats = {
    totalOpenValue: openPositions.reduce((sum, pos) => sum + (pos.size * pos.entryPrice), 0),
    totalUnrealizedPnl: openPositions.reduce((sum, pos) => sum + (pos.pnl || 0), 0),
    totalRealizedPnl: closedPositions.reduce((sum, pos) => sum + (pos.realizedPnl || 0), 0),
    bestPosition: openPositions.reduce((best, pos) => 
      (pos.pnl || 0) > (best?.pnl || -Infinity) ? pos : best, null),
    worstPosition: openPositions.reduce((worst, pos) => 
      (pos.pnl || 0) < (worst?.pnl || Infinity) ? pos : worst, null),
  };

  const getPositionIcon = (side: string) => {
    return side === 'long' ? 
      <TrendingUpIcon className="h-4 w-4 text-green-500" /> : 
      <TrendingDownIcon className="h-4 w-4 text-red-500" />;
  };

  if (positions.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <WalletIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No portfolio positions</p>
        <p className="text-sm mt-1">Your trading positions will appear here</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <WalletIcon className="h-5 w-5" />
          </div>
          <div>
            {/* <h3 className="text-lg font-semibold">Portfolio Positions</h3> */}
            <p className="text-sm text-muted-foreground">
              {openPositions.length} open • {closedPositions.length} closed positions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          {/* <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search positions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-44"
            />
          </div> */}

          {/* View Selector */}
          <div className="flex items-center gap-1 p-1 bg-accent rounded-lg">
            {(['overview', 'open', 'closed'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setSelectedView(view)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded transition-colors capitalize',
                  selectedView === view
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {view}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          {/* <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'pnl' | 'size' | 'symbol')}
            className="px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="pnl">Sort by P&L</option>
            <option value="size">Sort by Size</option>
            <option value="symbol">Sort by Symbol</option>
          </select> */}
        </div>
      </div>

      {selectedView === 'overview' && (
        <>
          {/* Portfolio Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUpIcon className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-semibold">{formatNumber(portfolioStats.totalOpenValue, { currency: true, compact: true })}</p>
                  <p className="text-xs text-muted-foreground">Open Value</p>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2">
                <DollarSignIcon className={cn("h-4 w-4", portfolioStats.totalUnrealizedPnl > 0 ? "text-green-500" : "text-red-500")} />
                <div>
                  <p className={cn(
                    "text-sm font-semibold",
                    portfolioStats.totalUnrealizedPnl > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {portfolioStats.totalUnrealizedPnl > 0 ? '+' : ''}{formatNumber(portfolioStats.totalUnrealizedPnl, { currency: true, compact: true })}
                  </p>
                  <p className="text-xs text-muted-foreground">Unrealized P&L</p>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className={cn("h-4 w-4", portfolioStats.totalRealizedPnl > 0 ? "text-green-500" : "text-red-500")} />
                <div>
                  <p className={cn(
                    "text-sm font-semibold",
                    portfolioStats.totalRealizedPnl > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {portfolioStats.totalRealizedPnl > 0 ? '+' : ''}{formatNumber(portfolioStats.totalRealizedPnl, { currency: true, compact: true })}
                  </p>
                  <p className="text-xs text-muted-foreground">Realized P&L</p>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2">
                <PlayCircleIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">{openPositions.length}</p>
                  <p className="text-xs text-muted-foreground">Open Positions</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Best and Worst Positions */}
          {(portfolioStats.bestPosition || portfolioStats.worstPosition) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-shrink-0">
              {portfolioStats.bestPosition && (
                <Card className="p-4 border-green-500/20 bg-green-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <StarIcon className="h-4 w-4 text-green-500" />
                    <h3 className="font-semibold text-green-600 dark:text-green-400">Best Performer</h3>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-lg">{portfolioStats.bestPosition.symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        {portfolioStats.bestPosition.side.toUpperCase()} • Size: {formatNumber(portfolioStats.bestPosition.size, { decimals: 4 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-500">
                        +{formatNumber(portfolioStats.bestPosition.pnl || 0, { currency: true })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(portfolioStats.bestPosition.pnlPercentage || 0, { decimals: 2 })}%
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {portfolioStats.worstPosition && portfolioStats.worstPosition !== portfolioStats.bestPosition && (
                <Card className="p-4 border-red-500/20 bg-red-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircleIcon className="h-4 w-4 text-red-500" />
                    <h3 className="font-semibold text-red-600 dark:text-red-400">Needs Attention</h3>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-lg">{portfolioStats.worstPosition.symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        {portfolioStats.worstPosition.side.toUpperCase()} • Size: {formatNumber(portfolioStats.worstPosition.size, { decimals: 4 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-500">
                        {formatNumber(portfolioStats.worstPosition.pnl || 0, { currency: true })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(portfolioStats.worstPosition.pnlPercentage || 0, { decimals: 2 })}%
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Position Lists */}
      {(selectedView === 'overview' || selectedView === 'open') && openPositions.length > 0 && (
        <Card className="flex-1 overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <PlayCircleIcon className="h-4 w-4 text-green-500" />
              Open Positions ({filteredOpenPositions.length})
            </h3>
          </div>
          <div className="overflow-auto h-full max-h-64">
            <div className="space-y-1 p-2">
              {sortPositions(filteredOpenPositions).map((position, index) => (
                <motion.div
                  key={position.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg border hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3">
                    {getPositionIcon(position.side)}
                    <div>
                      <div className="font-semibold">{position.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {position.side.toUpperCase()} • {formatNumber(position.size, { decimals: 4 })} 
                        @ {formatNumber(position.entryPrice, { currency: true })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={cn(
                      'text-sm font-bold',
                      (position.pnl || 0) > 0 ? 'text-green-500' : (position.pnl || 0) < 0 ? 'text-red-500' : 'text-muted-foreground'
                    )}>
                      {(position.pnl || 0) > 0 ? '+' : ''}{formatNumber(position.pnl || 0, { currency: true })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(position.pnlPercentage || 0, { decimals: 2 })}%
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {(selectedView === 'overview' || selectedView === 'closed') && closedPositions.length > 0 && (
        <Card className="flex-1 overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
              Recent Closed Positions ({filteredClosedPositions.length})
            </h3>
          </div>
          <div className="overflow-auto h-full max-h-64">
            <div className="space-y-1 p-2">
              {sortPositions(filteredClosedPositions).slice(0, 20).map((position, index) => (
                <motion.div
                  key={position.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg border hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircleIcon className={cn(
                      "h-4 w-4",
                      (position.realizedPnl || 0) > 0 ? "text-green-500" : "text-red-500"
                    )} />
                    <div>
                      <div className="font-semibold">{position.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {position.side.toUpperCase()} • Closed {formatTimestamp(position.closedAt!, 'short')}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={cn(
                      'text-sm font-bold',
                      (position.realizedPnl || 0) > 0 ? 'text-green-500' : (position.realizedPnl || 0) < 0 ? 'text-red-500' : 'text-muted-foreground'
                    )}>
                      {(position.realizedPnl || 0) > 0 ? '+' : ''}{formatNumber(position.realizedPnl || 0, { currency: true })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>
      )}
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
    <div className="h-full overflow-auto p-4 space-y-6">
      {/* Performance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SummaryCard
          title="Total Performance"
          value={formatNumber(safeMetrics.totalPnL, { currency: true })}
          subtitle={`${formatNumber(safeMetrics.totalPnLPercentage, { decimals: 2 })}% return`}
          trend={safeMetrics.totalPnL > 0 ? 'up' : safeMetrics.totalPnL < 0 ? 'down' : 'neutral'}
          icon={<DollarSignIcon className="h-5 w-5" />}
          featured
        />
        
        <SummaryCard
          title="Portfolio Value"
          value={formatNumber(safeMetrics.totalValue, { currency: true, compact: true })}
          subtitle="Current equity"
          trend="neutral"
          icon={<WalletIcon className="h-5 w-5" />}
        />
        
        <SummaryCard
          title="Total Trades"
          value={safeMetrics.totalTrades.toString()}
          subtitle={`${safeMetrics.winningTrades}W • ${safeMetrics.losingTrades}L`}
          trend="neutral"
          icon={<BarChart3Icon className="h-5 w-5" />}
        />
      </div>

      {/* Trading Performance */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TargetIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Trading Performance</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Win Rate"
            value={formatNumber(safeMetrics.winRate, { decimals: 1 }) + '%'}
            subtitle={`${safeMetrics.winningTrades} wins of ${safeMetrics.totalTrades} trades`}
            color={safeMetrics.winRate > 50 ? 'success' : 'neutral'}
            icon={<TargetIcon className="h-4 w-4" />}
            progress={safeMetrics.winRate}
          />
          
          <MetricCard
            title="Profit Factor"
            value={formatNumber(safeMetrics.profitFactor, { decimals: 2 })}
            subtitle="Gross profit / loss ratio"
            color={safeMetrics.profitFactor > 1 ? 'success' : 'destructive'}
            icon={<TrendingUpIcon className="h-4 w-4" />}
          />
          
          <MetricCard
            title="Avg Win"
            value={formatNumber(safeMetrics.avgWin, { currency: true })}
            subtitle="Per winning trade"
            color="success"
            icon={<ArrowUpIcon className="h-4 w-4" />}
          />
          
          <MetricCard
            title="Avg Loss"
            value={formatNumber(Math.abs(safeMetrics.avgLoss), { currency: true })}
            subtitle="Per losing trade"
            color="destructive"
            icon={<ArrowDownIcon className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Risk Metrics */}
      {/* <div>
        <div className="flex items-center gap-2 mb-4">
          <ShieldIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Risk Analysis</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Sharpe Ratio"
            value={formatNumber(safeMetrics.sharpeRatio, { decimals: 2 })}
            subtitle="Risk-adjusted return"
            color={safeMetrics.sharpeRatio > 1 ? 'success' : safeMetrics.sharpeRatio > 0 ? 'neutral' : 'destructive'}
            icon={<TrendingUpIcon className="h-4 w-4" />}
          />
          
          <MetricCard
            title="Max Drawdown"
            value={formatNumber(Math.abs(safeMetrics.maxDrawdown), { decimals: 2 }) + '%'}
            subtitle="Largest peak-to-trough decline"
            color="destructive"
            icon={<TrendingDownIcon className="h-4 w-4" />}
          />
          
          <MetricCard
            title="Current Drawdown"
            value={formatNumber(Math.abs(safeMetrics.currentDrawdown), { decimals: 2 }) + '%'}
            subtitle="Current decline from peak"
            color={safeMetrics.currentDrawdown < -5 ? 'destructive' : 'neutral'}
            icon={<MinusIcon className="h-4 w-4" />}
          />
        </div>
      </div> */}
    </div>
  );
}

// Summary Card Component (Featured metrics)
function SummaryCard({ 
  title, 
  value, 
  subtitle, 
  trend,
  icon,
  featured = false
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  featured?: boolean;
}) {
  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUpIcon className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <ArrowDownIcon className="h-4 w-4 text-destructive" />;
    return <MinusIcon className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className={cn(
      "p-6 transition-all hover:shadow-md",
      featured && "border-primary/20 bg-primary/5"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg",
              featured ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground"
            )}>
              {icon}
            </div>
            <div className="text-sm font-medium text-muted-foreground">{title}</div>
          </div>
          <div className={cn(
            "text-2xl font-mono font-bold",
            trend === 'up' && 'text-green-500',
            trend === 'down' && 'text-destructive',
            trend === 'neutral' && 'text-foreground'
          )}>
            {value}
          </div>
          <div className="text-sm text-muted-foreground">{subtitle}</div>
        </div>
        <div className="ml-4">
          {getTrendIcon()}
        </div>
      </div>
    </Card>
  );
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  color,
  icon,
  progress
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  color: 'success' | 'destructive' | 'neutral';
  icon?: React.ReactNode;
  progress?: number;
}) {
  return (
    <Card className="p-4 transition-all hover:shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</div>
          {icon && (
            <div className={cn(
              "p-1.5 rounded",
              color === 'success' && 'bg-green-500/10 text-green-500',
              color === 'destructive' && 'bg-destructive/10 text-destructive',
              color === 'neutral' && 'bg-accent text-muted-foreground'
            )}>
              {icon}
            </div>
          )}
        </div>
        
        <div className={cn(
          'text-xl font-mono font-bold',
          color === 'success' && 'text-green-500',
          color === 'destructive' && 'text-destructive',
          color === 'neutral' && 'text-foreground'
        )}>
          {value}
        </div>
        
        {progress !== undefined && (
          <div className="space-y-1">
            <div className="h-1.5 bg-accent rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  color === 'success' && 'bg-green-500',
                  color === 'destructive' && 'bg-destructive',
                  color === 'neutral' && 'bg-primary'
                )}
                style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </Card>
  );
}

// Orders Panel Component
function OrdersPanel() {
  return (
    <div className="h-full overflow-hidden">
      <OrdersList className="h-full" maxHeight="100%" />
    </div>
  );
}