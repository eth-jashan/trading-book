'use client';

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { List, RowComponentProps } from 'react-window';
import { Asset, AssetWithMarketData } from '@/lib/types';
import { useMarketStore } from '@/stores';
import { AssetListItem } from './AssetListItem';

interface AssetListProps {
  assets: Asset[];
  selectedSymbol?: string;
  onAssetSelect: (symbol: string) => void;
  onFavoriteToggle: (symbol: string, event: React.MouseEvent) => void;
  favorites: Set<string>;
  compact?: boolean;
  height?: number;
  itemHeight?: number;
}

interface VirtualizedItemProps extends RowComponentProps {
  data: {
    assets: AssetWithMarketData[];
    selectedSymbol?: string;
    onAssetSelect: (symbol: string) => void;
    onFavoriteToggle: (symbol: string, event: React.MouseEvent) => void;
    favorites: Set<string>;
    compact?: boolean;
  };
}

// Virtualized list item component
const VirtualizedItem: React.FC<VirtualizedItemProps> = ({ index, style, data }) => {
  const {
    assets,
    selectedSymbol,
    onAssetSelect,
    onFavoriteToggle,
    favorites,
    compact,
  } = data;
  
  const asset = assets[index];
  
  if (!asset) {
    return <div style={style} />;
  }
  
  return (
    <div style={style}>
      <AssetListItem
        asset={asset}
        isSelected={selectedSymbol === asset.symbol}
        onSelect={() => onAssetSelect(asset.symbol)}
        onFavoriteToggle={(event) => onFavoriteToggle(asset.symbol, event)}
        isFavorite={favorites.has(asset.symbol)}
        compact={compact}
      />
    </div>
  );
};

export const AssetList: React.FC<AssetListProps> = ({
  assets,
  selectedSymbol,
  onAssetSelect,
  onFavoriteToggle,
  favorites,
  compact = false,
  height,
  itemHeight,
}) => {
  const listRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);
  
  // Get price data from market store
  const prices = useMarketStore(state => state.prices);
  const getPriceHistory = useMarketStore(state => state.getPriceHistory);
  
  // Combine assets with market data
  const assetsWithMarketData = useMemo((): AssetWithMarketData[] => {
    return assets.map(asset => {
      const priceData = prices.get(asset.symbol);
      const priceHistory = getPriceHistory(asset.symbol, 24); // Last 24 points for sparkline
      
      return {
        ...asset,
        priceData,
        priceHistory,
        isFavorite: favorites.has(asset.symbol),
        marketValue: priceData?.price ? priceData.price * 1000000 : 0, // Example calculation
        priceChange24h: priceData?.change24h || 0,
        priceChangePercent24h: priceData?.changePercent24h || 0,
        volume24h: priceData?.volume24h || 0,
      };
    });
  }, [assets, prices, getPriceHistory, favorites]);
  
  // Calculate container height
  useEffect(() => {
    if (containerRef.current && !height) {
      const rect = containerRef.current.getBoundingClientRect();
      const availableHeight = window.innerHeight - rect.top - 100; // 100px bottom margin
      setContainerHeight(Math.max(300, Math.min(600, availableHeight)));
    }
  }, [height]);
  
  // Scroll to selected item (disabled - ref not working with current List component)
  // useEffect(() => {
  //   if (selectedSymbol && listRef.current) {
  //     const index = assetsWithMarketData.findIndex(asset => asset.symbol === selectedSymbol);
  //     if (index >= 0) {
  //       listRef.current.scrollToItem(index, 'center');
  //     }
  //   }
  // }, [selectedSymbol, assetsWithMarketData]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!assetsWithMarketData.length) return;
    
    const currentIndex = selectedSymbol 
      ? assetsWithMarketData.findIndex(asset => asset.symbol === selectedSymbol)
      : -1;
    
    let newIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(currentIndex + 1, assetsWithMarketData.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Enter':
        event.preventDefault();
        if (currentIndex >= 0) {
          onAssetSelect(assetsWithMarketData[currentIndex].symbol);
        }
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = assetsWithMarketData.length - 1;
        break;
    }
    
    if (newIndex !== currentIndex && newIndex >= 0) {
      onAssetSelect(assetsWithMarketData[newIndex].symbol);
    }
  }, [assetsWithMarketData, selectedSymbol, onAssetSelect]);
  
  // Calculate item height based on compact mode
  const calculatedItemHeight = itemHeight || (compact ? 56 : 72);
  const calculatedHeight = height || containerHeight;
  
  // Data for virtualized items
  const itemData = useMemo(() => ({
    assets: assetsWithMarketData,
    selectedSymbol,
    onAssetSelect,
    onFavoriteToggle,
    favorites,
    compact,
  }), [assetsWithMarketData, selectedSymbol, onAssetSelect, onFavoriteToggle, favorites, compact]);
  
  // Loading state
  if (!assetsWithMarketData.length) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">No assets found</div>
          <div className="text-sm text-muted-foreground">
            Try adjusting your search or filters
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className="relative bg-background"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header for non-compact mode */}
      {!compact && (
        <div className="sticky top-0 z-10 bg-muted/50 border-b px-4 py-2">
          <div className="grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <div className="col-span-1"></div> {/* Favorite */}
            <div className="col-span-3">Asset</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2">24h Change</div>
            <div className="col-span-2">24h Volume</div>
            <div className="col-span-2">Chart</div>
          </div>
        </div>
      )}
      
      {/* Virtualized List */}
      <List
        height={calculatedHeight}
        itemCount={assetsWithMarketData.length}
        itemSize={calculatedItemHeight}
        itemData={itemData}
        overscanCount={5}
        className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      >
        {VirtualizedItem as any}
      </List>
      
      {/* Performance indicator */}
      {assetsWithMarketData.length > 100 && (
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          Showing {assetsWithMarketData.length} items (virtualized)
        </div>
      )}
    </div>
  );
};

export default AssetList;