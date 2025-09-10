'use client';

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Star,
  TrendingUp,
  TrendingDown,
  Volume2,
  Activity,
  Info,
  ExternalLink,
  Copy,
  BarChart3,
  DollarSign,
  Percent,
  Clock
} from 'lucide-react';
import { AssetWithMarketData } from '@/lib/types';
import { useAssetsStore, useMarketStore } from '@/stores';
import { cn } from '@/lib/utils';
import { 
  formatPrice, 
  formatPercentage, 
  formatNumber, 
  formatRelativeTime,
  getPnLColor 
} from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AssetDetailsProps {
  asset?: AssetWithMarketData;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface StatItemProps {
  label: string;
  value: string;
  change?: number;
  icon?: React.ReactNode;
  tooltip?: string;
}

const StatItem: React.FC<StatItemProps> = ({ 
  label, 
  value, 
  change, 
  icon, 
  tooltip 
}) => (
  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
    <div className="flex items-center space-x-2">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <div className="text-right">
      <div className="font-mono text-sm font-medium">{value}</div>
      {change !== undefined && (
        <div className={cn("text-xs", getPnLColor(change))}>
          {formatPercentage(change)}
        </div>
      )}
    </div>
  </div>
);

export const AssetDetails: React.FC<AssetDetailsProps> = ({
  asset,
  trigger,
  open,
  onOpenChange,
}) => {
  const selectedAsset = useAssetsStore(state => state.selectedAsset);
  const assetDetailsVisible = useAssetsStore(state => state.assetDetailsVisible);
  const hideAssetDetails = useAssetsStore(state => state.hideAssetDetails);
  const toggleFavorite = useAssetsStore(state => state.toggleFavorite);
  const isFavorite = useAssetsStore(state => state.isFavorite);
  
  // Get market data
  const orderBooks = useMarketStore(state => state.orderBooks);
  const priceHistory = useMarketStore(state => state.priceHistory);
  
  // Use prop asset or selected asset from store
  const displayAsset = asset || selectedAsset;
  const isOpen = open !== undefined ? open : assetDetailsVisible;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else if (!newOpen) {
      hideAssetDetails();
    }
  };
  
  const orderBook = useMemo(() => {
    if (!displayAsset) return null;
    return orderBooks.get(displayAsset.symbol) || null;
  }, [displayAsset, orderBooks]);
  
  const priceHistory24h = useMemo(() => {
    if (!displayAsset) return [];
    return priceHistory.get(displayAsset.symbol) || [];
  }, [displayAsset, priceHistory]);
  
  if (!displayAsset) {
    return null;
  }
  
  const {
    symbol,
    name,
    type,
    baseAsset,
    quoteAsset,
    minSize,
    maxSize,
    tickSize,
    leverage,
    category,
    tags = [],
  } = displayAsset;
  
  // Get market data separately (temporary defaults until type issues resolved)
  const priceData: any = undefined;
  const priceChangePercent24h = 0;
  const volume24h = 0;
  
  const price = priceData?.price ?? 0;
  const change24h = priceChangePercent24h;
  const isPositive = change24h >= 0;
  
  // Calculate additional metrics
  const spread = orderBook ? 
    (orderBook.asks[0]?.price || 0) - (orderBook.bids[0]?.price || 0) : 0;
  const spreadPercent = price > 0 ? (spread / price) * 100 : 0;
  
  const midPrice = orderBook && orderBook.bids[0] && orderBook.asks[0] ?
    (orderBook.bids[0].price + orderBook.asks[0].price) / 2 : price;
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-lg font-bold">
                {baseAsset.charAt(0)}
              </div>
              <div>
                <DialogTitle className="text-xl">{symbol}</DialogTitle>
                <p className="text-muted-foreground">{name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleFavorite(symbol)}
                className={cn(
                  isFavorite(symbol) && "text-yellow-500 border-yellow-200"
                )}
              >
                <Star 
                  className={cn(
                    "h-4 w-4 mr-2",
                    isFavorite(symbol) && "fill-current"
                  )} 
                />
                {isFavorite(symbol) ? 'Favorited' : 'Add to Favorites'}
              </Button>
              
              <Badge variant={type === 'perpetual' ? 'default' : 'secondary'}>
                {type}
              </Badge>
            </div>
          </div>
        </DialogHeader>
        
        {/* Price Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="col-span-2">
            <div className="flex items-baseline space-x-4">
              <div className="text-3xl font-mono font-bold">
                {formatPrice(price)}
              </div>
              <div className={cn(
                "flex items-center space-x-1 text-lg font-medium",
                getPnLColor(change24h)
              )}>
                {isPositive ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                <span>{formatPercentage(Math.abs(change24h))}</span>
              </div>
            </div>
            
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Quick Stats */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">24h Volume</div>
            <div className="font-mono text-lg">{formatNumber(volume24h, { compact: true })}</div>
            
            {spread > 0 && (
              <>
                <div className="text-sm text-muted-foreground">Spread</div>
                <div className="font-mono text-sm">
                  {formatPrice(spread)} ({formatPercentage(spreadPercent)})
                </div>
              </>
            )}
          </div>
        </div>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orderbook">Order Book</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="info">Information</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatItem
                label="Current Price"
                value={formatPrice(price)}
                icon={<DollarSign className="h-4 w-4" />}
              />
              
              <StatItem
                label="24h Change"
                value={formatPercentage(Math.abs(change24h))}
                change={change24h}
                icon={<Percent className="h-4 w-4" />}
              />
              
              <StatItem
                label="24h Volume"
                value={formatNumber(volume24h, { compact: true })}
                icon={<Volume2 className="h-4 w-4" />}
              />
              
              <StatItem
                label="24h High"
                value={formatPrice(priceData?.high24h ?? 0)}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              
              <StatItem
                label="24h Low"
                value={formatPrice(priceData?.low24h ?? 0)}
                icon={<TrendingDown className="h-4 w-4" />}
              />
              
              {orderBook?.bids[0] && (
                <StatItem
                  label="Best Bid"
                  value={formatPrice(orderBook.bids[0].price)}
                  icon={<Activity className="h-4 w-4" />}
                />
              )}
              
              {orderBook?.asks[0] && (
                <StatItem
                  label="Best Ask"
                  value={formatPrice(orderBook.asks[0].price)}
                  icon={<Activity className="h-4 w-4" />}
                />
              )}
              
              {midPrice > 0 && midPrice !== price && (
                <StatItem
                  label="Mid Price"
                  value={formatPrice(midPrice)}
                  icon={<Activity className="h-4 w-4" />}
                />
              )}
            </div>
            
            {/* Price History Chart Placeholder */}
            <div className="bg-muted/30 rounded-lg p-6 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Price Chart ({priceHistory24h.length} data points)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Chart component would be integrated here
              </p>
            </div>
          </TabsContent>
          
          {/* Order Book Tab */}
          <TabsContent value="orderbook" className="space-y-4">
            {orderBook ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Asks (Sell Orders) */}
                <div>
                  <h3 className="text-sm font-medium text-red-500 mb-3">
                    Asks (Sell Orders)
                  </h3>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {orderBook.asks.slice(0, 10).reverse().map((ask, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-2 gap-2 text-sm font-mono py-1 px-2 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        <span className="text-red-500">{formatPrice(ask.price)}</span>
                        <span className="text-right text-muted-foreground">
                          {formatNumber(ask.size, { decimals: 4 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Bids (Buy Orders) */}
                <div>
                  <h3 className="text-sm font-medium text-green-500 mb-3">
                    Bids (Buy Orders)
                  </h3>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {orderBook.bids.slice(0, 10).map((bid, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-2 gap-2 text-sm font-mono py-1 px-2 rounded hover:bg-green-50 dark:hover:bg-green-950/20"
                      >
                        <span className="text-green-500">{formatPrice(bid.price)}</span>
                        <span className="text-right text-muted-foreground">
                          {formatNumber(bid.size, { decimals: 4 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Order book data not available
                </p>
              </div>
            )}
          </TabsContent>
          
          {/* Specifications Tab */}
          <TabsContent value="specs" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatItem
                label="Type"
                value={type.charAt(0).toUpperCase() + type.slice(1)}
              />
              
              <StatItem
                label="Base Asset"
                value={baseAsset}
              />
              
              <StatItem
                label="Quote Asset"
                value={quoteAsset}
              />
              
              <StatItem
                label="Minimum Size"
                value={formatNumber(minSize, { decimals: 8 })}
              />
              
              <StatItem
                label="Maximum Size"
                value={formatNumber(maxSize, { compact: true })}
              />
              
              <StatItem
                label="Tick Size"
                value={formatNumber(tickSize, { decimals: 8 })}
              />
              
              {leverage && leverage > 1 && (
                <StatItem
                  label="Max Leverage"
                  value={`${leverage}x`}
                />
              )}
              
              {category && (
                <StatItem
                  label="Category"
                  value={category.charAt(0).toUpperCase() + category.slice(1)}
                />
              )}
            </div>
          </TabsContent>
          
          {/* Information Tab */}
          <TabsContent value="info" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-medium mb-2 flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  Asset Information
                </h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong>Symbol:</strong> {symbol}
                  </p>
                  <p>
                    <strong>Full Name:</strong> {name}
                  </p>
                  <p>
                    <strong>Type:</strong> {type === 'perpetual' ? 'Perpetual Future' : 'Spot Trading'}
                  </p>
                  {category && (
                    <p>
                      <strong>Category:</strong> {category}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-medium mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Market Hours
                </h3>
                <p className="text-sm text-muted-foreground">
                  {type === 'perpetual' 
                    ? '24/7 Trading Available'
                    : 'Follows market hours'
                  }
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Copy symbol to clipboard
                    navigator.clipboard?.writeText(symbol);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Symbol
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Open external link (would be real link in production)
                    window.open(`https://info.hyperliquid.xyz/tokens/${baseAsset}`, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Hyperliquid
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AssetDetails;