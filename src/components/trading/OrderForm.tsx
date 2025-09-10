'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  DollarSignIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  InfoIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useSymbolPrice, useTradingStore, useUIStore } from '@/stores';
import type { Order } from '@/lib/types';

interface OrderFormProps {
  symbol?: string;
  defaultSide?: 'buy' | 'sell';
  className?: string;
}

type OrderType = 'market' | 'limit' | 'stop';
type OrderSide = 'buy' | 'sell';

export function OrderForm({ 
  symbol: propSymbol,
  defaultSide = 'buy',
  className 
}: OrderFormProps) {
  const { selectedSymbol } = useUIStore();
  const symbol = propSymbol || selectedSymbol;
  const priceData = useSymbolPrice(symbol || 'BTC');
  const { balance, placeOrder, validateOrder } = useTradingStore();
  
  const [orderSide, setOrderSide] = useState<OrderSide>(defaultSide);
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderResult, setLastOrderResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const currentPrice = priceData?.price || 0;
  
  // Calculate estimated values
  const estimatedValue = useMemo(() => {
    const sizeNum = parseFloat(size) || 0;
    const priceNum = orderType === 'market' ? currentPrice : (parseFloat(price) || 0);
    return sizeNum * priceNum;
  }, [size, price, currentPrice, orderType]);

  const estimatedFees = estimatedValue * 0.001; // 0.1% fee
  const totalCost = estimatedValue + estimatedFees;
  
  // Validation
  const validation = useMemo(() => {
    if (!symbol || !size) return { isValid: false, error: '' };
    
    return validateOrder({
      symbol,
      side: orderSide,
      type: orderType,
      size: parseFloat(size) || 0,
      price: orderType === 'limit' ? parseFloat(price) || 0 : undefined,
      stopPrice: orderType === 'stop' ? parseFloat(price) || 0 : undefined,
    });
  }, [symbol, orderSide, orderType, size, price, validateOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid || !symbol) return;

    setIsSubmitting(true);
    try {
      await placeOrder({
        symbol,
        side: orderSide,
        type: orderType,
        size: parseFloat(size),
        price: orderType === 'limit' ? parseFloat(price) : undefined,
        stopPrice: orderType === 'stop' ? parseFloat(price) : undefined,
      });
      
      setLastOrderResult({
        success: true,
        message: `${orderSide.toUpperCase()} order placed successfully!`
      });
      
      // Reset form
      setSize('');
      setPrice('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setLastOrderResult(null), 3000);
    } catch (error) {
      setLastOrderResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to place order'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaxSize = () => {
    if (orderSide === 'buy') {
      const maxValue = balance.available * 0.95; // Leave 5% buffer
      const maxSize = maxValue / (orderType === 'market' ? currentPrice : (parseFloat(price) || currentPrice));
      setSize(maxSize.toFixed(6));
    } else {
      // For sell, would need to check available balance for the asset
      // For now, set a reasonable default
      setSize('0.1');
    }
  };

  if (!symbol) {
    return (
      <div className={cn("p-6 rounded-lg border bg-card text-center", className)}>
        <InfoIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">Select an asset to start trading</p>
      </div>
    );
  }

  return (
    <motion.div
      className={cn("p-6 rounded-lg border bg-card", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-1">Place Order</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{symbol}</span>
          <span>•</span>
          <span>{formatNumber(currentPrice, { currency: true })}</span>
        </div>
      </div>

      {/* Order Side Toggle */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <Button
          type="button"
          variant={orderSide === 'buy' ? 'default' : 'outline'}
          onClick={() => setOrderSide('buy')}
          className={cn(
            orderSide === 'buy' && "bg-success hover:bg-success/90 text-white"
          )}
        >
          <TrendingUpIcon className="h-4 w-4 mr-2" />
          Buy
        </Button>
        <Button
          type="button"
          variant={orderSide === 'sell' ? 'default' : 'outline'}
          onClick={() => setOrderSide('sell')}
          className={cn(
            orderSide === 'sell' && "bg-destructive hover:bg-destructive/90 text-white"
          )}
        >
          <TrendingDownIcon className="h-4 w-4 mr-2" />
          Sell
        </Button>
      </div>

      {/* Order Type Selection */}
      <div className="mb-4">
        <Label className="text-sm font-medium mb-2 block">Order Type</Label>
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {(['market', 'limit', 'stop'] as OrderType[]).map((type) => (
            <Button
              key={type}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOrderType(type)}
              className={cn(
                "flex-1 capitalize",
                orderType === type && "bg-white dark:bg-gray-900 shadow-sm"
              )}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Size Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="size" className="text-sm font-medium">
              Amount
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleMaxSize}
              className="text-xs text-primary hover:text-primary/80"
            >
              MAX
            </Button>
          </div>
          <div className="relative">
            <Input
              id="size"
              type="number"
              step="0.000001"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="0.00"
              className="pr-12"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {symbol.split('-')[0]}
            </div>
          </div>
        </div>

        {/* Price Input (for limit/stop orders) */}
        <AnimatePresence>
          {orderType !== 'market' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Label htmlFor="price" className="text-sm font-medium mb-2 block">
                {orderType === 'limit' ? 'Limit Price' : 'Stop Price'}
              </Label>
              <div className="relative">
                <DollarSignIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={currentPrice.toFixed(2)}
                  className="pl-10"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order Summary */}
        {size && (
          <motion.div
            className="p-4 bg-muted/50 rounded-lg space-y-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex justify-between text-sm">
              <span>Estimated Value:</span>
              <span className="font-mono">{formatNumber(estimatedValue, { currency: true })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Estimated Fees:</span>
              <span className="font-mono">{formatNumber(estimatedFees, { currency: true })}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between text-sm font-medium">
              <span>Total {orderSide === 'buy' ? 'Cost' : 'Proceeds'}:</span>
              <span className="font-mono">{formatNumber(totalCost, { currency: true })}</span>
            </div>
          </motion.div>
        )}

        {/* Validation Error */}
        <AnimatePresence>
          {!validation.isValid && validation.error && (
            <motion.div
              className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
              {validation.error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order Result */}
        <AnimatePresence>
          {lastOrderResult && (
            <motion.div
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg text-sm",
                lastOrderResult.success
                  ? "bg-success/10 text-green-500"
                  : "bg-destructive/10 text-destructive"
              )}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              {lastOrderResult.success ? (
                <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
              )}
              {lastOrderResult.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!validation.isValid || isSubmitting}
          className={cn(
            "w-full",
            orderSide === 'buy' 
              ? "bg-success hover:bg-success/90 text-white" 
              : "bg-destructive hover:bg-destructive/90 text-white"
          )}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Placing Order...
            </>
          ) : (
            `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${symbol}`
          )}
        </Button>
      </form>

      {/* Available Balance */}
      <div className="mt-4 pt-4 border-t text-center text-sm text-muted-foreground">
        Available: {formatNumber(balance.available, { currency: true })}
      </div>
    </motion.div>
  );
}