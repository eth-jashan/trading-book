'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUpIcon, TrendingDownIcon, StarIcon, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useFavorites, useUIStore } from '@/stores';
import type { PriceData } from '@/lib/types';

interface PriceCardProps {
  priceData: PriceData;
  className?: string;
  showActions?: boolean;
  compact?: boolean;
}

export function PriceCard({ 
  priceData, 
  className,
  showActions = true,
  compact = false
}: PriceCardProps) {
  const { symbol, price, changePercent24h, change24h, volume24h } = priceData;
  const { isFavorite, toggleFavorite } = useFavorites();
  const { setSelectedSymbol, selectedSymbol } = useUIStore();
  
  const isPositive = (changePercent24h || 0) >= 0;
  const isSelected = selectedSymbol === symbol;
  
  const handleSelect = () => {
    setSelectedSymbol(symbol);
  };
  
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(symbol);
  };
  
  // const priceChangeFormatted = formatPercentage(changePercent24h);
  
  return (
    <motion.div
      className={cn(
        'group relative p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 cursor-pointer',
        isSelected && 'ring-2 ring-primary bg-primary/5',
        compact ? 'p-3' : 'p-4',
        className
      )}
      onClick={handleSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {/* Header with Symbol and Favorite */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-lg">{symbol}</span>
            {isSelected && (
              <motion.div
                className="w-2 h-2 rounded-full bg-primary"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
              />
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleToggleFavorite}
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity",
            isFavorite(symbol) && "opacity-100"
          )}
        >
          {isFavorite(symbol) ? (
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          ) : (
            <StarIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Price Information */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold font-mono">
            {formatNumber(price, { currency: true })}
          </span>
          
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
            isPositive 
              ? "bg-success/10 text-green-500" 
              : "bg-destructive/10 text-destructive"
          )}>
            {isPositive ? (
              <TrendingUpIcon className="h-3 w-3" />
            ) : (
              <TrendingDownIcon className="h-3 w-3" />
            )}
            {/* {priceChangeFormatted.value} */}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {isPositive ? '+' : ''}{formatNumber(change24h || 0, { currency: true })}
          </span>
          {!compact && (
            <span>
              Vol: {formatNumber(volume24h || 0, { compact: true })}
            </span>
          )}
        </div>
      </div>
      
      {/* Quick Actions */}
      {showActions && (
        <motion.div 
          className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
          initial={{ y: 10, opacity: 0 }}
          whileHover={{ y: 0, opacity: 1 }}
        >
          <Button 
            size="sm" 
            variant="default"
            className="flex-1 bg-success hover:bg-success/90 text-white"
          >
            Buy
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/10"
          >
            Sell
          </Button>
        </motion.div>
      )}
      
      {/* Loading State Overlay */}
      <motion.div
        className="absolute inset-0 bg-white dark:bg-gray-900/80 rounded-lg flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0 }}
        exit={{ opacity: 0 }}
      >
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </motion.div>
    </motion.div>
  );
}

// Skeleton component for loading states
export function PriceCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn(
      "animate-pulse p-4 rounded-lg border bg-card",
      compact ? "p-3" : "p-4"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="h-6 bg-muted rounded w-16" />
        <div className="h-4 w-4 bg-muted rounded" />
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-24" />
          <div className="h-6 bg-muted rounded w-16" />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="h-4 bg-muted rounded w-12" />
          {!compact && <div className="h-4 bg-muted rounded w-20" />}
        </div>
      </div>
      
      <div className="flex gap-2 mt-3">
        <div className="h-8 bg-muted rounded flex-1" />
        <div className="h-8 bg-muted rounded flex-1" />
      </div>
    </div>
  );
}