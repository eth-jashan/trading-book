'use client';

import React, { memo, useMemo } from 'react';
import { Star, TrendingUp, TrendingDown, Minus, MoreHorizontal } from 'lucide-react';
import { AssetWithMarketData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatNumber, formatPrice, formatPercentage } from '@/lib/format';

interface AssetListItemProps {
  asset: AssetWithMarketData;
  isSelected: boolean;
  onSelect: () => void;
  onFavoriteToggle: (event: React.MouseEvent) => void;
  isFavorite: boolean;
  compact?: boolean;
  showChart?: boolean;
}

// Simple sparkline component
const Sparkline: React.FC<{ 
  data: Array<{ price: number; timestamp: number }>; 
  width?: number; 
  height?: number;
  positive?: boolean;
}> = memo(({ data, width = 100, height = 30, positive = true }) => {
  const points = useMemo(() => {
    if (!data || data.length < 2) return '';
    
    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    return data
      .map((point, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((point.price - minPrice) / priceRange) * height;
        return `${x},${y}`;
      })
      .join(' ');
  }, [data, width, height]);
  
  if (!points) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <Minus className="h-3 w-3 text-muted-foreground/50" />
      </div>
    );
  }
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
        strokeWidth="1.5"
        className="opacity-80"
      />
    </svg>
  );
});

Sparkline.displayName = 'Sparkline';

export const AssetListItem: React.FC<AssetListItemProps> = memo(({
  asset,
  isSelected,
  onSelect,
  onFavoriteToggle,
  isFavorite,
  compact = false,
  showChart = true,
}) => {
  const {
    symbol,
    name,
    type,
    baseAsset,
    priceData,
    priceHistory,
    priceChangePercent24h,
    volume24h,
  } = asset;
  
  // Calculate display values
  const price = priceData?.price ?? 0;
  const change24h = priceChangePercent24h ?? 0;
  const isPositive = change24h >= 0;
  const volume = volume24h ?? 0;
  
  // Format values
  const formattedPrice = formatPrice(price);
  const formattedChange = formatPercentage(Math.abs(change24h));
  const formattedVolume = formatNumber(volume, { compact: true });
  
  // Get asset icon/logo (would be from CDN in real app)
  const getAssetIcon = (symbol: string) => {
    // This would typically fetch from a CDN like CoinGecko
    return `https://cryptoicons.org/api/icon/${baseAsset.toLowerCase()}/200`;
  };
  
  if (compact) {
    return (
      <div
        onClick={onSelect}
        className={cn(
          "flex items-center p-3 cursor-pointer transition-all duration-150",
          "hover:bg-muted/50 border-b border-border/50",
          isSelected && "bg-muted ring-1 ring-ring"
        )}
      >
        {/* Favorite */}
        <button
          onClick={onFavoriteToggle}
          className={cn(
            "p-1 rounded-sm transition-colors mr-3",
            "hover:bg-background/80",
            isFavorite ? "text-yellow-500" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
        </button>
        
        {/* Asset Info */}
        <div className="flex items-center flex-1 min-w-0">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
              {baseAsset.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{symbol}</div>
              <div className="text-xs text-muted-foreground truncate">{type}</div>
            </div>
          </div>
          
          {/* Price & Change */}
          <div className="text-right">
            <div className="font-mono text-sm">{formattedPrice}</div>
            <div className={cn(
              "flex items-center text-xs",
              isPositive ? "text-green-500" : "text-red-500"
            )}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {formattedChange}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Full layout for non-compact mode
  return (
    <div
      onClick={onSelect}
      className={cn(
        "grid grid-cols-12 gap-4 p-4 cursor-pointer transition-all duration-150",
        "hover:bg-muted/50 border-b border-border/50",
        isSelected && "bg-muted ring-1 ring-ring"
      )}
    >
      {/* Favorite */}
      <div className="col-span-1 flex items-center">
        <button
          onClick={onFavoriteToggle}
          className={cn(
            "p-1 rounded-sm transition-colors",
            "hover:bg-background/80",
            isFavorite ? "text-yellow-500" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
        </button>
      </div>
      
      {/* Asset Info */}
      <div className="col-span-3 flex items-center space-x-3">
        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center overflow-hidden">
          <img
            src={getAssetIcon(symbol)}
            alt={baseAsset}
            className="w-6 h-6"
            onError={(e) => {
              // Fallback to text
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.textContent = baseAsset.charAt(0);
            }}
          />
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{symbol}</div>
          <div className="text-sm text-muted-foreground truncate">{name}</div>
          <div className="text-xs text-muted-foreground capitalize">{type}</div>
        </div>
      </div>
      
      {/* Price */}
      <div className="col-span-2 flex items-center">
        <div>
          <div className="font-mono text-sm font-medium">{formattedPrice}</div>
          {priceData?.bid && priceData?.ask && (
            <div className="text-xs text-muted-foreground">
              Spread: {formatPrice(priceData.ask - priceData.bid)}
            </div>
          )}
        </div>
      </div>
      
      {/* 24h Change */}
      <div className="col-span-2 flex items-center">
        <div className={cn(
          "flex items-center space-x-1 px-2 py-1 rounded text-sm font-medium",
          isPositive 
            ? "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/50" 
            : "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50"
        )}>
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>{formattedChange}</span>
        </div>
      </div>
      
      {/* 24h Volume */}
      <div className="col-span-2 flex items-center">
        <div>
          <div className="text-sm font-medium">{formattedVolume}</div>
          <div className="text-xs text-muted-foreground">Volume</div>
        </div>
      </div>
      
      {/* Chart/Sparkline */}
      <div className="col-span-2 flex items-center justify-end">
        {showChart && priceHistory && priceHistory.length > 1 ? (
          <Sparkline 
            data={priceHistory} 
            width={80} 
            height={24}
            positive={isPositive}
          />
        ) : (
          <div className="flex items-center justify-center w-20 h-6">
            <Minus className="h-4 w-4 text-muted-foreground/50" />
          </div>
        )}
      </div>
    </div>
  );
});

AssetListItem.displayName = 'AssetListItem';

export default AssetListItem;