'use client';

import React, { useEffect, useState } from 'react';
import { AssetSelector } from '@/components/trading/AssetSelector';
import AssetDetails from '@/components/trading/AssetDetails';
import { useAssetsStore } from '@/stores';
import { hyperliquidAPI } from '@/services/hyperliquid-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, Search, Star } from 'lucide-react';

export default function AssetTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [initializationStatus, setInitializationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // Asset store state
  const {
    assets,
    loadAssets,
    searchResults,
    searchFilters,
    favorites,
    selectedAsset,
    getAllAssets,
  } = useAssetsStore();
  
  // Initialize with mock data for testing
  useEffect(() => {
    const initializeMockData = async () => {
      setInitializationStatus('loading');
      try {
        // Create some mock assets for testing
        const mockAssets = [
          {
            symbol: 'BTC-USD',
            name: 'Bitcoin Perpetual',
            type: 'perpetual' as const,
            baseAsset: 'BTC',
            quoteAsset: 'USD',
            minSize: 0.001,
            maxSize: 1000000,
            tickSize: 0.01,
            leverage: 50,
            category: 'major',
            tags: ['popular', 'store-of-value'],
            tradingEnabled: true,
          },
          {
            symbol: 'ETH-USD',
            name: 'Ethereum Perpetual',
            type: 'perpetual' as const,
            baseAsset: 'ETH',
            quoteAsset: 'USD',
            minSize: 0.01,
            maxSize: 1000000,
            tickSize: 0.01,
            leverage: 50,
            category: 'major',
            tags: ['popular', 'smart-contracts', 'defi'],
            tradingEnabled: true,
          },
          {
            symbol: 'SOL-USD',
            name: 'Solana Perpetual',
            type: 'perpetual' as const,
            baseAsset: 'SOL',
            quoteAsset: 'USD',
            minSize: 0.1,
            maxSize: 1000000,
            tickSize: 0.01,
            leverage: 20,
            category: 'layer1',
            tags: ['popular', 'high-throughput'],
            tradingEnabled: true,
          },
        ];
        
        // Load mock assets
        loadAssets(mockAssets);
        setInitializationStatus('success');
      } catch (error) {
        console.error('Failed to initialize mock data:', error);
        setInitializationStatus('error');
      }
    };
    
    initializeMockData();
  }, [loadAssets]);
  
  const handleAssetSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    console.log('Selected asset:', symbol);
  };
  
  const assetCount = getAllAssets().length;
  const searchResultCount = searchResults.length;
  const favoriteCount = favorites.size;
  
  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Asset Selection & Discovery Test</h1>
            <p className="text-muted-foreground mt-1">
              Testing the asset search and discovery functionality
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant={initializationStatus === 'success' ? 'default' : 'secondary'}>
              {initializationStatus === 'loading' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {initializationStatus}
            </Badge>
          </div>
        </div>
        
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assetCount}</div>
              <p className="text-xs text-muted-foreground">Assets loaded</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Search Results</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{searchResultCount}</div>
              <p className="text-xs text-muted-foreground">Current results</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Favorites</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{favoriteCount}</div>
              <p className="text-xs text-muted-foreground">Favorited assets</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Asset Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Search & Selection</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AssetSelector
              onAssetSelect={handleAssetSelect}
              selectedSymbol={selectedSymbol}
              showCategories={true}
              showFilters={true}
              className="border-0 rounded-none"
            />
          </CardContent>
        </Card>
        
        {/* Debug Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1 font-mono text-muted-foreground">
              <div>Assets in store: {Array.from(assets.keys()).join(', ')}</div>
              <div>Search results: {searchResults.map(a => a.symbol).join(', ')}</div>
              <div>Favorites: {Array.from(favorites).join(', ')}</div>
              <div>Current query: {searchFilters.searchQuery || 'none'}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}