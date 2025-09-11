'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, Filter, Star, TrendingUp, Volume2, ChevronDown } from 'lucide-react';
import { useAssetsStore, useAssetSearch } from '@/stores/assets/assets.store';
import { useMarketStore } from '@/stores';
import { AssetSearchFilters } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AssetList } from './AssetList';

interface AssetSelectorProps {
  onAssetSelect?: (symbol: string) => void;
  selectedSymbol?: string;
  className?: string;
  showCategories?: boolean;
  showFilters?: boolean;
  compact?: boolean;
}

const FILTER_TABS = [
  { key: 'all' as const, label: 'All', icon: null },
  { key: 'perpetual' as const, label: 'Perpetuals', icon: TrendingUp },
  { key: 'spot' as const, label: 'Spot', icon: Volume2 },
] as const;

const SORT_OPTIONS = [
  { key: 'volume', label: 'Volume', icon: Volume2 },
  { key: 'change', label: 'Change', icon: TrendingUp },
  { key: 'price', label: 'Price', icon: null },
  { key: 'symbol', label: 'Name', icon: null },
] as const;

export const AssetSelector: React.FC<AssetSelectorProps> = ({
  onAssetSelect,
  selectedSymbol,
  className,
  showCategories = true,
  showFilters = true,
  compact = false,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const {
    searchQuery,
    searchResults,
    setSearchQuery,
    updateSearchFilters,
    searchFilters,
  } = useAssetSearch();
  
  const favorites = useAssetsStore(state => state.favorites);
  const toggleFavorite = useAssetsStore(state => state.toggleFavorite);
  const isFavorite = useAssetsStore(state => state.isFavorite);
  const selectedAsset = useAssetsStore(state => state.selectedAsset);
  const selectAsset = useAssetsStore(state => state.selectAsset);
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchInput, setSearchQuery]);
  
  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof AssetSearchFilters, value: any) => {
    updateSearchFilters({ [key]: value });
  }, [updateSearchFilters]);
  
  // Handle asset selection
  const handleAssetSelect = useCallback((symbol: string) => {
    const asset = searchResults.find(a => a.symbol === symbol);
    if (asset) {
      selectAsset(asset);
      onAssetSelect?.(symbol);
    }
  }, [searchResults, selectAsset, onAssetSelect]);
  
  // Handle favorite toggle
  const handleFavoriteToggle = useCallback((symbol: string, event: React.MouseEvent) => {
    event.stopPropagation();
    toggleFavorite(symbol);
  }, [toggleFavorite]);
  
  // Filter tabs component
  const FilterTabs = useMemo(() => {
    if (isMobile) {
      // Mobile: Show as horizontal scrolling chips
      return (
        <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-2">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange('type', tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm rounded-full transition-colors whitespace-nowrap flex-shrink-0",
                "hover:bg-background/80",
                searchFilters.type === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm font-medium"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
              <span>{tab.label}</span>
            </button>
          ))}
          
          {/* Favorites toggle - mobile */}
          <button
            onClick={() => handleFilterChange('showOnlyFavorites', !searchFilters.showOnlyFavorites)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm rounded-full transition-colors whitespace-nowrap flex-shrink-0",
              "hover:bg-background/80",
              searchFilters.showOnlyFavorites
                ? "bg-yellow-500 text-white shadow-sm font-medium"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Star 
              className={cn(
                "h-3.5 w-3.5",
                searchFilters.showOnlyFavorites && "fill-current"
              )} 
            />
            <span>Favorites</span>
          </button>
        </div>
      );
    }
    
    // Desktop: Original layout
    return (
      <div className="flex space-x-1 bg-muted/50 p-1 rounded-lg">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange('type', tab.key)}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors",
              "hover:bg-background/80",
              searchFilters.type === tab.key
                ? "bg-background shadow-sm text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            {tab.icon && <tab.icon className="h-4 w-4" />}
            <span>{tab.label}</span>
          </button>
        ))}
        
        {/* Favorites toggle */}
        <button
          onClick={() => handleFilterChange('showOnlyFavorites', !searchFilters.showOnlyFavorites)}
          className={cn(
            "flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors",
            "hover:bg-background/80",
            searchFilters.showOnlyFavorites
              ? "bg-background shadow-sm text-foreground font-medium"
              : "text-muted-foreground"
          )}
        >
          <Star 
            className={cn(
              "h-4 w-4",
              searchFilters.showOnlyFavorites && "fill-yellow-400 text-yellow-400"
            )} 
          />
          <span>Favorites</span>
        </button>
      </div>
    );
  }, [searchFilters.type, searchFilters.showOnlyFavorites, handleFilterChange, isMobile]);
  
  // Sort controls component
  const SortControls = useMemo(() => {
    if (isMobile) {
      // Mobile: Compact dropdown-style sort
      const currentSort = SORT_OPTIONS.find(opt => opt.key === searchFilters.sortBy);
      
      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm bg-muted rounded-md transition-colors",
                "hover:bg-muted/80"
              )}
            >
              {currentSort?.icon && <currentSort.icon className="h-3.5 w-3.5" />}
              <span>{currentSort?.label || 'Sort'}</span>
              <ChevronDown 
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  showMobileFilters && "rotate-180"
                )} 
              />
            </button>
            
            {/* Sort order toggle */}
            <button
              onClick={() => handleFilterChange('sortOrder', searchFilters.sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors bg-muted"
              title={`Sort ${searchFilters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <TrendingUp 
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  searchFilters.sortOrder === 'asc' && "rotate-180"
                )} 
              />
            </button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {searchResults.length} assets
          </div>
        </div>
      );
    }
    
    // Desktop: Original layout
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <div className="flex space-x-1">
          {SORT_OPTIONS.map(option => (
            <button
              key={option.key}
              onClick={() => handleFilterChange('sortBy', option.key)}
              className={cn(
                "flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors",
                "hover:bg-muted/50",
                searchFilters.sortBy === option.key
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {option.icon && <option.icon className="h-3 w-3" />}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        
        {/* Sort order toggle */}
        <button
          onClick={() => handleFilterChange('sortOrder', searchFilters.sortOrder === 'asc' ? 'desc' : 'asc')}
          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          title={`Sort ${searchFilters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
        >
          <TrendingUp 
            className={cn(
              "h-4 w-4 transition-transform",
              searchFilters.sortOrder === 'asc' && "rotate-180"
            )} 
          />
        </button>
      </div>
    );
  }, [searchFilters.sortBy, searchFilters.sortOrder, handleFilterChange, isMobile, showMobileFilters, searchResults.length]);
  
  // Mobile sort options dropdown
  const MobileSortDropdown = useMemo(() => {
    if (!isMobile || !showMobileFilters) return null;
    
    return (
      <div className="border-t pt-3 space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-2">Sort Options</div>
        <div className="grid grid-cols-2 gap-2">
          {SORT_OPTIONS.map(option => (
            <button
              key={option.key}
              onClick={() => {
                handleFilterChange('sortBy', option.key);
                setShowMobileFilters(false);
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                "hover:bg-muted/50",
                searchFilters.sortBy === option.key
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-muted/30 text-muted-foreground"
              )}
            >
              {option.icon && <option.icon className="h-3.5 w-3.5" />}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }, [isMobile, showMobileFilters, searchFilters.sortBy, handleFilterChange]);
  
  // Advanced filters component
  const AdvancedFilters = useMemo(() => {
    if (!showAdvancedFilters) return null;
    
    return (
      <div className="border-t pt-4 space-y-3">
        <div className={cn(
          "flex items-center justify-between",
          isMobile && "flex-col items-start space-y-2"
        )}>
          <label className="text-sm font-medium">Min Volume (24h)</label>
          <input
            type="number"
            value={searchFilters.minVolume}
            onChange={(e) => handleFilterChange('minVolume', Number(e.target.value))}
            className={cn(
              "px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring",
              isMobile ? "w-full" : "w-24"
            )}
            placeholder="Enter minimum volume"
          />
        </div>
      </div>
    );
  }, [showAdvancedFilters, searchFilters.minVolume, handleFilterChange, isMobile]);
  
  return (
    <div className={cn("bg-card border rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className={cn(
        "border-b space-y-3",
        isMobile ? "p-3" : "p-4",
        isMobile && "space-y-3"
      )}>
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={isMobile ? "Search assets..." : "Search assets (e.g. BTC, Bitcoin, Ethereum...)"}
            className={cn(
              "w-full pl-10 pr-12 text-sm bg-background border border-input rounded-md",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
              "transition-all duration-200",
              isMobile ? "py-2.5" : "py-3"
            )}
          />
          
          {/* Advanced Filters Toggle */}
          {showFilters && (
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "absolute right-3 top-1/2 transform -translate-y-1/2",
                "p-1 text-muted-foreground hover:text-foreground rounded transition-colors",
                showAdvancedFilters && "text-foreground bg-muted"
              )}
              title="Advanced Filters"
            >
              <Filter className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Filter Tabs */}
        {showFilters && FilterTabs}
        
        {/* Sort Controls - Desktop */}
        {showFilters && !compact && !isMobile && (
          <div className="flex items-center justify-between">
            {SortControls}
            <div className="text-xs text-muted-foreground">
              {searchResults.length} {searchResults.length === 1 ? 'asset' : 'assets'}
            </div>
          </div>
        )}
        
        {/* Sort Controls - Mobile */}
        {showFilters && !compact && isMobile && SortControls}
        
        {/* Mobile Sort Dropdown */}
        {MobileSortDropdown}
        
        {/* Advanced Filters */}
        {showFilters && AdvancedFilters}
      </div>
      
      {/* Results */}
      <div className={cn(
        "relative", 
        compact ? "max-h-96" : isMobile ? "max-h-[500px]" : "max-h-[600px]"
      )}>
        <AssetList
          assets={searchResults}
          selectedSymbol={selectedSymbol}
          onAssetSelect={handleAssetSelect}
          onFavoriteToggle={handleFavoriteToggle}
          favorites={favorites}
          compact={compact || isMobile}
        />
        
        {/* Empty State */}
        {searchResults.length === 0 && (
          <div className={cn(
            "text-center",
            isMobile ? "p-6" : "p-8"
          )}>
            <div className={cn(
              "text-muted-foreground mb-2",
              isMobile ? "text-sm" : "text-base"
            )}>
              {searchQuery ? (
                <>No assets found for "{searchQuery}"</>
              ) : (
                <>No assets available</>
              )}
            </div>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
                className="text-sm text-primary hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetSelector;