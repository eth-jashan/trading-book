'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSignIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  TargetIcon 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';

interface PriceInputProps {
  value: string;
  onChange: (value: string) => void;
  currentPrice: number;
  orderType: 'limit' | 'stop' | 'stop-limit';
  orderSide: 'buy' | 'sell';
  label?: string;
  className?: string;
}

const QUICK_PRICE_OPTIONS = [
  { value: -2, label: '-2%' },
  { value: -1, label: '-1%' },
  { value: 1, label: '+1%' },
  { value: 2, label: '+2%' },
];

export function PriceInput({
  value,
  onChange,
  currentPrice,
  orderType,
  orderSide,
  label,
  className
}: PriceInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [pricePercentage, setPricePercentage] = useState(0);

  // Calculate percentage difference from market price
  useEffect(() => {
    const price = parseFloat(value);
    if (price > 0 && currentPrice > 0) {
      const percentage = ((price - currentPrice) / currentPrice) * 100;
      setPricePercentage(percentage);
    } else {
      setPricePercentage(0);
    }
  }, [value, currentPrice]);

  const handleQuickPriceClick = (percentage: number) => {
    if (currentPrice > 0) {
      const newPrice = currentPrice * (1 + percentage / 100);
      onChange(newPrice.toFixed(2));
    }
  };

  const handleMarketPriceClick = () => {
    if (currentPrice > 0) {
      onChange(currentPrice.toFixed(2));
    }
  };

  const getInputLabel = () => {
    if (label) return label;
    
    switch (orderType) {
      case 'limit':
        return 'Limit Price';
      case 'stop':
        return 'Stop Price';
      case 'stop-limit':
        return 'Stop Price';
      default:
        return 'Price';
    }
  };

  const getPriceIndicator = () => {
    if (pricePercentage === 0) return null;
    
    const isAbove = pricePercentage > 0;
    const color = isAbove ? 'text-red-500' : 'text-green-500';
    const Icon = isAbove ? TrendingUpIcon : TrendingDownIcon;
    
    return (
      <div className={cn("flex items-center gap-1 text-xs", color)}>
        <Icon className="h-3 w-3" />
        {isAbove ? '+' : ''}{pricePercentage.toFixed(2)}%
      </div>
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {getInputLabel()}
        </label>
        <button
          type="button"
          onClick={handleMarketPriceClick}
          className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          <TargetIcon className="h-3 w-3" />
          Market: {formatNumber(currentPrice, { currency: true })}
        </button>
      </div>

      {/* Price input with USD symbol */}
      <div className="relative">
        <DollarSignIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={currentPrice.toFixed(2)}
          className={cn(
            "pl-10 pr-20 text-right font-mono transition-all duration-200",
            isFocused && "ring-2 ring-primary/20 border-primary/50"
          )}
        />
        
        {/* Percentage indicator */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {getPriceIndicator()}
        </div>
      </div>

      {/* Quick percentage buttons */}
      <div className="grid grid-cols-4 gap-1">
        {QUICK_PRICE_OPTIONS.map((option) => {
          const calculatedPrice = currentPrice * (1 + option.value / 100);
          const isActive = Math.abs(parseFloat(value) - calculatedPrice) < 0.01;
          
          return (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickPriceClick(option.value)}
              className={cn(
                "text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                isActive && "bg-primary text-primary-foreground border-primary shadow-md",
                option.value > 0
                  ? "hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-950/20" 
                  : "hover:border-green-500/50 hover:bg-green-50 dark:hover:bg-green-950/20"
              )}
              disabled={!currentPrice || currentPrice <= 0}
            >
              {option.label}
            </Button>
          );
        })}
      </div>

      {/* Price analysis tooltip */}
      <AnimatePresence>
        {value && parseFloat(value) > 0 && Math.abs(pricePercentage) > 0.1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "p-2 rounded-md text-xs border",
              pricePercentage > 0 
                ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" 
                : "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
            )}
          >
            <div className="font-medium">
              {pricePercentage > 0 ? 'Above' : 'Below'} Market Price
            </div>
            <div className="text-xs opacity-80 mt-1">
              {orderType === 'limit' && orderSide === 'buy' && pricePercentage > 0 && 
                "This buy limit order will execute immediately at market price."}
              {orderType === 'limit' && orderSide === 'sell' && pricePercentage < 0 && 
                "This sell limit order will execute immediately at market price."}
              {orderType === 'limit' && orderSide === 'buy' && pricePercentage < 0 && 
                "This buy limit order will wait for the price to drop."}
              {orderType === 'limit' && orderSide === 'sell' && pricePercentage > 0 && 
                "This sell limit order will wait for the price to rise."}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}