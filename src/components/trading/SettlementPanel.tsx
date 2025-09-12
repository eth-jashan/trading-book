//@ts-nocheck
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSignIcon,
  WalletIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  MinusIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTradingStore } from '@/stores/trading/trading.store';
import { formatNumber } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SettlementPanelProps {
  className?: string;
}

export function SettlementPanel({ className }: SettlementPanelProps) {
  const { balance, withdrawBalance } = useTradingStore();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  // Calculate total P&L (realized + unrealized)
  const totalPnL = balance.realizedPnl + balance.unrealizedPnl;
  const isProfitable = totalPnL > 0;
  const startingBalance = 100000; // TRADING_CONFIG.DEFAULT_BALANCE
  
  // Calculate return percentage
  const returnPercentage = (totalPnL / startingBalance) * 100;
  
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount)) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setIsWithdrawing(true);
    
    try {
      const result = withdrawBalance(amount);
      
      if (result.success) {
        toast.success(`Successfully withdrew ${formatNumber(amount, { currency: true })}`);
        setWithdrawAmount('');
      } else {
        toast.error(result.error || 'Withdrawal failed');
      }
    } catch (error) {
      toast.error('Withdrawal failed');
      console.error('Withdrawal error:', error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleWithdrawAll = () => {
    setWithdrawAmount(balance.available.toString());
  };

  return (
    <div className={cn("bg-card rounded-lg border shadow-sm", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border/30 bg-gradient-to-r from-background to-muted/10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <WalletIcon className="h-4 w-4 text-primary" />
            </div>
            Settlement
          </h3>
        </div>
      </div>

      {/* Settlement Content */}
      <div className="p-4 space-y-4">
        {/* Balance Summary */}
        <div className="grid grid-cols-1 gap-3">
          {/* Total P&L */}
          <Card className={cn(
            "p-4 border-2 transition-all",
            isProfitable 
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50"
              : totalPnL < 0
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50"
                : "bg-muted/20 border-border/30"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  isProfitable 
                    ? "bg-green-500/10 text-green-600"
                    : totalPnL < 0
                      ? "bg-red-500/10 text-red-600"
                      : "bg-muted text-muted-foreground"
                )}>
                  {isProfitable ? (
                    <TrendingUpIcon className="h-5 w-5" />
                  ) : totalPnL < 0 ? (
                    <TrendingDownIcon className="h-5 w-5" />
                  ) : (
                    <MinusIcon className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Total P&L</div>
                  <div className={cn(
                    "text-xl font-bold",
                    isProfitable && "text-green-600 dark:text-green-400",
                    totalPnL < 0 && "text-red-600 dark:text-red-400"
                  )}>
                    {isProfitable ? '+' : ''}{formatNumber(totalPnL, { currency: true })}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-muted-foreground">Return</div>
                <div className={cn(
                  "text-lg font-bold",
                  isProfitable && "text-green-600 dark:text-green-400",
                  returnPercentage < 0 && "text-red-600 dark:text-red-400"
                )}>
                  {isProfitable ? '+' : ''}{returnPercentage.toFixed(2)}%
                </div>
              </div>
            </div>
          </Card>

          {/* Balance Details */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Current Balance</div>
                <div className="text-lg font-bold font-mono">
                  {formatNumber(balance.total, { currency: true })}
                </div>
              </div>
            </Card>
            
            <Card className="p-3">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Available</div>
                <div className="text-lg font-bold font-mono text-green-600 dark:text-green-400">
                  {formatNumber(balance.available, { currency: true })}
                </div>
              </div>
            </Card>
          </div>

          {/* P&L Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Realized P&L</div>
                <div className={cn(
                  "text-sm font-semibold font-mono",
                  balance.realizedPnl > 0 && "text-green-600 dark:text-green-400",
                  balance.realizedPnl < 0 && "text-red-600 dark:text-red-400"
                )}>
                  {balance.realizedPnl > 0 ? '+' : ''}{formatNumber(balance.realizedPnl, { currency: true })}
                </div>
              </div>
            </Card>
            
            <Card className="p-3">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Unrealized P&L</div>
                <div className={cn(
                  "text-sm font-semibold font-mono",
                  balance.unrealizedPnl > 0 && "text-green-600 dark:text-green-400",
                  balance.unrealizedPnl < 0 && "text-red-600 dark:text-red-400"
                )}>
                  {balance.unrealizedPnl > 0 ? '+' : ''}{formatNumber(balance.unrealizedPnl, { currency: true })}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Withdrawal Section */}
        {balance.available > 0 && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSignIcon className="h-4 w-4 text-primary" />
                <div className="text-sm font-semibold">Withdraw Balance</div>
              </div>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="flex-1"
                    min="0"
                    max={balance.available}
                    step="0.01"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleWithdrawAll}
                    className="whitespace-nowrap"
                  >
                    Max
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleWithdraw}
                    disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                    className="flex-1"
                    size="sm"
                  >
                    {isWithdrawing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Withdrawing...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Withdraw
                      </>
                    )}
                  </Button>
                </div>

                {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                  <div className="text-xs text-muted-foreground">
                    After withdrawal: {formatNumber(balance.available - parseFloat(withdrawAmount), { currency: true })} remaining
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Settlement Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <AlertTriangleIcon className="h-3 w-3" />
            <span>This is paper trading. Withdrawals are for simulation purposes only.</span>
          </div>
          <div>• Started with: {formatNumber(startingBalance, { currency: true })}</div>
          <div>• Current total: {formatNumber(balance.total, { currency: true })}</div>
        </div>
      </div>
    </div>
  );
}