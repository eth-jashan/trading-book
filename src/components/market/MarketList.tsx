'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SearchIcon, 
  FilterIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  StarIcon,
  Star,
  SortAscIcon,
  SortDescIcon,
  Activity,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriceCard, PriceCardSkeleton } from './PriceCard';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useUIStore, useFavorites, useMarketStore } from '@/stores';
import { PriceData } from '@/lib/types';
import { ASSET_ICONS } from '@/lib/constants';
import { hyperliquidService } from '@/services/hyperliquid';

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
    getPricesByType,
    loadingState 
  } = useMarketStore();
  
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Start with false since we have mock data
  const [marketType, setMarketType] = useState<'all' | 'spot' | 'perpetual'>('all');
  const [hasInitialData, setHasInitialData] = useState(false);

  // Fetch enhanced market data on mount
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const enhancedPrices = await hyperliquidService.getAllEnhancedPrices();
        console.log('MarketList: Fetched enhanced prices:', enhancedPrices.size);
        
        if (enhancedPrices.size > 0) {
          const marketStore = useMarketStore.getState();
          // Add new data to existing mock data
          enhancedPrices.forEach((priceData, symbol) => {
            marketStore.updatePrice(symbol, priceData);
          });
          
          marketStore.calculateMarketStatistics();
          console.log('MarketList: Store prices count:', marketStore.prices.size);
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
        // Keep using mock data if API fails
      }
    };

    // Fetch data after a short delay
    const timeout = setTimeout(() => {
      fetchMarketData();
    }, 1000);

    // Set up periodic refresh
    const interval = setInterval(fetchMarketData, 30000); // Refresh every 30 seconds
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  // Get enhanced market data
  const marketOverview = useMemo(() => getMarketOverview(), [getMarketOverview]);
  
  // Debug: Check what's in the store
  console.log('Store prices Map:', prices);
  console.log('Store prices size:', prices.size);
  
  const allPrices = useMemo(() => {
    // Directly get prices from the store
    const directPrices = Array.from(prices.values());
    console.log('Direct from store:', directPrices.length, 'items');
    
    if (marketType === 'all') {
      return directPrices;
    }
    
    return directPrices.filter(p => p.marketType === marketType);
  }, [prices, marketType]); // Use prices directly
  
  // Apply additional filtering based on active filter
  const displayedPrices = useMemo(() => {
    // For testing, just return allPrices without any filtering
    console.log('MarketList: allPrices for display:', allPrices);
    
    // If no prices, create mock data for testing
    if (allPrices.length === 0) {
      console.log('No prices found, using test data');
      return [
        {
          symbol: 'TEST-BTC',
          price: 42000,
          marketType: 'perpetual' as const,
          displayName: 'TEST-BTC',
          changePercent24h: 2.5,
          timestamp: Date.now()
        },
        {
          symbol: 'TEST-ETH',
          price: 2500,
          marketType: 'perpetual' as const,
          displayName: 'TEST-ETH',
          changePercent24h: -1.2,
          timestamp: Date.now()
        }
      ];
    }
    
    return allPrices;
  }, [allPrices]);

  const handleSortChange = (sortBy: SortOption) => {
    const newOrder = assetFilters.sortBy === sortBy && assetFilters.sortOrder === 'desc' 
      ? 'asc' 
      : 'desc';
    
    updateAssetFilters({
      sortBy,
      sortOrder: newOrder
    });
  };

  const getMarketTypeCount = (type: 'all' | 'spot' | 'perpetual') => {
    const allPricesArray = Array.from(prices.values());
    console.log(`MarketTypeCount for ${type}:`, allPricesArray.length, 'total prices');
    if (type === 'all') return allPricesArray.length;
    const filtered = allPricesArray.filter(p => p.marketType === type);
    console.log(`MarketTypeCount for ${type}:`, filtered.length, 'filtered');
    return filtered.length;
  };

  const filterOptions: { key: FilterOption; label: string; count: number; icon?: React.ReactNode }[] = [
    { key: 'all', label: 'All', count: allPrices.length },
    { key: 'favorites', label: 'Favorites', count: allPrices.filter(p => favorites.includes(p.symbol)).length, icon: <Star className="h-3 w-3" /> },
    { key: 'gainers', label: 'Gainers', count: marketStatistics.gainersCount, icon: <TrendingUpIcon className="h-3 w-3 text-green-500" /> },
    { key: 'losers', label: 'Losers', count: marketStatistics.losersCount, icon: <TrendingDownIcon className="h-3 w-3 text-destructive" /> },
  ];

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
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

        {/* Market Type Tabs */}
        <Tabs value={marketType} onValueChange={(v) => setMarketType(v as typeof marketType)} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <span>All</span>
              <Badge variant="secondary" className="text-xs">
                {getMarketTypeCount('all')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="perpetual" className="flex items-center gap-2">
              <span>Perpetuals</span>
              <Badge variant="secondary" className="text-xs">
                {getMarketTypeCount('perpetual')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="spot" className="flex items-center gap-2">
              <span>Spot</span>
              <Badge variant="secondary" className="text-xs">
                {getMarketTypeCount('spot')}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
              {filterOptions.map(({ key, label, count, icon }) => (
                <Button
                  key={key}
                  variant={activeFilter === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(key)}
                  className="flex-shrink-0"
                >
                  {icon}
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
        <div className="flex-shrink-0 p-4 border-b bg-muted/5">
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Activity className="h-3 w-3" />
                <span className="text-xs">Total Assets</span>
              </div>
              <div className="text-sm font-semibold">
                {marketStatistics.totalAssets}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                <TrendingUpIcon className="h-3 w-3" />
                <span className="text-xs">Gainers</span>
              </div>
              <div className="text-sm font-semibold text-green-500">
                {marketStatistics.gainersCount}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-destructive mb-1">
                <TrendingDownIcon className="h-3 w-3" />
                <span className="text-xs">Losers</span>
              </div>
              <div className="text-sm font-semibold text-destructive">
                {marketStatistics.losersCount}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <BarChart3 className="h-3 w-3" />
                <span className="text-xs">24h Volume</span>
              </div>
              <div className="text-sm font-semibold">
                {formatNumber(marketStatistics.total24hVolume, { 
                  currency: true, 
                  compact: true 
                })}
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
              className="p-4 grid gap-3"
              layout
            >
              {displayedPrices.map((priceData) => (
                <motion.div
                  key={priceData.symbol}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {compact ? (
                    <CompactPriceItem priceData={priceData} />
                  ) : (
                    <div className="p-4 bg-card border rounded">
                      <div>Symbol: {priceData.symbol}</div>
                      <div>Price: ${priceData.price}</div>
                      <div>Type: {priceData.marketType || 'unknown'}</div>
                    </div>
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

// Enhanced price card component
function EnhancedPriceCard({ priceData }: { priceData: PriceData }) {
  const { setSelectedSymbol, selectedSymbol } = useUIStore();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const isSelected = selectedSymbol === priceData.symbol;
  const isPositive = (priceData.changePercent24h || 0) >= 0;
  
  const getAssetIcon = (symbol: string): string => {
    const baseAsset = (priceData.baseAsset || symbol.split(/[-\/]/)[0]).toUpperCase();
    return ASSET_ICONS[baseAsset] || ASSET_ICONS.DEFAULT;
  };

  return (
    <motion.div
      className={cn(
        "p-4 rounded-lg border bg-card hover:bg-accent/5 cursor-pointer transition-all",
        isSelected && "border-primary bg-primary/5"
      )}
      onClick={() => setSelectedSymbol(priceData.symbol)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left Section - Symbol & Name */}
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-lg font-semibold">
            {getAssetIcon(priceData.symbol)}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">
                {priceData.displayName || priceData.symbol}
              </h3>
              <Badge variant={priceData.marketType === 'spot' ? 'secondary' : 'outline'} className="text-xs">
                {priceData.marketType === 'spot' ? 'SPOT' : 'PERP'}
              </Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(priceData.symbol);
                }}
                className="ml-auto"
              >
                {isFavorite(priceData.symbol) ? (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ) : (
                  <StarIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {priceData.baseAsset && (
                <span>{priceData.baseAsset}</span>
              )}
              {priceData.volume24h && (
                <span className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {formatNumber(priceData.volume24h, { currency: true, compact: true })}
                </span>
              )}
              {priceData.marketType === 'perpetual' && priceData.fundingRate !== undefined && (
                <span className="text-xs">
                  Funding: {(priceData.fundingRate * 100).toFixed(4)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Section - Price & Change */}
        <div className="text-right">
          <div className="text-lg font-semibold">
            {formatNumber(priceData.price, { currency: true })}
          </div>
          <div className={cn(
            "flex items-center justify-end gap-1 text-sm",
            isPositive ? "text-green-500" : "text-destructive"
          )}>
            {isPositive ? (
              <TrendingUpIcon className="h-3 w-3" />
            ) : (
              <TrendingDownIcon className="h-3 w-3" />
            )}
            <span className="font-medium">
              {priceData.changePercent24h 
                ? `${priceData.changePercent24h > 0 ? '+' : ''}${priceData.changePercent24h.toFixed(2)}%`
                : '0.00%'}
            </span>
          </div>
        </div>
      </div>

      {/* Additional Info Row */}
      {(priceData.high24h || priceData.low24h) && (
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>24h Range</span>
          <div className="flex items-center gap-2">
            <span>{formatNumber(priceData.low24h || 0, { currency: true })}</span>
            <div className="w-20 h-1 bg-muted rounded-full relative">
              <div 
                className="absolute h-full bg-primary rounded-full"
                style={{
                  width: `${((priceData.price - (priceData.low24h || 0)) / ((priceData.high24h || priceData.price) - (priceData.low24h || 0))) * 100}%`
                }}
              />
            </div>
            <span>{formatNumber(priceData.high24h || 0, { currency: true })}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Compact price item for sidebar
function CompactPriceItem({ priceData }: { priceData: PriceData }) {
  const { symbol, price, changePercent24h, volume24h, displayName, marketType, baseAsset } = priceData;
  const { setSelectedSymbol, selectedSymbol } = useUIStore();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const isSelected = selectedSymbol === symbol;
  const isPositive = (changePercent24h || 0) >= 0;
  
  const getAssetIcon = (symbol: string): string => {
    const base = (baseAsset || symbol.split(/[-\/]/)[0]).toUpperCase();
    return ASSET_ICONS[base] || ASSET_ICONS.DEFAULT;
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
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-sm">
          {getAssetIcon(symbol)}
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {displayName || symbol}
            </span>
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              {marketType === 'spot' ? 'S' : 'P'}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{formatNumber(price, { currency: true })}</span>
            {volume24h && (
              <span>Vol: {formatNumber(volume24h, { currency: true, compact: true })}</span>
            )}
          </div>
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