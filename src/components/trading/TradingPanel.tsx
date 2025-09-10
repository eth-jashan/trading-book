'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayIcon, 
  PauseIcon, 
  AlertCircleIcon, 
  CheckCircleIcon,
  LoaderIcon,
  InfoIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTradingStore, useUIStore } from '@/stores';
import { useMarketStore } from '@/stores/market/market.store';

// Import our new components
import { BuySellToggle } from './BuySellToggle';
import { OrderTypeSelector, OrderType } from './OrderTypeSelector';
import { AmountInput } from './AmountInput';
import { PriceInput } from './PriceInput';
import { OrderSummary } from './OrderSummary';

interface TradingPanelProps {
  className?: string;
}

interface OrderFormState {
  side: 'buy' | 'sell';
  type: OrderType;
  amount: string;
  price: string;
  stopPrice: string;
}

export function TradingPanel({ className }: TradingPanelProps) {
  const { selectedSymbol } = useUIStore();
  const priceData = useMarketStore((state) => state.getPrice(selectedSymbol || 'BTC'));
  const { placeOrder, validateOrder, balance } = useTradingStore();

  const [orderForm, setOrderForm] = useState<OrderFormState>({
    side: 'buy',
    type: 'market',
    amount: '',
    price: '',
    stopPrice: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderResult, setLastOrderResult] = useState<{
    success: boolean;
    message: string;
    orderId?: string;
  } | null>(null);

  const currentPrice = priceData?.price || 0;

  // Update form field
  const updateForm = useCallback((field: keyof OrderFormState, value: string) => {
    setOrderForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Validation
  const validation = useMemo(() => {
    if (!selectedSymbol || !orderForm.amount) {
      return { isValid: false, error: '' };
    }

    return validateOrder({
      symbol: selectedSymbol,
      side: orderForm.side,
      type: orderForm.type,
      size: parseFloat(orderForm.amount) || 0,
      price: orderForm.type === 'limit' ? parseFloat(orderForm.price) || undefined : undefined,
    });
  }, [selectedSymbol, orderForm, validateOrder]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation.isValid || !selectedSymbol) {
      console.log('Validation failed:', { validation, selectedSymbol });
      return;
    }

    console.log('Placing order:', {
      symbol: selectedSymbol,
      side: orderForm.side,
      type: orderForm.type,
      size: parseFloat(orderForm.amount),
      price: orderForm.type === 'limit' ? parseFloat(orderForm.price) || undefined : undefined,
    });

    setIsSubmitting(true);
    setLastOrderResult(null);

    try {
      const orderId = await placeOrder({
        symbol: selectedSymbol,
        side: orderForm.side,
        type: orderForm.type,
        size: parseFloat(orderForm.amount),
        price: orderForm.type === 'limit' ? parseFloat(orderForm.price) || undefined : undefined,
      });

      console.log('Order placed successfully:', orderId);

      setLastOrderResult({
        success: true,
        message: `${orderForm.side.toUpperCase()} order placed successfully!`,
        orderId
      });

      // Reset form on success
      setOrderForm(prev => ({
        ...prev,
        amount: '',
        price: '',
        stopPrice: '',
      }));

      // Clear success message after 3 seconds
      setTimeout(() => setLastOrderResult(null), 3000);

    } catch (error) {
      console.error('Order placement failed:', error);
      setLastOrderResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to place order'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedSymbol) {
    return (
      <div className={cn("p-6 rounded-lg border bg-card", className)}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
            <InfoIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Select an Asset</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a trading pair from the sidebar to start placing orders
            </p>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3">
            <div className="font-medium mb-1">Available Balance</div>
            <div className="font-mono text-lg">
              ${balance.available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={cn("bg-card rounded-lg border shadow-sm", className)}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="p-6 border-b border-border/30 bg-gradient-to-r from-background to-muted/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Place Order</h2>
          <div className="flex items-center gap-2 text-sm bg-background/80 rounded-full px-3 py-1.5 border border-border/40">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-muted-foreground font-medium">Live</span>
          </div>
        </div>
        
        <div className="bg-background/60 rounded-lg p-4 border border-border/20">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Symbol</span>
              <span className="font-bold text-lg">{selectedSymbol}</span>
            </div>
            <div className="w-px h-8 bg-border/40" />
            <div className="flex flex-col flex-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Price</span>
              <span className="font-mono text-lg font-semibold">
                ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <motion.div
              className={cn("text-sm px-3 py-1.5 rounded-lg font-semibold border", 
                priceData?.change24h && priceData.change24h >= 0 
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" 
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
              )}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.3 }}
              key={currentPrice}
            >
              {priceData?.changePercent24h ? 
                `${priceData.changePercent24h >= 0 ? '+' : ''}${priceData.changePercent24h.toFixed(2)}%` : 
                '0.00%'
              }
            </motion.div>
          </div>
        </div>
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Buy/Sell Toggle */}
        <BuySellToggle
          value={orderForm.side}
          onChange={(value) => updateForm('side', value)}
          disabled={isSubmitting}
        />

        {/* Order Type Selector */}
        <OrderTypeSelector
          value={orderForm.type}
          onChange={(value) => updateForm('type', value)}
          disabled={isSubmitting}
        />

        {/* Amount Input */}
        <AmountInput
          value={orderForm.amount}
          onChange={(value) => updateForm('amount', value)}
          symbol={selectedSymbol}
          currentPrice={currentPrice}
          orderSide={orderForm.side}
          orderType={orderForm.type}
          limitPrice={orderForm.price}
          error={validation.error && orderForm.amount ? validation.error : undefined}
        />

        {/* Price Input (for limit orders only) */}
        <AnimatePresence>
          {orderForm.type === 'limit' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <PriceInput
                value={orderForm.price}
                onChange={(value) => updateForm('price', value)}
                currentPrice={currentPrice}
                orderType={orderForm.type}
                orderSide={orderForm.side}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order Summary */}
        <AnimatePresence>
          {orderForm.amount && parseFloat(orderForm.amount) > 0 && (
            <OrderSummary
              symbol={selectedSymbol}
              orderSide={orderForm.side}
              orderType={orderForm.type}
              amount={orderForm.amount}
              price={orderForm.type !== 'market' ? orderForm.price || orderForm.stopPrice : undefined}
              currentPrice={currentPrice}
            />
          )}
        </AnimatePresence>

        {/* Order Result Messages */}
        <AnimatePresence>
          {lastOrderResult && (
            <motion.div
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg text-sm border",
                lastOrderResult.success
                  ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
              )}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {lastOrderResult.success ? (
                <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
              ) : (
                <AlertCircleIcon className="h-5 w-5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-medium">{lastOrderResult.message}</div>
                {lastOrderResult.orderId && (
                  <div className="text-xs mt-1 opacity-80">
                    Order ID: {lastOrderResult.orderId}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!validation.isValid || isSubmitting}
          className={cn(
            "w-full h-12 text-base font-semibold transition-all duration-200",
            orderForm.side === 'buy'
              ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/25"
              : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25",
            "hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:opacity-50"
          )}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <LoaderIcon className="h-4 w-4 animate-spin" />
              Placing Order...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <PlayIcon className="h-4 w-4" />
              {orderForm.side === 'buy' ? 'Buy' : 'Sell'} {selectedSymbol.split('-')[0]}
            </div>
          )}
        </Button>

        {/* Account Summary */}
        <div className="pt-6 border-t border-border/30 bg-muted/10 rounded-lg p-4 -mx-2">
          <div className="text-center space-y-4">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Account Overview</div>
            
            <div className="space-y-3">
              <div className="bg-background/60 rounded-lg p-3 border border-border/20">
                <div className="text-xs text-muted-foreground font-medium mb-1">Available Balance</div>
                <div className="font-mono text-xl font-bold">
                  ${balance.available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/40 rounded-lg p-3 border border-border/10">
                  <div className="text-xs text-muted-foreground font-medium mb-1">Margin</div>
                  <div className="font-mono text-sm font-semibold">
                    ${balance.margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                
                <div className="bg-background/40 rounded-lg p-3 border border-border/10">
                  <div className="text-xs text-muted-foreground font-medium mb-1">Unrealized P&L</div>
                  <div className={cn("font-mono text-sm font-semibold", 
                    balance.unrealizedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                    ${balance.unrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}