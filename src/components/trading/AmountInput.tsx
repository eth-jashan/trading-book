'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSignIcon, 
  AlertCircleIcon, 
  InfoIcon,
  TrendingUpIcon 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';
import { useTradingStore } from '@/stores';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  symbol?: string;
  currentPrice?: number;
  orderSide: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop' | 'stop-limit';
  limitPrice?: string;
  className?: string;
  error?: string;
}

const PERCENTAGE_OPTIONS = [
  { value: 25, label: '25%' },
  { value: 50, label: '50%' },
  { value: 75, label: '75%' },
  { value: 100, label: 'MAX' },
];

export function AmountInput({
  value,
  onChange,
  symbol = 'BTC',
  currentPrice = 0,
  orderSide,
  orderType,
  limitPrice,
  className,
  error
}: AmountInputProps) {
  const { balance } = useTradingStore();
  const [isFocused, setIsFocused] = useState(false);
  const [usdValue, setUsdValue] = useState('0');

  // Calculate USD equivalent
  useEffect(() => {
    const amount = parseFloat(value) || 0;
    const price = orderType === 'limit' && limitPrice 
      ? parseFloat(limitPrice) 
      : currentPrice;
    
    const usdEquivalent = amount * price;
    setUsdValue(formatNumber(usdEquivalent, { currency: true }));
  }, [value, currentPrice, limitPrice, orderType]);

  // Calculate percentage amounts based on available balance
  const calculatePercentageAmount = useCallback((percentage: number) => {
    if (orderSide === 'sell') {
      // For selling, we would need to check available asset balance
      // For now, return a reasonable default
      return (0.1 * percentage / 100).toFixed(6);
    }

    // For buying, calculate based on available USD balance
    const availableBalance = balance.available * 0.98; // Leave 2% buffer for fees
    const price = orderType === 'limit' && limitPrice 
      ? parseFloat(limitPrice) 
      : currentPrice;
    
    if (price > 0) {
      const maxAmount = availableBalance / price;
      const percentageAmount = maxAmount * (percentage / 100);
      return percentageAmount.toFixed(6);
    }
    
    return '0';
  }, [balance.available, currentPrice, limitPrice, orderType, orderSide]);

  const handlePercentageClick = (percentage: number) => {
    const amount = calculatePercentageAmount(percentage);
    onChange(amount);
  };

  const baseAsset = symbol.split('-')[0] || symbol;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Amount
        </label>
        <div className="text-xs text-muted-foreground">
          Available: {formatNumber(balance.available, { currency: true })}
        </div>
      </div>

      {/* Main input with currency indicator */}
      <div className="relative">
        <Input
          type="number"
          step="0.000001"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="0.00000000"
          className={cn(
            "pr-16 text-right font-mono transition-all duration-200",
            isFocused && "ring-2 ring-primary/20 border-primary/50",
            error && "border-destructive ring-destructive/20"
          )}
        />
        
        {/* Asset symbol overlay */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm font-medium text-muted-foreground">
          {baseAsset}
        </div>
      </div>

      {/* USD equivalent display */}
      <AnimatePresence>
        {value && parseFloat(value) > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between text-sm bg-muted/30 rounded-md p-2 border border-border/20"
          >
            <span className="text-muted-foreground flex items-center gap-1">
              <DollarSignIcon className="h-3 w-3" />
              USD Value:
            </span>
            <span className="font-mono font-medium">{usdValue}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Percentage buttons */}
      <div className="grid grid-cols-4 gap-1">
        {PERCENTAGE_OPTIONS.map((option) => {
          const calculatedAmount = calculatePercentageAmount(option.value);
          const isActive = value === calculatedAmount;
          
          return (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePercentageClick(option.value)}
              className={cn(
                "text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                isActive && "bg-primary text-primary-foreground border-primary shadow-md",
                orderSide === 'buy' 
                  ? "hover:border-green-500/50 hover:bg-green-50 dark:hover:bg-green-950/20" 
                  : "hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-950/20"
              )}
              disabled={!currentPrice || currentPrice <= 0}
            >
              {option.label}
            </Button>
          );
        })}
      </div>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-md text-sm"
          >
            <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Information tooltip */}
      {orderSide === 'buy' && currentPrice > 0 && (
        <motion.div
          className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 rounded-md text-xs border border-blue-200 dark:border-blue-800"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <InfoIcon className="h-3 w-3 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">Market Price: {formatNumber(currentPrice, { currency: true })}</div>
            <div className="text-blue-600 dark:text-blue-400">
              Click percentage buttons to auto-calculate amounts based on your available balance
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}