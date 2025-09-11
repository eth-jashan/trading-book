'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';
import { useUIStore, useMarketStore, useFavorites } from '@/stores';
import { PriceData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AssetSelectorDropdownProps {
  className?: string;
}

export function AssetSelectorDropdown({ className }: AssetSelectorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { selectedSymbol, setSelectedSymbol } = useUIStore();
  const { prices, getPrice } = useMarketStore();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  
  const currentPrice = getPrice(selectedSymbol || 'BTC');

  // Get all prices and filter out @index coins
  const allAssets = Array.from(prices.values()).filter(
    p => !p.symbol.startsWith('@')
  );

  // Filter and sort assets
  const filteredAssets = allAssets
    .filter(asset => {
      const query = searchQuery.toLowerCase();
      return (
        asset.symbol.toLowerCase().includes(query) ||
        (asset.displayName?.toLowerCase().includes(query)) ||
        (asset.baseAsset?.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      // Favorites first
      const aFav = isFavorite(a.symbol);
      const bFav = isFavorite(b.symbol);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      
      // Then by volume
      return (b.volume24h || 0) - (a.volume24h || 0);
    });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSelectAsset = (symbol: string) => {
    setSelectedSymbol(symbol);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Selector Button */}
      <Button
        variant="outline"
        className="flex items-center gap-2 px-3 py-2 h-10 min-w-[180px] justify-between hover:bg-accent cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {currentPrice?.displayName || currentPrice?.symbol || 'BTC'}
          </span>
          {currentPrice && (
            <span className={cn(
              "text-xs",
              (currentPrice.changePercent24h || 0) >= 0 ? "text-green-500" : "text-destructive"
            )}>
              {currentPrice.changePercent24h !== undefined 
                ? `${currentPrice.changePercent24h > 0 ? '+' : ''}${currentPrice.changePercent24h.toFixed(2)}%`
                : ''}
            </span>
          )}
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform text-muted-foreground",
          isOpen && "rotate-180"
        )} />
      </Button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-[400px] bg-background border rounded-lg shadow-xl z-50 bg-gray-900"
          >
            {/* Search Header */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>

            {/* Asset List */}
            <div className="max-h-[400px] overflow-y-auto">
              {filteredAssets.length > 0 ? (
                <div className="py-1">
                  {/* Favorites Section */}
                  {filteredAssets.filter(a => isFavorite(a.symbol)).length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium">
                        Favorites
                      </div>
                      {filteredAssets
                        .filter(a => isFavorite(a.symbol))
                        .map((asset) => (
                          <AssetItem
                            key={asset.symbol}
                            asset={asset}
                            isSelected={asset.symbol === selectedSymbol}
                            isFavorite={true}
                            onSelect={() => handleSelectAsset(asset.symbol)}
                            onToggleFavorite={(e) => {
                              e.stopPropagation();
                              toggleFavorite(asset.symbol);
                            }}
                          />
                        ))}
                      <div className="my-1 border-b" />
                    </>
                  )}

                  {/* All Assets Section */}
                  <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium">
                    All Markets
                  </div>
                  {filteredAssets
                    .filter(a => !isFavorite(a.symbol))
                    .slice(0, 50) // Limit to 50 items for performance
                    .map((asset) => (
                      <AssetItem
                        key={asset.symbol}
                        asset={asset}
                        isSelected={asset.symbol === selectedSymbol}
                        isFavorite={false}
                        onSelect={() => handleSelectAsset(asset.symbol)}
                        onToggleFavorite={(e) => {
                          e.stopPropagation();
                          toggleFavorite(asset.symbol);
                        }}
                      />
                    ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No assets found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface AssetItemProps {
  asset: PriceData;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

function AssetItem({ asset, isSelected, isFavorite, onSelect, onToggleFavorite }: AssetItemProps) {
  const isPositive = (asset.changePercent24h || 0) >= 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 hover:bg-gray-800 cursor-pointer transition-colors",
        isSelected && "bg-accent"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 p-0"
          onClick={onToggleFavorite}
        >
          <Star className={cn(
            "h-3 w-3",
            isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
          )} />
        </Button>
        
        <div className="flex items-center gap-2 flex-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {asset.displayName || asset.symbol}
              </span>
              {asset.marketType && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                  {asset.marketType === 'spot' ? 'S' : 'P'}
                </Badge>
              )}
            </div>
            {asset.volume24h && (
              <div className="text-xs text-muted-foreground">
                Vol: {formatNumber(asset.volume24h, { currency: true, compact: true })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="font-medium text-sm">
          {formatNumber(asset.price, { currency: true })}
        </div>
        <div className={cn(
          "text-xs",
          isPositive ? "text-green-500" : "text-destructive"
        )}>
          {asset.changePercent24h !== undefined
            ? `${asset.changePercent24h > 0 ? '+' : ''}${asset.changePercent24h.toFixed(2)}%`
            : '0.00%'}
        </div>
      </div>
    </div>
  );
}

export default AssetSelectorDropdown;