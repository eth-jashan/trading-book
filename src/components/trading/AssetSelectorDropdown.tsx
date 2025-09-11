'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Star, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Activity } from 'lucide-react';
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
  const [selectedTab, setSelectedTab] = useState<'favorites' | 'all' | 'recent'>('all');
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

  // Get filtered assets by tab
  const getFilteredAssetsByTab = () => {
    switch (selectedTab) {
      case 'favorites':
        return filteredAssets.filter(a => isFavorite(a.symbol));
      case 'recent':
        // For now, return all assets - could implement recent logic later
        return filteredAssets.slice(0, 20);
      case 'all':
      default:
        return filteredAssets;
    }
  };

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
      {/* Enhanced Selector Button */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-800/90 to-gray-900/90 rounded-xl border border-gray-700/50 hover:border-gray-600/50 cursor-pointer backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Asset Icon/Avatar */}
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            {(currentPrice?.displayName || currentPrice?.symbol || 'BTC').substring(0, 2)}
          </div>
          {/* Live indicator */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"
          />
        </div>

        {/* Asset Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white">
              {currentPrice?.displayName || currentPrice?.symbol || 'BTC'}
            </span>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 bg-gray-700/50">
              {currentPrice?.marketType === 'spot' ? 'SPOT' : 'PERP'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 mt-0.5">
            {/* Current Price */}
            <span className="font-mono text-sm text-gray-300">
              {currentPrice ? formatNumber(currentPrice.price, { currency: true }) : '$0.00'}
            </span>
            
            {/* Price Change */}
            {currentPrice && currentPrice.changePercent24h !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-sm font-semibold",
                currentPrice.changePercent24h >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {currentPrice.changePercent24h >= 0 ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
                <span>
                  {Math.abs(currentPrice.changePercent24h).toFixed(2)}%
                </span>
              </div>
            )}
            
            {/* Volume */}
            {currentPrice?.volume24h && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Activity className="w-3 h-3" />
                <span>Vol: {formatNumber(currentPrice.volume24h, { compact: true })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expand Arrow */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="h-5 w-5 text-gray-400" />
        </motion.div>
      </motion.div>

      {/* Enhanced Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 mt-3 w-[450px] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header with Search and Tabs */}
            <div className="p-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
              {/* Search Input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search assets, symbols..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800/80 border border-gray-600/50 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-1 p-1 bg-gray-800/60 rounded-lg">
                {[
                  { id: 'favorites', label: 'Favorites', icon: Star },
                  { id: 'all', label: 'All Markets', icon: TrendingUp },
                  { id: 'recent', label: 'Recent', icon: Activity }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id as 'favorites' | 'all' | 'recent')}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all duration-200 flex-1 justify-center",
                      selectedTab === tab.id
                        ? "bg-blue-500 text-white shadow-lg"
                        : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Enhanced Asset List */}
            <div className="max-h-[420px] overflow-y-auto">
              {getFilteredAssetsByTab().length > 0 ? (
                <div className="p-2 space-y-1">
                  {getFilteredAssetsByTab()
                    .slice(0, 50)
                    .map((asset, index) => (
                      <motion.div
                        key={asset.symbol}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02, duration: 0.15 }}
                        className={cn(
                          "group relative flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-blue-500/30 cursor-pointer transition-all duration-200",
                          asset.symbol === selectedSymbol
                            ? "bg-blue-500/15 border-blue-500/50 shadow-lg"
                            : "hover:bg-gray-800/60"
                        )}
                        onClick={() => handleSelectAsset(asset.symbol)}
                      >
                        {/* Asset Info */}
                        <div className="flex items-center gap-3 flex-1">
                          {/* Asset Avatar */}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white font-bold text-sm border-2 border-gray-600">
                            {asset.symbol.substring(0, 2)}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-sm">
                                {asset.displayName || asset.symbol}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 h-4 bg-gray-700/50 border-gray-600">
                                {asset.marketType === 'spot' ? 'SPOT' : 'PERP'}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400">
                                Vol: {formatNumber(asset.volume24h || 0, { compact: true })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Price and Change */}
                        <div className="flex items-center gap-3">
                          {/* Price */}
                          <div className="text-right">
                            <div className="font-mono text-sm text-white">
                              {formatNumber(asset.price, { currency: true })}
                            </div>
                            <div className={cn(
                              "text-xs font-medium flex items-center gap-1",
                              (asset.changePercent24h || 0) >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                              {(asset.changePercent24h || 0) >= 0 ? (
                                <ArrowUp className="w-3 h-3" />
                              ) : (
                                <ArrowDown className="w-3 h-3" />
                              )}
                              {Math.abs(asset.changePercent24h || 0).toFixed(2)}%
                            </div>
                          </div>

                          {/* Favorite Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(asset.symbol);
                            }}
                          >
                            <Star className={cn(
                              "h-4 w-4 transition-colors",
                              isFavorite(asset.symbol) 
                                ? "fill-yellow-400 text-yellow-400" 
                                : "text-gray-400 hover:text-yellow-400"
                            )} />
                          </Button>
                        </div>

                        {/* Selection indicator */}
                        {asset.symbol === selectedSymbol && (
                          <motion.div
                            layoutId="selectedAsset"
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                      </motion.div>
                    ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="text-gray-400 mb-2">
                    {searchQuery ? (
                      <>No assets found for "{searchQuery}"</>
                    ) : (
                      <>No assets in {selectedTab}</>
                    )}
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                      }}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer Stats */}
            <div className="p-3 border-t border-gray-700/50 bg-gradient-to-r from-gray-800/30 to-gray-900/30">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{getFilteredAssetsByTab().length} assets</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live prices</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AssetSelectorDropdown;