import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Position, Order, Balance, Transaction, ValidationResult, RiskMetrics } from '@/lib/types';
import { storeEvents, STORE_EVENTS } from '../middleware';
import { useMarketStore } from '../market/market.store';
import { TRADING_CONFIG, STORAGE_KEYS } from '@/lib/constants';
import { 
  generateId, 
  calculatePnL, 
  calculateLiquidationPrice, 
  calculateRequiredMargin,
  formatNumber 
} from '@/lib/utils';
import { RiskManager, RiskWarning, RiskLimits } from '@/lib/risk/risk-manager';

interface TradingState {
  // Core Data
  balance: Balance;
  positions: Position[];
  orders: Order[];
  transactions: Transaction[];
  
  // Status
  loading: boolean;
  error: string | null;
  
  // Risk Management
  riskManager: RiskManager;
  riskWarnings: RiskWarning[];
  riskLimits: RiskLimits;
  
  // Actions - Orders
  placeOrder: (order: Omit<Order, 'id' | 'timestamp' | 'status'>) => Promise<string>;
  cancelOrder: (orderId: string) => void;
  modifyOrder: (orderId: string, updates: Partial<Order>) => void;
  
  // Actions - Positions
  closePosition: (positionId: string, size?: number) => Promise<void>;
  updatePosition: (positionId: string, updates: Partial<Position>) => void;
  setStopLoss: (positionId: string, stopLoss: number) => void;
  setTakeProfit: (positionId: string, takeProfit: number) => void;
  
