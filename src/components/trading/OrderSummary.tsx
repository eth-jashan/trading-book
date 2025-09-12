//@ts-nocheck
'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  InfoIcon, 
  AlertTriangleIcon, 
  DollarSignIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalculatorIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';
import { useTradingStore } from '@/stores';

interface OrderSummaryProps {
  symbol: string;
  orderSide: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop' | 'stop-limit';
  amount: string;
  price?: string;
  currentPrice: number;
  className?: string;
}

interface OrderCalculations {
  estimatedValue: number;
  estimatedFees: number;
  totalCost: number;
  slippage: number;
  priceImpact: number;
  marginRequired: number;
}

const TRADING_FEES = {
  maker: 0.001, // 0.1%
  taker: 0.0015, // 0.15%
};

const ESTIMATED_SLIPPAGE = {
  market: 0.05, // 0.05% for market orders
  limit: 0,     // No slippage for limit orders
};

export function OrderSummary({
  symbol,
  orderSide,
  orderType,
  amount,
  price,
  currentPrice,
  className
}: OrderSummaryProps) {
  const { balance } = useTradingStore();

  const calculations: OrderCalculations = useMemo(() => {
    const amountNum = parseFloat(amount) || 0;
    const priceNum = orderType === 'market' ? currentPrice : (parseFloat(price || '') || currentPrice);
    
    if (amountNum <= 0 || priceNum <= 0) {
      return {
        estimatedValue: 0,
        estimatedFees: 0,
        totalCost: 0,
        slippage: 0,
        priceImpact: 0,
        marginRequired: 0,
      };
    }

    // Base calculations
    const estimatedValue = amountNum * priceNum;
    const feeRate = orderType === 'market' ? TRADING_FEES.taker : TRADING_FEES.maker;
    const estimatedFees = estimatedValue * feeRate;
    
    // Slippage calculation (for market orders)
    const slippageRate = ESTIMATED_SLIPPAGE[orderType] || 0;
    const slippage = estimatedValue * (slippageRate / 100);
    
    // Price impact (simplified calculation)
    const priceImpact = orderType === 'market' && estimatedValue > 10000 
      ? estimatedValue * 0.0001 // 0.01% for large orders
      : 0;
    
    const totalCost = orderSide === 'buy' 
      ? estimatedValue + estimatedFees + slippage + priceImpact
      : estimatedValue - estimatedFees - slippage - priceImpact;

    // Margin requirement (simplified - would be more complex in real trading)
    const marginRequired = totalCost * 0.1; // 10% margin requirement

    return {
      estimatedValue,
      estimatedFees,
      totalCost,
      slippage,
      priceImpact,
      marginRequired,
    };
  }, [amount, price, currentPrice, orderType, orderSide]);

  const hasWarnings = useMemo(() => {
    return (
      calculations.totalCost > balance.available ||
      calculations.slippage > 50 ||
      calculations.priceImpact > 100
    );
  }, [calculations, balance.available]);

  if (calculations.estimatedValue <= 0) {
    return null;
  }

  return (
    <motion.div
      className={cn(
        "space-y-4 p-5 rounded-xl border transition-all duration-200 bg-gradient-to-br",
        hasWarnings 
          ? "from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border-red-200 dark:border-red-800" 
          : "from-background to-muted/20 border-border/30 shadow-sm"
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/20">
        <h4 className="text-base font-semibold flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalculatorIcon className="h-4 w-4 text-primary" />
          </div>
          Order Summary
        </h4>
        <div className={cn(
          "px-3 py-1.5 rounded-lg text-sm font-semibold border",
          orderSide === 'buy' 
            ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" 
            : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
        )}>
          {orderType.toUpperCase()} {orderSide.toUpperCase()}
        </div>
      </div>

      {/* Main Calculations */}
      <div className="space-y-3">
        {/* Primary Info Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background/60 rounded-lg p-3 border border-border/20">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Amount</div>
            <div className="font-mono font-semibold">{amount} {symbol.split('-')[0]}</div>
          </div>
          
          <div className="bg-background/60 rounded-lg p-3 border border-border/20">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              {orderType === 'market' ? 'Market Price' : 'Limit Price'}
            </div>
            <div className="font-mono font-semibold">
              {formatNumber(orderType === 'market' ? currentPrice : parseFloat(price || '0'), { currency: true })}
            </div>
          </div>
        </div>
        
        {/* Estimated Value */}
        <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Estimated Value</span>
            <span className="font-mono text-lg font-bold text-primary">
              {formatNumber(calculations.estimatedValue, { currency: true })}
            </span>
          </div>
        </div>
        
        {/* Costs Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground font-medium">Trading Fees ({orderType === 'market' ? '0.15%' : '0.10%'})</span>
            <span className="font-mono text-red-600 dark:text-red-400 font-semibold">
              -{formatNumber(calculations.estimatedFees, { currency: true })}
            </span>
          </div>
          
          {calculations.slippage > 0 && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground font-medium">Est. Slippage (0.05%)</span>
              <span className="font-mono text-orange-600 dark:text-orange-400 font-semibold">
                -{formatNumber(calculations.slippage, { currency: true })}
              </span>
            </div>
          )}
          
          {calculations.priceImpact > 0 && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground font-medium">Price Impact</span>
              <span className="font-mono text-orange-600 dark:text-orange-400 font-semibold">
                -{formatNumber(calculations.priceImpact, { currency: true })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Total Cost/Proceeds */}
      <div className={cn(
        "p-4 rounded-xl border-2 -mx-1",
        orderSide === 'buy'
          ? "bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800"
          : "bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border-red-200 dark:border-red-800"
      )}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold uppercase tracking-wide">
            Total {orderSide === 'buy' ? 'Cost' : 'Proceeds'}
          </span>
          <div className={cn(
            "font-mono font-bold text-xl",
            orderSide === 'buy' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
          )}>
            {formatNumber(calculations.totalCost, { currency: true })}
          </div>
        </div>
        {orderSide === 'buy' && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-medium">Available After Trade</span>
            <span className={cn(
              "font-mono font-semibold",
              balance.available - calculations.totalCost >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {formatNumber(balance.available - calculations.totalCost, { currency: true })}
            </span>
          </div>
        )}
      </div>

      {/* Warnings */}
      <AnimatePresence>
        {hasWarnings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="pt-2 border-t border-red-200 dark:border-red-800"
          >
            {calculations.totalCost > balance.available && (
              <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Insufficient Balance</div>
                  <div className="text-xs">
                    You need {formatNumber(calculations.totalCost - balance.available, { currency: true })} more
                  </div>
                </div>
              </div>
            )}
            
            {calculations.slippage > 50 && (
              <div className="flex items-start gap-2 text-sm text-orange-600 dark:text-orange-400 mt-2">
                <AlertTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">High Slippage Warning</div>
                  <div className="text-xs">
                    Market conditions may cause significant slippage
                  </div>
                </div>
              </div>
            )}
            
            {calculations.priceImpact > 100 && (
              <div className="flex items-start gap-2 text-sm text-orange-600 dark:text-orange-400 mt-2">
                <AlertTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Large Order Impact</div>
                  <div className="text-xs">
                    This order may significantly impact the market price
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-background/40 rounded-lg border border-border/10">
          <div className="text-xs text-muted-foreground font-medium mb-1">Order Type</div>
          <div className="text-sm font-semibold capitalize">
            {orderType} {orderSide}
          </div>
        </div>
        
        <div className="text-center p-3 bg-background/40 rounded-lg border border-border/10">
          <div className="text-xs text-muted-foreground font-medium mb-1">Available Balance</div>
          <div className="text-sm font-mono font-semibold">
            {formatNumber(balance.available, { currency: true, compact: true })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}