'use client';

import React from 'react';
import { Star, TrendingUp, Activity } from 'lucide-react';
import { useMarketStore, useFavorites, useUIStore } from '@/stores';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const { prices } = useMarketStore();
  const { favorites } = useFavorites();
  const { selectedSymbol, setSelectedSymbol } = useUIStore();
  
  // Get favorite assets only
  const favoriteAssets = Array.from(prices.values())
    .filter(p => favorites.includes(p.symbol) && !p.symbol.startsWith('@'))
    .slice(0, 10);

  return (
    <div className="h-full border-r border-gray-200 dark:border-gray-800 bg-white backdrop-blur supports-[backdrop-filter]:bg-white dark:bg-gray-900/60">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
          <h3 className="font-semibold text-sm">Watchlist</h3>
        </div>
        
        {favoriteAssets.length > 0 ? (
          <div className="space-y-2">
            {favoriteAssets.map((asset) => (
              <Button
                key={asset.symbol}
                variant="ghost"
                className={cn(
                  "w-full justify-between p-2 h-auto",
                  selectedSymbol === asset.symbol && "bg-accent"
                )}
                onClick={() => setSelectedSymbol(asset.symbol)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{asset.symbol}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm">{formatNumber(asset.price, { currency: true })}</div>
                  <div className={cn(
                    "text-xs",
                    (asset.changePercent24h || 0) >= 0 ? "text-green-500" : "text-destructive"
                  )}>
                    {asset.changePercent24h ? `${asset.changePercent24h.toFixed(2)}%` : '0%'}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No favorites yet</p>
            <p className="text-xs mt-1">Star assets to add them here</p>
          </div>
        )}
        
        {/* Quick Stats */}
        <div className="mt-6 pt-6 border-t space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Markets</span>
            <span className="font-medium">{prices.size}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Gainers
            </span>
            <span className="font-medium text-green-500">
              {Array.from(prices.values()).filter(p => (p.changePercent24h || 0) > 0).length}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Active
            </span>
            <span className="font-medium">{favoriteAssets.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

