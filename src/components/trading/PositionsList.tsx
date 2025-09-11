'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  XIcon,
  DollarSignIcon,
  TargetIcon,
  ShieldIcon,
  AlertTriangleIcon,
  MinusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SmartphoneIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTradingStore } from '@/stores/trading/trading.store';
import { useMarketStore } from '@/stores/market/market.store';
import { Position } from '@/lib/types';

interface PositionsListProps {
  className?: string;
  maxHeight?: string;
}

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

export function PositionsList({ className, maxHeight = "400px" }: PositionsListProps) {
  const { getOpenPositions, closePosition } = useTradingStore();
  const positions = getOpenPositions();
  const isMobile = useIsMobile();
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null);
  
  const handleClosePosition = async (positionId: string) => {
    try {
      await closePosition(positionId);
    } catch (error) {
      console.error('Failed to close position:', error);
    }
  };

  const togglePositionExpansion = useCallback((positionId: string) => {
    setExpandedPosition(prev => prev === positionId ? null : positionId);
  }, []);

  if (positions.length === 0) {
    return (
      <div className={cn("bg-card rounded-lg border shadow-sm", className)}>
        <div className="p-4 border-b border-border/30">
          <h3 className="text-sm font-semibold text-foreground">Open Positions</h3>
        </div>
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUpIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No Open Positions</p>
            <p className="text-xs text-muted-foreground">
              Your open positions will appear here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card rounded-lg border shadow-sm", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border/30 bg-gradient-to-r from-background to-muted/10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Open Positions</h3>
          <div className="flex items-center gap-2 text-xs bg-background/60 rounded-full px-2.5 py-1 border border-border/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-muted-foreground font-medium">{positions.length}</span>
          </div>
        </div>
      </div>

      {/* Positions List */}
      <div className="overflow-y-auto" style={{ maxHeight }}>
        <div className="p-3 space-y-3">
          <AnimatePresence mode="popLayout">
            {positions.map((position) => (
              <PositionCard 
                key={position.id} 
                position={position}
                onClose={handleClosePosition}
                isMobile={isMobile}
                isExpanded={expandedPosition === position.id}
                onToggleExpand={() => togglePositionExpansion(position.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

interface PositionCardProps {
  position: Position;
  onClose: (positionId: string) => void;
  isMobile: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function PositionCard({ position, onClose, isMobile, isExpanded, onToggleExpand }: PositionCardProps) {
  const marketStore = useMarketStore();
  
  // Use P&L values from position (already calculated with correct formula)
  const realTimePnl = position.pnl;
  const realTimePnlPercentage = position.pnlPercentage; // This is now ROI on margin
  const priceChangePercent = position.priceChangePercent || 0; // Price movement %
  
  // Get current market price for display
  const currentMarketPrice = useMemo(() => {
    const priceData = marketStore.getPrice(position.symbol);
    return priceData?.price || position.currentPrice;
  }, [marketStore, position.symbol, position.currentPrice]);
  
  const isProfit = realTimePnl >= 0;
  const isLong = position.side === 'long';

  // Swipe gesture handling for mobile
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeClose, setIsSwipeClose] = useState(false);

  const handlePan = useCallback((event: any, info: PanInfo) => {
    if (!isMobile) return;
    
    const offset = info.offset.x;
    setSwipeOffset(offset);
    
    // Show close action when swiped left more than 100px
    setIsSwipeClose(offset < -100);
  }, [isMobile]);

  const handlePanEnd = useCallback((event: any, info: PanInfo) => {
    if (!isMobile) return;
    
    const offset = info.offset.x;
    
    if (offset < -150) {
      // Swipe to close
      onClose(position.id);
    } else {
      // Reset position
      setSwipeOffset(0);
      setIsSwipeClose(false);
    }
  }, [isMobile, onClose, position.id]);

  return (
    <div className="relative overflow-hidden">
      {/* Swipe background action - only visible when swiping */}
      {isMobile && isSwipeClose && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-red-500 rounded-lg flex items-center justify-end pr-4 z-0"
        >
          <div className="flex items-center text-white">
            <XIcon className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">Close</span>
          </div>
        </motion.div>
      )}
      
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ 
          opacity: 1, 
          x: isMobile ? swipeOffset : 0,
        }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "bg-background/60 rounded-lg border border-border/20 hover:bg-background/80 transition-all relative z-10",
          isMobile ? "p-2" : "p-3",
          isMobile && "touch-pan-x"
        )}
        drag={isMobile ? "x" : false}
        dragConstraints={{ left: -200, right: 0 }}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        dragElastic={0.1}
      >
      <div className="space-y-3">
        {/* Header Row - Mobile optimized */}
        <div 
          className={cn(
            "flex items-center justify-between",
            isMobile && "cursor-pointer"
          )}
          onClick={isMobile ? onToggleExpand : undefined}
        >
          <div className="flex items-center gap-2 flex-1">
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md",
              isLong 
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            )}>
              {isLong ? (
                <TrendingUpIcon className={cn("h-3 w-3")} />
              ) : (
                <TrendingDownIcon className={cn("h-3 w-3")} />
              )}
              <span>{position.side.toUpperCase()}</span>
            </div>
            <span className={cn("font-bold", isMobile ? "text-sm" : "text-sm")}>
              {position.symbol}
            </span>
            {isMobile && (
              <div className="ml-auto flex items-center gap-2">
                {/* Mobile P&L preview */}
                <div className={cn(
                  "text-xs font-medium",
                  isProfit 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-red-600 dark:text-red-400"
                )}>
                  {isProfit ? '+' : ''}${realTimePnl.toLocaleString('en-US', { 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 0 
                  })}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className={cn("h-6 w-6 text-muted-foreground", isExpanded && "rotate-180")}
              >
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onClose(position.id);
              }}
              className={cn(
                "text-muted-foreground hover:text-destructive",
                isMobile ? "h-7 w-7" : "h-6 w-6"
              )}
            >
              <XIcon className={cn(isMobile ? "h-4 w-4" : "h-3.5 w-3.5")} />
            </Button>
          </div>
        </div>

        {/* Collapsible Details - Only on mobile */}
        <AnimatePresence>
          {(!isMobile || isExpanded) && (
            <motion.div
              initial={isMobile ? { opacity: 0, height: 0 } : false}
              animate={isMobile ? { opacity: 1, height: "auto" } : false}
              exit={isMobile ? { opacity: 0, height: 0 } : false}
              transition={{ duration: 0.2 }}
            >
              {/* Position Info Grid */}
              <div className={cn(
                "grid gap-3 text-xs",
                isMobile ? "grid-cols-2 gap-2" : "grid-cols-2 gap-3"
              )}>
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">Size</span>
            <div className="font-mono font-semibold">
              {position.size.toLocaleString()}
            </div>
          </div>
          
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">Entry</span>
            <div className="font-mono font-semibold">
              ${position.entryPrice.toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 4 
              })}
            </div>
          </div>
          
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">Current</span>
            <div className="font-mono font-semibold">
              ${currentMarketPrice.toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 4 
              })}
            </div>
          </div>
          
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">Leverage</span>
            <div className="font-semibold">
              {position.leverage}x
            </div>
          </div>
        </div>

        {/* P&L Section */}
        <div className={cn(
          "bg-background/40 rounded-md p-2 border",
          isProfit 
            ? "border-green-200 dark:border-green-800/50" 
            : "border-red-200 dark:border-red-800/50"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  color: isProfit ? '#10b981' : '#ef4444'
                }}
                transition={{ duration: 0.5 }}
                key={realTimePnl}
              >
                <DollarSignIcon className="h-3.5 w-3.5" />
              </motion.div>
              <span className="text-xs text-muted-foreground font-medium">Unrealized P&L</span>
            </div>
            
            <div className="text-right">
              <div className={cn(
                "font-mono font-bold text-sm",
                isProfit 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-red-600 dark:text-red-400"
              )}>
                {isProfit ? '+' : ''}${realTimePnl.toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </div>
              <div className={cn(
                "text-xs font-medium",
                isProfit 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-red-600 dark:text-red-400"
              )}>
                {isProfit ? '+' : ''}{realTimePnlPercentage.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

              {/* Stop Loss & Take Profit */}
              {(position.stopLoss || position.takeProfit) && (
                <div className="flex gap-2 mt-3">
                  {position.stopLoss && (
                    <div className="flex items-center gap-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                      <ShieldIcon className="h-3 w-3" />
                      <span className="font-medium">SL: ${position.stopLoss.toFixed(2)}</span>
                    </div>
                  )}
                  {position.takeProfit && (
                    <div className="flex items-center gap-1.5 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                      <TargetIcon className="h-3 w-3" />
                      <span className="font-medium">TP: ${position.takeProfit.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </motion.div>
    </div>
  );
}