'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SearchIcon, 
  FilterIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  StarIcon,
  Star,
  SortAscIcon,
  SortDescIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriceCard, PriceCardSkeleton } from './PriceCard';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useUIStore, useFavorites, useMarketStore } from '@/stores';
import { PriceData } from '@/lib/types';
import { ASSET_ICONS } from '@/lib/constants';

interface MarketListProps {
  className?: string;
  compact?: boolean;
}

type SortOption = 'symbol' | 'price' | 'change' | 'volume';
type FilterOption = 'all' | 'favorites' | 'gainers' | 'losers';

export function MarketList({ className, compact = false }: MarketListProps) {
  const { searchQuery, setSearchQuery, assetFilters, updateAssetFilters } = useUIStore();
  const { favorites } = useFavorites();
  const { 
    prices, 
    marketStatistics, 
    getMarketOverview, 
    loadingState 
  } = useMarketStore();
  
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading] = useState(loadingState.loading);

  // Get enhanced market data
  const marketOverview = useMemo(() => getMarketOverview(), [getMarketOverview]);
  const allPrices = useMemo(() => Array.from(prices.values()), [prices]);
  
  // Apply additional filtering based on active filter
  const displayedPrices = useMemo(() => {
    let priceList = searchQuery 
      ? allPrices.filter(p => 
          p.symbol.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [...allPrices];
    
    switch (activeFilter) {
      case 'favorites':
        priceList = priceList.filter(p => favorites.includes(p.symbol));
        break;
      case 'gainers':
        priceList = priceList.filter(p => (p.changePercent24h || 0) > 0);
        break;
      case 'losers':
        priceList = priceList.filter(p => (p.changePercent24h || 0) < 0);
        break;
      default:
        break;
    }
    
    // Apply sorting
    priceList.sort((a, b) => {
      let aVal: number, bVal: number;
      
      switch (assetFilters.sortBy) {
        case 'symbol':
          return assetFilters.sortOrder === 'asc' 
            ? a.symbol.localeCompare(b.symbol)
            : b.symbol.localeCompare(a.symbol);
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        case 'change':
          aVal = a.changePercent24h || 0;
          bVal = b.changePercent24h || 0;
          break;
        case 'volume':
          aVal = a.volume24h || 0;
          bVal = b.volume24h || 0;
          break;
        default:
          return 0;
      }
      
      return assetFilters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return priceList;
  }, [allPrices, activeFilter, favorites, searchQuery, assetFilters]);

  const handleSortChange = (sortBy: SortOption) => {
    const newOrder = assetFilters.sortBy === sortBy && assetFilters.sortOrder === 'desc' 
      ? 'asc' 
      : 'desc';
    
    updateAssetFilters({
      sortBy,
      sortOrder: newOrder
    });
  };

  const filterOptions: { key: FilterOption; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: allPrices.length },
    { key: 'favorites', label: 'Favorites', count: allPrices.filter(p => favorites.includes(p.symbol)).length },
    { key: 'gainers', label: 'Gainers', count: marketStatistics.gainersCount },
    { key: 'losers', label: 'Losers', count: marketStatistics.losersCount },
  ];

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Markets</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-accent")}
          >
            <FilterIcon className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="flex-shrink-0 p-4 border-b bg-muted/20"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {filterOptions.map(({ key, label, count }) => (
                <Button
                  key={key}
                  variant={activeFilter === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(key)}
                  className="flex-shrink-0"
                >
                  {label}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {count}
                  </Badge>
                </Button>
              ))}
            </div>
            
            {/* Sort Options */}
            <div className="flex gap-2 text-sm">
              <span className="text-muted-foreground">Sort by:</span>
              {(['symbol', 'price', 'change', 'volume'] as SortOption[]).map((option) => (
                <Button
                  key={option}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSortChange(option)}
                  className={cn(
                    "h-auto p-1 text-xs capitalize",
                    assetFilters.sortBy === option && "text-primary"
                  )}
                >
                  {option}
                  {assetFilters.sortBy === option && (
                    assetFilters.sortOrder === 'asc' ? (
                      <SortAscIcon className="h-3 w-3 ml-1" />
                    ) : (
                      <SortDescIcon className="h-3 w-3 ml-1" />
                    )
                  )}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Market Statistics Summary */}
      {!compact && (
        <div className="flex-shrink-0 p-4 border-b">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Total Assets</div>
              <div className="flex items-center justify-center gap-1 text-foreground">
                <span className="text-sm font-semibold">
                  {marketStatistics.totalAssets}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Gainers</div>
              <div className="flex items-center justify-center gap-1 text-green-500">
                <TrendingUpIcon className="h-3 w-3" />
                <span className="text-sm font-semibold">
                  {marketStatistics.gainersCount}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Losers</div>
              <div className="flex items-center justify-center gap-1 text-destructive">
                <TrendingDownIcon className="h-3 w-3" />
                <span className="text-sm font-semibold">
                  {marketStatistics.losersCount}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Volume 24h</div>
              <div className="flex items-center justify-center gap-1">
                <span className="text-sm font-semibold">
                  {formatNumber(marketStatistics.total24hVolume, { 
                    currency: true, 
                    compact: true 
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Market List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            // Loading skeletons
            <div className="p-4 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <PriceCardSkeleton key={i} compact={compact} />
              ))}
            </div>
          ) : displayedPrices.length > 0 ? (
            <motion.div 
              className="p-4 space-y-3"
              layout
            >
              {displayedPrices.map((priceData) => (
                <motion.div
                  key={priceData.symbol}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {compact ? (
                    <CompactPriceItem priceData={priceData} />
                  ) : (
                    <PriceCard 
                      priceData={priceData}
                      compact={compact}
                      showActions={!compact}
                    />
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            // Empty state
            <div className="flex flex-col items-center justify-center h-48 text-center p-4">
              <SearchIcon className="h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="font-medium mb-1">No markets found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Enhanced compact price item with asset icons and better data display
function CompactPriceItem({ priceData }: { priceData: PriceData }) {
  const { symbol, price, changePercent24h, volume24h } = priceData;
  const { setSelectedSymbol, selectedSymbol } = useUIStore();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const isSelected = selectedSymbol === symbol;
  const isPositive = (changePercent24h || 0) >= 0;
  
  // Get asset icon from constants
  const getAssetIcon = (symbol: string): string => {
    // Extract base asset from symbol (e.g., BTC-USD -> BTC, BTC/USDC -> BTC)
    const baseAsset = symbol.split(/[-\/]/)[0].toUpperCase();
    return ASSET_ICONS[baseAsset] || ASSET_ICONS.DEFAULT;
  };

  return (
    <motion.div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 cursor-pointer group transition-all",
        isSelected && "bg-primary/5 border border-primary/20"
      )}
      onClick={() => setSelectedSymbol(symbol)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Asset Icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-sm">
          {getAssetIcon(symbol)}
        </div>
        
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(symbol);
          }}
          className={cn(
            "opacity-0 group-hover:opacity-100 flex-shrink-0",
            isFavorite(symbol) && "opacity-100"
          )}
        >
          {isFavorite(symbol) ? (
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          ) : (
            <StarIcon className="h-3 w-3" />
          )}
        </Button>
        
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{symbol}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{formatNumber(price, { currency: true })}</span>
            {volume24h && (
              <span>Vol: {formatNumber(volume24h, { currency: true, compact: true })}</span>
            )}
          </div>
        </div>
      </div>
      
      <div className={cn(
        "text-right flex-shrink-0",
        isPositive ? "text-green-500" : "text-destructive"
      )}>
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUpIcon className="h-3 w-3" />
          ) : (
            <TrendingDownIcon className="h-3 w-3" />
          )}
          <span className="text-sm font-medium">
            {changePercent24h ? `${changePercent24h > 0 ? '+' : ''}${changePercent24h.toFixed(2)}%` : '0.00%'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}