'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpenIcon, 
  ListIcon, 
  TrendingUpIcon,
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon
} from 'lucide-react';
import { useUIStore, useOrderBook, useOpenPositions, usePendingOrders } from '@/stores';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderForm } from '@/components/trading/OrderForm';
import { formatNumber, cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';

type RightPanelTab = 'trade' | 'orderbook' | 'positions' | 'orders';

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<RightPanelTab>('trade');
  const { selectedSymbol } = useUIStore();
  const orderBook = useOrderBook(selectedSymbol || '');
  const openPositions = useOpenPositions();
  const pendingOrders = usePendingOrders();
  
  return (
    <div className="flex flex-col h-full bg-card/30 backdrop-blur-sm">
      {/* Tab Header */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <TabButton
          active={activeTab === 'trade'}
          onClick={() => setActiveTab('trade')}
          icon={<ShoppingCartIcon className="h-4 w-4" />}
          label="Trade"
        />
        <TabButton
          active={activeTab === 'orderbook'}
          onClick={() => setActiveTab('orderbook')}
          icon={<BookOpenIcon className="h-4 w-4" />}
          label="Book"
        />
        <TabButton
          active={activeTab === 'positions'}
          onClick={() => setActiveTab('positions')}
          icon={<TrendingUpIcon className="h-4 w-4" />}
          label="Positions"
          badge={openPositions.length}
        />
        <TabButton
          active={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
          icon={<ListIcon className="h-4 w-4" />}
          label="Orders"
          badge={pendingOrders.length}
        />
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {activeTab === 'trade' && <TradePanel />}
          {activeTab === 'orderbook' && <OrderBookPanel orderBook={orderBook} />}
          {activeTab === 'positions' && <PositionsPanel positions={openPositions} />}
          {activeTab === 'orders' && <OrdersPanel orders={pendingOrders} />}
        </motion.div>
      </div>
    </div>
  );
}

// Tab Button Component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors border-b-2',
        active 
          ? 'text-primary border-primary bg-primary/5' 
          : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/50'
      )}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}

// Order Book Panel
function OrderBookPanel({ orderBook }: { orderBook: any }) {
  if (!orderBook) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select a symbol to view order book
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-between text-xs text-muted-foreground font-medium">
          <span>Size</span>
          <span>Price</span>
          <span>Total</span>
        </div>
      </div>
      
      {/* Asks (Sells) */}
      <div className="flex-1 overflow-auto">
        <div className="p-2 space-y-0.5">
          {orderBook.asks?.slice(0, 20).reverse().map((level: any, index: number) => (
            <OrderBookLevel
              key={`ask-${index}`}
              price={level.price}
              size={level.size}
              total={level.total}
              side="sell"
            />
          ))}
        </div>
      </div>
      
      {/* Spread */}
      {orderBook.bids?.[0] && orderBook.asks?.[0] && (
        <div className="p-2 border-y border-gray-200 dark:border-gray-800 bg-accent/30">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Spread</div>
            <div className="text-sm font-mono">
              {formatPrice(orderBook.asks[0].price - orderBook.bids[0].price)}
            </div>
          </div>
        </div>
      )}
      
      {/* Bids (Buys) */}
      <div className="flex-1 overflow-auto">
        <div className="p-2 space-y-0.5">
          {orderBook.bids?.slice(0, 20).map((level: any, index: number) => (
            <OrderBookLevel
              key={`bid-${index}`}
              price={level.price}
              size={level.size}
              total={level.total}
              side="buy"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Order Book Level Component
function OrderBookLevel({ price, size, total, side }: {
  price: number;
  size: number;
  total?: number;
  side: 'buy' | 'sell';
}) {
  return (
    <div className={cn(
      'flex justify-between items-center p-1 rounded text-xs font-mono hover:bg-accent/50',
      side === 'buy' ? 'hover:bg-success/10' : 'hover:bg-destructive/10'
    )}>
      <span className="text-muted-foreground">
        {formatNumber(size, { decimals: 4 })}
      </span>
      <span className={cn(
        'font-medium',
        side === 'buy' ? 'text-green-500' : 'text-destructive'
      )}>
        {formatPrice(price)}
      </span>
      <span className="text-muted-foreground text-right">
        {total ? formatNumber(total, { decimals: 2 }) : '—'}
      </span>
    </div>
  );
}

// Positions Panel
function PositionsPanel({ positions }: { positions: any[] }) {
  if (positions.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No open positions
      </div>
    );
  }
  
  return (
    <div className="overflow-auto p-2 space-y-2">
      {positions.map((position) => (
        <Card key={position.id} className="p-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">{position.symbol}</span>
              <span className={cn(
                'text-xs px-2 py-1 rounded',
                position.side === 'long' ? 'bg-success/20 text-green-500' : 'bg-destructive/20 text-destructive'
              )}>
                {position.side.toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">Size</div>
                <div className="font-mono">{formatNumber(position.size, { decimals: 4 })}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Entry</div>
                <div className="font-mono">{formatPrice(position.entryPrice)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Current</div>
                <div className="font-mono">{formatPrice(position.currentPrice)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">P&L</div>
                <div className={cn(
                  'font-mono font-medium',
                  position.pnl > 0 ? 'text-green-500' : position.pnl < 0 ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {formatNumber(position.pnl, { currency: true })}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Trade Panel
function TradePanel() {
  return (
    <div className="h-full overflow-auto">
      <OrderForm className="m-4 shadow-none border-0" />
    </div>
  );
}

// Orders Panel
function OrdersPanel({ orders }: { orders: any[] }) {
  if (orders.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No pending orders
      </div>
    );
  }
  
  return (
    <div className="overflow-auto p-2 space-y-2">
      {orders.map((order) => (
        <Card key={order.id} className="p-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">{order.symbol}</span>
              <span className={cn(
                'text-xs px-2 py-1 rounded',
                order.side === 'buy' ? 'bg-success/20 text-green-500' : 'bg-destructive/20 text-destructive'
              )}>
                {order.side.toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">Type</div>
                <div className="capitalize">{order.type}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Size</div>
                <div className="font-mono">{formatNumber(order.size, { decimals: 4 })}</div>
              </div>
              {order.price && (
                <div>
                  <div className="text-muted-foreground">Price</div>
                  <div className="font-mono">{formatPrice(order.price)}</div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground">Status</div>
                <div className="capitalize">{order.status}</div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}