  // Actions - Balance
  updateBalance: (updates: Partial<Balance>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  
  // Private methods
  _processMarketOrder: (order: Order) => void;
  _processLimitOrder: (order: Order, currentPrice: number) => boolean;
  _processStopOrder: (order: Order, currentPrice: number) => boolean;
  _processStopLimitOrder: (order: Order, currentPrice: number) => boolean;
  _executeOrder: (order: Order, executionPrice: number) => void;
  _closePosition: (position: Position, closePrice: number) => void;
  _checkPendingOrders: () => void;
  
  // Risk Management
  calculateRequiredMargin: (size: number, price: number, leverage: number) => number;
  calculatePositionRisk: (positionId: string) => RiskMetrics;
  validateOrder: (order: Omit<Order, 'id' | 'timestamp' | 'status'>) => ValidationResult;
  
  // Advanced Risk Management
  updateRiskLimits: (limits: Partial<RiskLimits>) => void;
  calculateDynamicLeverage: (symbol: string) => number;
  assessAccountRisk: () => ReturnType<RiskManager['assessAccountRisk']>;
  calculatePositionSizing: (symbol: string, entryPrice: number, stopLoss: number, riskPercentage?: number) => ReturnType<RiskManager['calculatePositionSizing']>;
  checkLiquidationRisk: (positionId: string) => ReturnType<RiskManager['checkLiquidationRisk']>;
  dismissWarning: (warningId: string) => void;
  clearAllWarnings: () => void;
  
  // Computed Values
  getTotalExposure: () => number;
  getPositionsBySymbol: (symbol: string) => Position[];
  getOpenPositions: () => Position[];
  getClosedPositions: () => Position[];
  getPendingOrders: () => Order[];
  getFilledOrders: () => Order[];
  getMaxLeverage: (symbol: string) => number;
  getAccountSummary: () => {
    equity: number;
    freeMargin: number;
    marginLevel: number;
    totalPnl: number;
    dayPnl: number;
  };
  
  // Utilities
  reset: () => void;
  refreshPnL: () => void;
}

const initialBalance: Balance = {
  total: TRADING_CONFIG.DEFAULT_BALANCE,
  available: TRADING_CONFIG.DEFAULT_BALANCE,
  margin: 0,
  unrealizedPnl: 0,
  realizedPnl: 0,
  marginLevel: 0,
  freeMargin: TRADING_CONFIG.DEFAULT_BALANCE,
};

// Initialize risk manager
const riskManager = new RiskManager({
  maxLeverage: TRADING_CONFIG.MAX_LEVERAGE,
  maxPositionSize: 0.1,
  maxTotalExposure: 0.5,
  maxDailyLoss: 0.05,
  maxOpenPositions: 10,
  marginCallThreshold: 0.8,
  liquidationThreshold: 0.5,
});

const initialState = {
  balance: initialBalance,
  positions: [] as Position[],
  orders: [] as Order[],
  transactions: [
    {
      id: generateId('tx'),
      type: 'deposit' as const,
      amount: TRADING_CONFIG.DEFAULT_BALANCE,
      balance: TRADING_CONFIG.DEFAULT_BALANCE,
      timestamp: Date.now(),
      description: 'Initial paper trading balance',
    },
  ] as Transaction[],
  loading: false,
  error: null,
  
  // Risk Management
  riskManager,
  riskWarnings: [] as RiskWarning[],
  riskLimits: riskManager.getLimits(),
};

export const useTradingStore = create<TradingState>()(
  devtools(
    persist(
      immer((set, get) => ({
      ...initialState,
      
      // Order Management
      placeOrder: async (orderData) => {
        console.log('Trading store: placeOrder called with:', orderData);
        return new Promise((resolve, reject) => {
          set((state) => {
            state.loading = true;
            state.error = null;
          });
          
          // Validate order
          const validation = get().validateOrder(orderData);
          console.log('Trading store: order validation result:', validation);
          
          if (!validation.isValid) {
            console.log('Trading store: order validation failed:', validation.error);
            set((state) => {
              state.loading = false;
              state.error = validation.error || 'Invalid order';
            });
            reject(new Error(validation.error));
            return;
          }
          
          const order: Order = {
            ...orderData,
            id: generateId('order'),
            timestamp: Date.now(),
            status: 'pending',
          };
          
          console.log('Trading store: created order:', order);
          
          set((state) => {
            state.orders.push(order);
            console.log('Trading store: order added to store, total orders:', state.orders.length);
            
            // Process market orders immediately (inline to avoid nested set() calls)
            if (order.type === 'market') {
              console.log('Trading store: processing market order inline');
              const marketStore = useMarketStore.getState();
              const priceData = marketStore.getPrice(order.symbol);
              
              console.log('Trading store: market price data:', priceData);
              
              if (!priceData || !priceData.price) {
                console.log('Trading store: no market price available, rejecting order');
                order.status = 'rejected';
                order.reason = 'Market price not available';
              } else {
                const executionPrice = priceData.price;
                const requiredMargin = get().calculateRequiredMargin(
                  order.size,
                  executionPrice,
                  TRADING_CONFIG.DEFAULT_LEVERAGE
                );
                
                console.log('Trading store: execution price:', executionPrice, 'required margin:', requiredMargin);
                
                // Check available balance
                if (requiredMargin > state.balance.available) {
                  console.log('Trading store: insufficient balance');
                  order.status = 'rejected';
                  order.reason = 'Insufficient balance';
                } else {
                  // Create new position with enhanced price tracking
                  const position: Position = {
                    id: generateId('pos'),
                    symbol: order.symbol,
                    side: order.side === 'buy' ? 'long' : 'short',
                    size: order.size,
                    // Price tracking
                    entryPrice: executionPrice,
                    executionPrice: executionPrice, // Track actual fill price
                    currentPrice: executionPrice,
                    markPrice: executionPrice,
                    highestPrice: executionPrice,
                    lowestPrice: executionPrice,
                    priceHistory: [{
                      price: executionPrice,
                      timestamp: Date.now(),
                      source: 'api'
                    }],
                    // Margin and leverage
                    margin: requiredMargin,
                    leverage: TRADING_CONFIG.DEFAULT_LEVERAGE,
                    // P&L tracking
                    pnl: 0,
                    pnlPercentage: 0,
                    priceChangePercent: 0,
                    // Status
                    timestamp: Date.now(),
                    lastUpdated: Date.now(),
                    status: 'open',
                    liquidationPrice: calculateLiquidationPrice(
                      executionPrice,
                      TRADING_CONFIG.DEFAULT_LEVERAGE,
                      order.side === 'buy' ? 'long' : 'short'
                    ),
                  };
                  
                  state.positions.push(position);
                  console.log('Trading store: position created:', position);
                  console.log('Trading store: total positions:', state.positions.length);
                  
                  // Update balance
                  state.balance.margin += requiredMargin;
                  state.balance.available -= requiredMargin;
                  
                  // Mark order as filled
                  order.status = 'filled';
                  order.filledPrice = executionPrice;
                  order.filledSize = order.size;
                  order.filledAt = Date.now();
                  
                  console.log('Trading store: order filled:', order);
                }
              }
            }
            
            state.loading = false;
          });
          
          console.log('Trading store: order placement completed, resolving with ID:', order.id);
          resolve(order.id);
        });
      },
      
      _processMarketOrder: (order: Order) => {
        console.log('Trading store: _processMarketOrder called with order:', order);
        set((state) => {
          const marketStore = useMarketStore.getState();
          const priceData = marketStore.getPrice(order.symbol);
          
          console.log('Trading store: market price data:', priceData);
          
          if (!priceData || !priceData.price) {
            console.log('Trading store: no market price available, rejecting order');
            order.status = 'rejected';
            order.reason = 'Market price not available';
            return;
          }
          
          const executionPrice = priceData.price;
          const requiredMargin = get().calculateRequiredMargin(
            order.size,
            executionPrice,
            TRADING_CONFIG.DEFAULT_LEVERAGE
          );
          
          // Check available balance
          if (requiredMargin > state.balance.available) {
            order.status = 'rejected';
            order.reason = 'Insufficient balance';
            return;
          }
          
          // Create or update position
          const existingPosition = state.positions.find(
            p => p.symbol === order.symbol && p.status === 'open'
          );
          
          if (existingPosition) {
            // Update existing position
            const newSize = order.side === 'buy' 
              ? existingPosition.size + order.size
              : existingPosition.size - order.size;
              
            if (newSize <= 0) {
              // Close position
              get()._closePosition(existingPosition, executionPrice);
            } else {
              // Update position
              const newEntryPrice = (
                (existingPosition.entryPrice * existingPosition.size) + 
                (executionPrice * order.size)
              ) / newSize;
              
              existingPosition.size = newSize;
              existingPosition.entryPrice = newEntryPrice;
              existingPosition.currentPrice = executionPrice;
              
              // Recalculate P&L
              const pnl = calculatePnL(
                existingPosition.entryPrice,
                executionPrice,
                existingPosition.size,
                existingPosition.side
              );
              
              existingPosition.pnl = pnl.pnl;
              existingPosition.pnlPercentage = pnl.pnlPercentage;
            }
          } else {
            // Create new position with enhanced price tracking
            const position: Position = {
              id: generateId('pos'),
              symbol: order.symbol,
              side: order.side === 'buy' ? 'long' : 'short',
              size: order.size,
              // Price tracking
              entryPrice: executionPrice,
              executionPrice: executionPrice,
              currentPrice: executionPrice,
              markPrice: executionPrice,
              highestPrice: executionPrice,
              lowestPrice: executionPrice,
              priceHistory: [{
                price: executionPrice,
                timestamp: Date.now(),
                source: 'api'
              }],
              // Margin and leverage
              margin: requiredMargin,
              leverage: TRADING_CONFIG.DEFAULT_LEVERAGE,
              // P&L tracking
              pnl: 0,
              pnlPercentage: 0,
              priceChangePercent: 0,
              // Status
              timestamp: Date.now(),
              lastUpdated: Date.now(),
              status: 'open',
              liquidationPrice: calculateLiquidationPrice(
                executionPrice,
                TRADING_CONFIG.DEFAULT_LEVERAGE,
                order.side === 'buy' ? 'long' : 'short'
              ),
            };
            
            state.positions.push(position);
            
            // Emit position opened event
            storeEvents.emit(STORE_EVENTS.POSITION_OPENED, {
              positionId: position.id,
              symbol: position.symbol,
              side: position.side,
            });
          }
          
          // Update balance
          state.balance.available -= requiredMargin;
          state.balance.margin += requiredMargin;
          state.balance.freeMargin = state.balance.available - state.balance.margin;
          
          // Update order status
          order.status = 'filled';
          order.filledPrice = executionPrice;
          order.filledSize = order.size;
          order.filledAt = Date.now();
          
          // Add transaction
          state.transactions.push({
            id: generateId('tx'),
            type: 'trade',
            amount: -requiredMargin,
            balance: state.balance.available,
            timestamp: Date.now(),
            description: `${order.side.toUpperCase()} ${order.size} ${order.symbol}`,
            relatedOrderId: order.id,
          });
          
          // Emit order filled event
          storeEvents.emit(STORE_EVENTS.ORDER_FILLED, {
            orderId: order.id,
            symbol: order.symbol,
            price: executionPrice,
          });
          
          // Update balance event
          storeEvents.emit(STORE_EVENTS.BALANCE_UPDATED, state.balance);
        });
      },
      
      cancelOrder: (orderId: string) => {
        set((state) => {
          const order = state.orders.find(o => o.id === orderId);
          if (order && order.status === 'pending') {
            order.status = 'cancelled';
          }
        });
      },
      
      modifyOrder: (orderId: string, updates: Partial<Order>) => {
        set((state) => {
          const orderIndex = state.orders.findIndex(o => o.id === orderId);
          if (orderIndex !== -1 && state.orders[orderIndex].status === 'pending') {
            state.orders[orderIndex] = { ...state.orders[orderIndex], ...updates };
          }
        });
      },
      
      // Position Management
      closePosition: async (positionId: string, size?: number) => {
        return new Promise((resolve) => {
          set((state) => {
            const position = state.positions.find(p => p.id === positionId);
            if (!position || position.status === 'closed') {
              resolve();
              return;
            }
            
            const marketStore = useMarketStore.getState();
            const priceData = marketStore.getPrice(position.symbol);
            const closePrice = priceData?.price || position.currentPrice;
            
            if (size && size < position.size) {
              // Partial close - create new position for remaining size
              const remainingSize = position.size - size;
              const closingSize = size;
              
              // Calculate P&L for closed portion
              const pnl = calculatePnL(
                position.entryPrice,
                closePrice,
                closingSize,
                position.side
              );
              
              // Update current position size
              position.size = remainingSize;
              
              // Calculate new margin for remaining position
              const newMargin = (position.margin * remainingSize) / (remainingSize + closingSize);
              const releasedMargin = position.margin - newMargin;
              
              position.margin = newMargin;
              
              // Update balance
              state.balance.available += releasedMargin + pnl.pnl;
              state.balance.margin -= releasedMargin;
              state.balance.realizedPnl += pnl.pnl;
              
            } else {
              // Full close
              get()._closePosition(position, closePrice);
            }
            
            resolve();
          });
        });
      },
      
      _closePosition: (position: Position, closePrice: number) => {
        set((state) => {
          // Calculate final P&L
          const pnl = calculatePnL(
            position.entryPrice,
            closePrice,
            position.size,
            position.side
          );
          
          // Update position
          position.status = 'closed';
          position.closedAt = Date.now();
          position.closedPrice = closePrice;
          position.realizedPnl = pnl.pnl;
          
          // Update balance
          state.balance.available += position.margin + pnl.pnl;
          state.balance.margin -= position.margin;
          state.balance.realizedPnl += pnl.pnl;
          
          // Update total balance to reflect realized gains/losses
          state.balance.total = TRADING_CONFIG.DEFAULT_BALANCE + state.balance.realizedPnl;
          
          // Recalculate free margin and margin level
          state.balance.freeMargin = state.balance.available + state.balance.unrealizedPnl;
          state.balance.marginLevel = state.balance.margin > 0
            ? ((state.balance.total + state.balance.unrealizedPnl) / state.balance.margin) * 100
            : 0;
          
          // Add transaction
          state.transactions.push({
            id: generateId('tx'),
            type: 'realized_pnl',
            amount: position.margin + pnl.pnl,
            balance: state.balance.available,
            timestamp: Date.now(),
            description: `Closed ${position.side} position for ${position.symbol}`,
            relatedPositionId: position.id,
          });
          
          // Emit position closed event
          storeEvents.emit(STORE_EVENTS.POSITION_CLOSED, {
            positionId: position.id,
            symbol: position.symbol,
            pnl: pnl.pnl,
          });
          
          // Update balance event
          storeEvents.emit(STORE_EVENTS.BALANCE_UPDATED, state.balance);
        });
      },
      
      updatePosition: (positionId: string, updates: Partial<Position>) => {
        set((state) => {
          const position = state.positions.find(p => p.id === positionId);
          if (position && position.status === 'open') {
            Object.assign(position, updates);
            
            // Recalculate unrealized P&L
            get().refreshPnL();
          }
        });
      },
      
      setStopLoss: (positionId: string, stopLoss: number) => {
        get().updatePosition(positionId, { stopLoss });
      },
      
      setTakeProfit: (positionId: string, takeProfit: number) => {
        get().updatePosition(positionId, { takeProfit });
      },
      
      // Balance Management
      updateBalance: (updates: Partial<Balance>) => {
        set((state) => {
          Object.assign(state.balance, updates);
          
          // Ensure total reflects realized P&L
          if (updates.realizedPnl !== undefined) {
            state.balance.total = TRADING_CONFIG.DEFAULT_BALANCE + state.balance.realizedPnl;
          }
          
          // Recalculate dependent values
          const equity = state.balance.total + state.balance.unrealizedPnl;
          state.balance.freeMargin = state.balance.available + state.balance.unrealizedPnl;
          state.balance.marginLevel = state.balance.margin > 0 
            ? (equity / state.balance.margin) * 100
            : 0;
          
          storeEvents.emit(STORE_EVENTS.BALANCE_UPDATED, state.balance);
        });
      },
      
      addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => {
        set((state) => {
          state.transactions.push({
            ...transaction,
            id: generateId('tx'),
            timestamp: Date.now(),
          });
        });
      },
      
      // Risk Management
      calculateRequiredMargin: (size: number, price: number, leverage: number) => {
        return calculateRequiredMargin(size, price, leverage);
      },
      
      calculatePositionRisk: (positionId: string) => {
        const position = get().positions.find(p => p.id === positionId);
        const balance = get().balance;
        
        if (!position) {
          return {
            riskAmount: 0,
            riskPercentage: 0,
            liquidationPrice: 0,
            marginLevel: 0,
            freeMargin: balance.freeMargin,
          };
        }
        
        return {
          riskAmount: position.margin,
          riskPercentage: (position.margin / balance.total) * 100,
          liquidationPrice: position.liquidationPrice || 0,
          marginLevel: balance.marginLevel,
          freeMargin: balance.freeMargin,
        };
      },
      
      validateOrder: (order: Omit<Order, 'id' | 'timestamp' | 'status'>) => {
        const { balance, positions, riskManager } = get();
        const marketStore = useMarketStore.getState();
        const priceData = marketStore.getPrice(order.symbol);
        
        if (!priceData?.price) {
          return { isValid: false, error: 'Market price not available' };
        }
        
        const executionPrice = order.price || priceData.price;
        const requiredMargin = get().calculateRequiredMargin(
          order.size,
          executionPrice,
          TRADING_CONFIG.DEFAULT_LEVERAGE
        );
        
        // Basic validations
        if (order.size <= 0) {
          return { isValid: false, error: 'Order size must be greater than 0' };
        }
        
        if (order.type === 'limit' && !order.price) {
          return { isValid: false, error: 'Limit price required for limit orders' };
        }
        
        if (order.type === 'stop' && !order.stopPrice) {
          return { isValid: false, error: 'Stop price required for stop orders' };
        }
        
        if (requiredMargin > balance.available) {
          return { 
            isValid: false, 
            error: `Insufficient balance. Required: ${formatNumber(requiredMargin, { currency: true })}, Available: ${formatNumber(balance.available, { currency: true })}` 
          };
        }
        
        // Advanced risk validation
        const riskValidation = riskManager.validateOrderRisk(order, balance, positions);
        
        if (!riskValidation.isValid) {
          // Add risk warnings to store
          set((state) => {
            state.riskWarnings = [...state.riskWarnings, ...riskValidation.warnings];
          });
          
          // Return the primary risk error
          const primaryWarning = riskValidation.warnings.find(w => w.severity === 'critical') || 
                               riskValidation.warnings.find(w => w.severity === 'high') ||
                               riskValidation.warnings[0];
          
          return { 
            isValid: false, 
            error: primaryWarning?.message || 'Risk limits exceeded',
            riskWarnings: riskValidation.warnings,
            suggestedAdjustments: riskValidation.suggestedAdjustments,
          };
        }
        
        // If order passes validation but has warnings, add them
        if (riskValidation.warnings.length > 0) {
          set((state) => {
            state.riskWarnings = [...state.riskWarnings, ...riskValidation.warnings];
          });
        }
        
        return { 
          isValid: true, 
          riskWarnings: riskValidation.warnings,
          suggestedAdjustments: riskValidation.suggestedAdjustments,
        };
      },
      
      // Computed Values
      getTotalExposure: () => {
        const { positions } = get();
        return positions
          .filter(p => p.status === 'open')
          .reduce((total, pos) => total + (pos.size * pos.currentPrice), 0);
      },
      
      getPositionsBySymbol: (symbol: string) => {
        return get().positions.filter(p => p.symbol === symbol);
      },
      
      getOpenPositions: () => {
        return get().positions.filter(p => p.status === 'open');
      },
      
      getClosedPositions: () => {
        return get().positions.filter(p => p.status === 'closed');
      },
      
      getPendingOrders: () => {
        return get().orders.filter(o => o.status === 'pending');
      },
      
      getFilledOrders: () => {
        return get().orders.filter(o => o.status === 'filled');
      },
      
      getMaxLeverage: (symbol: string) => {
        // This would typically come from asset metadata
        if (symbol.includes('BTC') || symbol.includes('ETH')) {
          return TRADING_CONFIG.MAX_LEVERAGE;
        }
        return Math.min(TRADING_CONFIG.MAX_LEVERAGE, 20);
      },
      
      getAccountSummary: () => {
        const { balance, positions } = get();
        const openPositions = positions.filter(p => p.status === 'open');
        
        const totalPnl = balance.realizedPnl + balance.unrealizedPnl;
        const equity = balance.total + balance.unrealizedPnl;
        
        // Calculate day P&L (simplified - would need proper time tracking)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const dayPnl = openPositions.reduce((sum, pos) => sum + pos.pnl, 0);
        
        return {
          equity,
          freeMargin: balance.freeMargin,
          marginLevel: balance.marginLevel,
          totalPnl,
          dayPnl,
        };
      },
      
      // Utilities
      refreshPnL: () => {
        set((state) => {
          const marketStore = useMarketStore.getState();
          let totalUnrealized = 0;
          const now = Date.now();
          
          state.positions.forEach(position => {
            if (position.status === 'open') {
              const priceData = marketStore.getPrice(position.symbol);
              if (priceData && priceData.price) {
                // Update current price and track high/low
                const previousPrice = position.currentPrice;
                position.currentPrice = priceData.price;
                position.markPrice = priceData.price;
                position.lastUpdated = now;
                
                // Track highest and lowest prices
                position.highestPrice = Math.max(position.highestPrice || priceData.price, priceData.price);
                position.lowestPrice = Math.min(position.lowestPrice || priceData.price, priceData.price);
                
                // Add to price history (limit to last 100 points)
                if (!position.priceHistory) position.priceHistory = [];
                position.priceHistory.push({
                  price: priceData.price,
                  timestamp: now,
                  source: 'websocket'
                });
                if (position.priceHistory.length > 100) {
                  position.priceHistory.shift();
                }
                
                // Calculate P&L with leverage consideration
                const pnlResult = calculatePnL(
                  position.entryPrice,
                  priceData.price,
                  position.size,
                  position.side,
                  position.leverage
                );
                
                position.pnl = pnlResult.pnl;
                position.pnlPercentage = pnlResult.pnlPercentage; // ROI on margin
                position.priceChangePercent = pnlResult.priceChangePercent;
                totalUnrealized += pnlResult.pnl;
                
                // Check stop loss and take profit
                const shouldTriggerSL = position.stopLoss && 
                  ((position.side === 'long' && priceData.price <= position.stopLoss) ||
                   (position.side === 'short' && priceData.price >= position.stopLoss));
                
                const shouldTriggerTP = position.takeProfit &&
                  ((position.side === 'long' && priceData.price >= position.takeProfit) ||
                   (position.side === 'short' && priceData.price <= position.takeProfit));
                
                if (shouldTriggerSL || shouldTriggerTP) {
                  // Auto-close position at stop/take profit
                  get()._closePosition(position, priceData.price);
                }
              } else {
                console.warn(`No price data available for ${position.symbol}`);
              }
            }
          });
          
          // Update balance with correct calculations
          state.balance.unrealizedPnl = totalUnrealized;
          
          // Calculate equity (total capital including unrealized P&L)
          const equity = state.balance.total + totalUnrealized;
          
          // Free margin is available balance plus unrealized P&L
          state.balance.freeMargin = state.balance.available + totalUnrealized;
          
          // Margin level is equity divided by used margin
          state.balance.marginLevel = state.balance.margin > 0 
            ? (equity / state.balance.margin) * 100
            : 0;
            
          // Emit balance update event
          storeEvents.emit(STORE_EVENTS.BALANCE_UPDATED, state.balance);
        });
      },
      
      // Enhanced Order Processing Methods
      _processLimitOrder: (order: Order, currentPrice: number) => {
        if (!order.price) return false;
        
        const shouldFill = (order.side === 'buy' && currentPrice <= order.price) ||
                          (order.side === 'sell' && currentPrice >= order.price);
        
        if (shouldFill) {
          get()._executeOrder(order, order.price);
          return true;
        }
        
        return false;
      },
      
      _processStopOrder: (order: Order, currentPrice: number) => {
        if (!order.stopPrice) return false;
        
        const shouldTrigger = (order.side === 'buy' && currentPrice >= order.stopPrice) ||
                             (order.side === 'sell' && currentPrice <= order.stopPrice);
        
        if (shouldTrigger) {
          // Convert to market order and execute at current price
          get()._executeOrder(order, currentPrice);
          return true;
        }
        
        return false;
      },
      
      _processStopLimitOrder: (order: Order, currentPrice: number) => {
        if (!order.stopPrice || !order.price) return false;
        
        // First check if stop condition is triggered
        const stopTriggered = (order.side === 'buy' && currentPrice >= order.stopPrice) ||
                             (order.side === 'sell' && currentPrice <= order.stopPrice);
        
        if (!stopTriggered) return false;
        
        // Then check if limit condition is met
        const limitConditionMet = (order.side === 'buy' && currentPrice <= order.price) ||
                                 (order.side === 'sell' && currentPrice >= order.price);
        
        if (limitConditionMet) {
          get()._executeOrder(order, order.price);
          return true;
        }
        
        // Stop triggered but limit not met - convert to limit order
        order.type = 'limit';
        order.stopPrice = undefined;
        
        return false;
      },
      
      _executeOrder: (order: Order, executionPrice: number) => {
        set((state) => {
          const requiredMargin = get().calculateRequiredMargin(
            order.size,
            executionPrice,
            TRADING_CONFIG.DEFAULT_LEVERAGE
          );
          
          // Check available balance
          if (requiredMargin > state.balance.available) {
            order.status = 'rejected';
            order.reason = 'Insufficient balance';
            return;
          }
          
          // Check if reducing existing position
          const existingPosition = state.positions.find(
            p => p.symbol === order.symbol && p.status === 'open'
          );
          
          if (existingPosition && order.reduceOnly) {
            // Handle position reduction
            const isClosing = (existingPosition.side === 'long' && order.side === 'sell') ||
                             (existingPosition.side === 'short' && order.side === 'buy');
            
            if (isClosing) {
              const closingSize = Math.min(order.size, existingPosition.size);
              
              if (closingSize === existingPosition.size) {
                // Close entire position
                get()._closePosition(existingPosition, executionPrice);
              } else {
                // Partial close
                const pnl = calculatePnL(
                  existingPosition.entryPrice,
                  executionPrice,
                  closingSize,
                  existingPosition.side
                );
                
                existingPosition.size -= closingSize;
                existingPosition.margin = (existingPosition.margin * existingPosition.size) / (existingPosition.size + closingSize);
                
                state.balance.available += (existingPosition.margin * closingSize / (existingPosition.size + closingSize)) + pnl.pnl;
                state.balance.realizedPnl += pnl.pnl;
              }
              
              order.status = 'filled';
              order.filledPrice = executionPrice;
              order.filledSize = closingSize;
              order.filledAt = Date.now();
              
              return;
            }
          }
          
          // Create new position or add to existing
          if (existingPosition && !order.reduceOnly) {
            // Add to existing position
            const newTotalSize = existingPosition.size + order.size;
            const newEntryPrice = (
              (existingPosition.entryPrice * existingPosition.size) + 
              (executionPrice * order.size)
            ) / newTotalSize;
            
            existingPosition.size = newTotalSize;
            existingPosition.entryPrice = newEntryPrice;
            existingPosition.margin += requiredMargin;
            
            // Recalculate liquidation price
            existingPosition.liquidationPrice = calculateLiquidationPrice(
              newEntryPrice,
              existingPosition.leverage,
              existingPosition.side
            );
          } else if (!order.reduceOnly) {
            // Create new position with enhanced price tracking
            const position: Position = {
              id: generateId('pos'),
              symbol: order.symbol,
              side: order.side === 'buy' ? 'long' : 'short',
              size: order.size,
              // Price tracking
              entryPrice: executionPrice,
              executionPrice: executionPrice,
              currentPrice: executionPrice,
              markPrice: executionPrice,
              highestPrice: executionPrice,
              lowestPrice: executionPrice,
              priceHistory: [{
                price: executionPrice,
                timestamp: Date.now(),
                source: 'api'
              }],
              // Margin and leverage
              margin: requiredMargin,
              leverage: TRADING_CONFIG.DEFAULT_LEVERAGE,
              // P&L tracking
              pnl: 0,
              pnlPercentage: 0,
              priceChangePercent: 0,
              // Status
              timestamp: Date.now(),
              lastUpdated: Date.now(),
              status: 'open',
              liquidationPrice: calculateLiquidationPrice(
                executionPrice,
                TRADING_CONFIG.DEFAULT_LEVERAGE,
                order.side === 'buy' ? 'long' : 'short'
              ),
            };
            
            state.positions.push(position);
            
            // Emit position opened event
            storeEvents.emit(STORE_EVENTS.POSITION_OPENED, {
              positionId: position.id,
              symbol: position.symbol,
              side: position.side,
            });
          }
          
          // Update balance
          if (!order.reduceOnly || !existingPosition) {
            state.balance.available -= requiredMargin;
            state.balance.margin += requiredMargin;
          }
          
          state.balance.freeMargin = state.balance.available - state.balance.margin;
          
          // Update order status
          order.status = 'filled';
          order.filledPrice = executionPrice;
          order.filledSize = order.size;
          order.filledAt = Date.now();
          
          // Add transaction
          state.transactions.push({
            id: generateId('tx'),
            type: 'trade',
            amount: order.reduceOnly ? 0 : -requiredMargin,
            balance: state.balance.available,
            timestamp: Date.now(),
            description: `${order.type.toUpperCase()} ${order.side.toUpperCase()} ${order.size} ${order.symbol}`,
            relatedOrderId: order.id,
          });
          
          // Emit order filled event
          storeEvents.emit(STORE_EVENTS.ORDER_FILLED, {
            orderId: order.id,
            symbol: order.symbol,
            price: executionPrice,
            type: order.type,
          });
          
          // Update balance event
          storeEvents.emit(STORE_EVENTS.BALANCE_UPDATED, state.balance);
        });
      },
      
      _checkPendingOrders: () => {
        const { orders } = get();
        const marketStore = useMarketStore.getState();
        
        const pendingOrders = orders.filter(o => o.status === 'pending');
        
        pendingOrders.forEach(order => {
          const priceData = marketStore.getPrice(order.symbol);
          if (!priceData?.price) return;
          
          const currentPrice = priceData.price;
          let executed = false;
          
          switch (order.type) {
            case 'limit':
              executed = get()._processLimitOrder(order, currentPrice);
              break;
            case 'stop':
              executed = get()._processStopOrder(order, currentPrice);
              break;
            case 'stop-limit':
              executed = get()._processStopLimitOrder(order, currentPrice);
              break;
          }
          
          // Check for stop-loss and take-profit on existing positions
          if (!executed && (order.type === 'limit' || order.type === 'stop')) {
            const position = get().positions.find(p => 
              p.symbol === order.symbol && p.status === 'open'
            );
            
            if (position) {
              const shouldTriggerSL = position.stopLoss && 
                ((position.side === 'long' && currentPrice <= position.stopLoss) ||
                 (position.side === 'short' && currentPrice >= position.stopLoss));
              
              const shouldTriggerTP = position.takeProfit &&
                ((position.side === 'long' && currentPrice >= position.takeProfit) ||
                 (position.side === 'short' && currentPrice <= position.takeProfit));
              
              if (shouldTriggerSL || shouldTriggerTP) {
                get()._closePosition(position, currentPrice);
              }
            }
          }
        });
      },

      // Advanced Risk Management Methods
      updateRiskLimits: (limits: Partial<RiskLimits>) => {
        set((state) => {
          state.riskManager.updateLimits(limits);
          state.riskLimits = state.riskManager.getLimits();
        });
      },
      
      calculateDynamicLeverage: (symbol: string) => {
        const { balance, positions } = get();
        const marketStore = useMarketStore.getState();
        const priceData = marketStore.getPrice(symbol);
        
        if (!priceData) return TRADING_CONFIG.DEFAULT_LEVERAGE;
        
        // Calculate volatility as a proxy (simplified)
        const volatility = Math.abs(priceData.changePercent24h || 0);
        
        // Calculate liquidity (use volume as proxy)
        const liquidity = priceData.volume24h || 0;
        
        return get().riskManager.calculateDynamicLeverage({
          baseAsset: symbol.split('-')[0],
          volatility,
          liquidity,
          userExperience: 'intermediate', // Could be configurable
          accountSize: balance.total,
          maxLeverage: TRADING_CONFIG.MAX_LEVERAGE,
        });
      },
      
      assessAccountRisk: () => {
        const { balance, positions, riskManager } = get();
        const assessment = riskManager.assessAccountRisk(balance, positions);
        
        // Update warnings in state
        set((state) => {
          state.riskWarnings = assessment.warnings;
        });
        
        return assessment;
      },
      
      calculatePositionSizing: (symbol: string, entryPrice: number, stopLoss: number, riskPercentage = 0.02) => {
        const { balance, riskManager } = get();
        return riskManager.calculatePositionSizing(symbol, entryPrice, stopLoss, balance, riskPercentage);
      },
      
      checkLiquidationRisk: (positionId: string) => {
        const { positions, riskManager } = get();
        const position = positions.find(p => p.id === positionId);
        
        if (!position) {
          return {
            isAtRisk: false,
            distanceToLiquidation: Infinity,
            recommendation: 'Position not found',
          };
        }
        
        return riskManager.checkLiquidationRisk(position);
      },
      
      dismissWarning: (warningId: string) => {
        set((state) => {
          state.riskWarnings = state.riskWarnings.filter(w => w.id !== warningId);
          state.riskManager.dismissWarning(warningId);
        });
      },
      
      clearAllWarnings: () => {
        set((state) => {
          state.riskWarnings = [];
          state.riskManager.clearAllWarnings();
        });
      },

      reset: () => {
        set(() => ({
          ...initialState,
          positions: [],
          orders: [],
          transactions: [
            {
              id: generateId('tx'),
              type: 'deposit' as const,
              amount: TRADING_CONFIG.DEFAULT_BALANCE,
              balance: TRADING_CONFIG.DEFAULT_BALANCE,
              timestamp: Date.now(),
              description: 'Initial paper trading balance (reset)',
            },
          ],
        }));
      },
      })),
      {
        name: 'trading-store',
        partialize: (state: TradingState) => ({
          balance: state.balance,
          positions: state.positions,
          orders: state.orders,
          transactions: state.transactions.slice(-500), // Keep last 500 transactions
        }),
      }
    ),
    { name: 'trading-store' }
  )
)
  

// Subscribe to price updates to refresh P&L and check pending orders
storeEvents.subscribe(STORE_EVENTS.PRICE_UPDATE, (data: { symbol: string; price: number }) => {
  const store = useTradingStore.getState();
  const openPositions = store.getOpenPositions();
  
  // Check if we have any open positions for this symbol
  const hasPositionForSymbol = openPositions.some(p => p.symbol === data.symbol);
  
  // Refresh P&L for all open positions when relevant symbol updates
  if (hasPositionForSymbol) {
    store.refreshPnL();
  }
  
  // Check pending orders for execution
  const pendingOrders = store.getPendingOrders();
  const hasPendingOrderForSymbol = pendingOrders.some(o => o.symbol === data.symbol);
  
  if (hasPendingOrderForSymbol) {
    store._checkPendingOrders();
  }
});

// Auto-subscribe to price updates for symbols with open positions
setInterval(() => {
  const store = useTradingStore.getState();
  const openPositions = store.getOpenPositions();
  const uniqueSymbols = [...new Set(openPositions.map(p => p.symbol))];
  
  // Ensure we're subscribed to all symbols with open positions
  // This is handled by WebSocket manager, but we ensure P&L is refreshed periodically
  if (openPositions.length > 0) {
    store.refreshPnL();
  }
}, 1000); // Refresh every second for real-time updates