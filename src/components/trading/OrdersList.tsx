//@ts-nocheck
'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  ClockIcon,
  XIcon,
  DollarSignIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  StopCircleIcon,
  TargetIcon,
  EditIcon,
  MoreHorizontalIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTradingStore } from '@/stores/trading/trading.store';
import { useMarketStore } from '@/stores/market/market.store';
import { Order } from '@/lib/types';
import { formatNumber, formatTimestamp } from '@/lib/utils';

interface OrdersListProps {
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

export function OrdersList({ className, maxHeight = "400px" }: OrdersListProps) {
  const { getPendingOrders, cancelOrder, getFilledOrders } = useTradingStore();
  const pendingOrders = getPendingOrders();
  const filledOrders = getFilledOrders().slice(-5); // Show last 5 filled orders
  const isMobile = useIsMobile();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showFilled, setShowFilled] = useState(false);
  
  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder(orderId);
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  const toggleOrderExpansion = useCallback((orderId: string) => {
    setExpandedOrder(prev => prev === orderId ? null : orderId);
  }, []);

  const displayOrders = showFilled ? filledOrders : pendingOrders;

  if (pendingOrders.length === 0 && filledOrders.length === 0) {
    return (
      <div className={cn("bg-card rounded-lg border shadow-sm", className)}>
        <div className="p-4 border-b border-border/30">
          <h3 className="text-sm font-semibold text-foreground">Orders</h3>
        </div>
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <ClockIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No Orders</p>
            <p className="text-xs text-muted-foreground">
              Your pending and executed orders will appear here
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
          <h3 className="text-sm font-semibold text-foreground">Orders</h3>
          <div className="flex items-center gap-2">
            {/* Toggle between pending and filled */}
            <div className="flex items-center gap-1 p-1 bg-accent rounded-lg">
              <button
                onClick={() => setShowFilled(false)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded transition-colors',
                  !showFilled
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Pending ({pendingOrders.length})
              </button>
              <button
                onClick={() => setShowFilled(true)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded transition-colors',
                  showFilled
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Recent ({filledOrders.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="overflow-y-auto" style={{ maxHeight }}>
        <div className="p-3 space-y-3">
          <AnimatePresence mode="popLayout">
            {displayOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order}
                onCancel={handleCancelOrder}
                isMobile={isMobile}
                isExpanded={expandedOrder === order.id}
                onToggleExpand={() => toggleOrderExpansion(order.id)}
                isPending={!showFilled}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  onCancel: (orderId: string) => void;
  isMobile: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isPending: boolean;
}

function OrderCard({ order, onCancel, isMobile, isExpanded, onToggleExpand, isPending }: OrderCardProps) {
  const marketStore = useMarketStore();
  
  // Get current market price for comparison
  const currentMarketPrice = useMemo(() => {
    const priceData = marketStore.getPrice(order.symbol);
    return priceData?.price || 0;
  }, [marketStore, order.symbol]);
  
  const isLong = order.side === 'buy';
  const orderPrice = order.price || 0;
  
  // Calculate distance from current price for limit orders
  const priceDistance = currentMarketPrice > 0 ? 
    ((orderPrice - currentMarketPrice) / currentMarketPrice) * 100 : 0;

  // Swipe gesture handling for mobile
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeCancel, setIsSwipeCancel] = useState(false);

  const handlePan = useCallback((event: any, info: PanInfo) => {
    if (!isMobile || !isPending) return;
    
    const offset = info.offset.x;
    setSwipeOffset(offset);
    
    // Show cancel action when swiped left more than 100px
    setIsSwipeCancel(offset < -100);
  }, [isMobile, isPending]);

  const handlePanEnd = useCallback((event: any, info: PanInfo) => {
    if (!isMobile || !isPending) return;
    
    const offset = info.offset.x;
    
    if (offset < -150) {
      // Swipe to cancel
      onCancel(order.id);
    } else {
      // Reset position
      setSwipeOffset(0);
      setIsSwipeCancel(false);
    }
  }, [isMobile, isPending, onCancel, order.id]);

  const getOrderIcon = (type: string, side: string) => {
    const iconClass = "h-3.5 w-3.5";
    
    switch (type) {
      case 'limit':
        return <TargetIcon className={iconClass} />;
      case 'stop':
        return <StopCircleIcon className={iconClass} />;
      case 'stop-limit':
        return <AlertCircleIcon className={iconClass} />;
      case 'market':
        return side === 'buy' ? 
          <TrendingUpIcon className={iconClass} /> : 
          <TrendingDownIcon className={iconClass} />;
      default:
        return <ClockIcon className={iconClass} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-3 w-3 text-orange-500" />;
      case 'filled':
        return <CheckCircleIcon className="h-3 w-3 text-green-500" />;
      case 'cancelled':
        return <XIcon className="h-3 w-3 text-red-500" />;
      case 'rejected':
        return <AlertCircleIcon className="h-3 w-3 text-red-500" />;
      default:
        return <ClockIcon className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Swipe background action - only visible when swiping pending orders */}
      {isMobile && isSwipeCancel && isPending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-red-500 rounded-lg flex items-center justify-end pr-4 z-0"
        >
          <div className="flex items-center text-white">
            <XIcon className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">Cancel</span>
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
          isMobile && isPending && "touch-pan-x"
        )}
        drag={isMobile && isPending ? "x" : false}
        dragConstraints={{ left: -200, right: 0 }}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        dragElastic={0.1}
      >
        <div className="space-y-3">
          {/* Header Row */}
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
                {getOrderIcon(order.type, order.side)}
                <span>{order.side.toUpperCase()}</span>
              </div>
              
              <span className={cn("font-bold", isMobile ? "text-sm" : "text-sm")}>
                {order.symbol}
              </span>
              
              <div className="flex items-center gap-1">
                {getStatusIcon(order.status)}
                <span className="text-xs text-muted-foreground capitalize">
                  {order.type}
                </span>
              </div>
              
              {isMobile && (
                <div className="ml-auto flex items-center gap-2">
                  <div className="text-xs font-mono text-muted-foreground">
                    {formatNumber(orderPrice, { currency: true })}
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
              {isPending && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel(order.id);
                  }}
                  className={cn(
                    "text-muted-foreground hover:text-destructive",
                    isMobile ? "h-7 w-7" : "h-6 w-6"
                  )}
                >
                  <XIcon className={cn(isMobile ? "h-4 w-4" : "h-3.5 w-3.5")} />
                </Button>
              )}
            </div>
          </div>

          {/* Collapsible Details */}
          <AnimatePresence>
            {(!isMobile || isExpanded) && (
              <motion.div
                initial={isMobile ? { opacity: 0, height: 0 } : false}
                animate={isMobile ? { opacity: 1, height: "auto" } : false}
                exit={isMobile ? { opacity: 0, height: 0 } : false}
                transition={{ duration: 0.2 }}
              >
                {/* Order Info Grid */}
                <div className={cn(
                  "grid gap-3 text-xs",
                  isMobile ? "grid-cols-2 gap-2" : "grid-cols-2 gap-3"
                )}>
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Size</span>
                    <div className="font-mono font-semibold">
                      {order.size.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">
                      {order.type === 'market' ? 'Market Price' : 'Order Price'}
                    </span>
                    <div className="font-mono font-semibold">
                      {formatNumber(orderPrice, { currency: true })}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Current Price</span>
                    <div className="font-mono font-semibold">
                      {formatNumber(currentMarketPrice, { currency: true })}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Created</span>
                    <div className="text-muted-foreground">
                      {formatTimestamp(order.timestamp, 'short')}
                    </div>
                  </div>
                </div>

                {/* Price Distance for Limit Orders */}
                {(order.type === 'limit' || order.type === 'stop-limit') && isPending && (
                  <div className={cn(
                    "bg-background/40 rounded-md p-2 border mt-3",
                    Math.abs(priceDistance) > 5 
                      ? "border-orange-200 dark:border-orange-800/50" 
                      : "border-green-200 dark:border-green-800/50"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        Distance from Market
                      </span>
                      <div className={cn(
                        "text-xs font-semibold",
                        priceDistance > 0 
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      )}>
                        {priceDistance > 0 ? '+' : ''}{priceDistance.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Filled Order Details */}
                {!isPending && order.status === 'filled' && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-md p-2 border border-green-200 dark:border-green-800/50 mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-700 dark:text-green-300 font-medium">
                        Filled at {formatNumber(order.filledPrice || 0, { currency: true })}
                      </span>
                      <span className="text-muted-foreground">
                        {order.filledAt && formatTimestamp(order.filledAt, 'short')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Stop Price for Stop Orders */}
                {order.stopPrice && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex items-center gap-1.5 text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">
                      <StopCircleIcon className="h-3 w-3" />
                      <span className="font-medium">
                        Stop: {formatNumber(order.stopPrice, { currency: true })}
                      </span>
                    </div>
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