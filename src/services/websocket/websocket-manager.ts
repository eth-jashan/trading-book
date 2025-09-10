import { useMarketStore } from '@/stores/market/market.store';
import { useUIStore } from '@/stores/ui/ui.store';
import { storeEvents, STORE_EVENTS } from '@/stores/middleware';
import { WS_CONFIG, DEBUG } from '@/lib/constants';
import { sleep } from '@/lib/utils';

// Utility function to convert display symbols (BTC-USD) to WebSocket symbols (BTC)
const convertSymbolForWS = (displaySymbol: string): string => {
  // Remove the quote currency part (e.g., 'BTC-USD' -> 'BTC')
  return displaySymbol.split('-')[0];
};

interface WebSocketSubscription {
  id: string;
  method: string;
  subscription: Record<string, unknown>;
  callback?: (data: unknown) => void;
}

interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  reconnectAttempts: number;
  lastError: string | null;
  latency: number;
  subscriptions: Map<string, WebSocketSubscription>;
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private state: ConnectionState;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private lastPingTime = 0;
  private messageQueue: string[] = [];
  
  constructor() {
    this.state = {
      connected: false,
      connecting: false,
      reconnectAttempts: 0,
      lastError: null,
      latency: 0,
      subscriptions: new Map(),
    };
    
    // Listen for page visibility changes to manage connection
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    // Listen for network status changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }
  
  /**
   * Establish WebSocket connection
   */
  async connect(url = WS_CONFIG.HYPERLIQUID_WS_URL): Promise<void> {
    if (this.state.connecting || this.state.connected) {
      return;
    }
    
    this.state.connecting = true;
    this.state.lastError = null;
    
    try {
      this.ws = new WebSocket(url);
      
      // Set up event handlers
      this.ws.onopen = this.handleOpen;
      this.ws.onmessage = this.handleMessage;
      this.ws.onerror = this.handleError;
      this.ws.onclose = this.handleClose;
      
      // Set connection timeout
      setTimeout(() => {
        if (this.state.connecting) {
          this.handleError(new Error('Connection timeout'));
        }
      }, WS_CONFIG.CONNECTION_TIMEOUT);
      
    } catch (error) {
      this.handleError(error as Error);
    }
  }
  
  /**
   * Close WebSocket connection
   */
  disconnect(): void {
    this.clearTimers();
    
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }
    
    this.updateConnectionState({
      connected: false,
      connecting: false,
    });
  }
  
  /**
   * Send message to WebSocket
   */
  private send(message: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
      return false;
    }
    
    try {
      this.ws.send(message);
      
      if (DEBUG.LOG_WEBSOCKET) {
        console.log('📤 WS Send:', JSON.parse(message));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      this.messageQueue.push(message);
      return false;
    }
  }
  
  /**
   * Subscribe to market data
   */
  subscribe(subscription: Omit<WebSocketSubscription, 'id'>, callback?: (data: unknown) => void): string {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const sub: WebSocketSubscription = {
      ...subscription,
      id,
      callback,
    };
    
    this.state.subscriptions.set(id, sub);
    
    // Send subscription if connected
    if (this.state.connected) {
      this.send(JSON.stringify({
        method: sub.method,
        subscription: sub.subscription,
      }));
    }
    
    return id;
  }
  
  /**
   * Unsubscribe from market data
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.state.subscriptions.get(subscriptionId);
    
    if (subscription && this.state.connected) {
      this.send(JSON.stringify({
        method: 'unsubscribe',
        subscription: subscription.subscription,
      }));
    }
    
    this.state.subscriptions.delete(subscriptionId);
  }
  
  /**
   * Subscribe to all market prices
   */
  subscribeToAllMids(): string {
    return this.subscribe(
      {
        method: 'subscribe',
        subscription: { type: 'allMids' },
      },
      this.handleAllMidsUpdate
    );
  }
  
  /**
   * Subscribe to order book for a specific symbol
   */
  subscribeToOrderBook(symbol: string): string {
    const wsSymbol = convertSymbolForWS(symbol);
    return this.subscribe(
      {
        method: 'subscribe',
        subscription: { type: 'l2Book', coin: wsSymbol },
      },
      (data) => this.handleOrderBookUpdate(symbol, data)
    );
  }
  
  /**
   * Subscribe to trades for a specific symbol
   */
  subscribeToTrades(symbol: string): string {
    const wsSymbol = convertSymbolForWS(symbol);
    return this.subscribe(
      {
        method: 'subscribe',
        subscription: { type: 'trades', coin: wsSymbol },
      },
      (data) => this.handleTradesUpdate(symbol, data)
    );
  }
  
  /**
   * Subscribe to candles for a specific symbol and interval
   */
  subscribeToCandles(symbol: string, interval: string): string {
    const wsSymbol = convertSymbolForWS(symbol);
    const subscriptionMessage = {
      type: 'candle',
      coin: wsSymbol,
      interval
    };
    
    console.log('Subscribing to candles with converted symbol:', subscriptionMessage);
    
    return this.subscribe(
      {
        method: 'subscribe',
        subscription: subscriptionMessage,
      },
      (data) => this.handleCandleUpdate(symbol, interval, data)
    );
  }
  
  // Event Handlers
  private handleOpen = (): void => {
    if (DEBUG.LOG_WEBSOCKET) {
      console.log('🔗 WebSocket connected');
    }
    
    this.updateConnectionState({
      connected: true,
      connecting: false,
      reconnectAttempts: 0,
      lastError: null,
    });
    
    // Start ping/pong
    this.startPing();
    
    // Send queued messages
    this.flushMessageQueue();
    
    // Resubscribe to all active subscriptions
    this.resubscribeAll();
    
    // Emit connection event
    storeEvents.emit(STORE_EVENTS.CONNECTION_CHANGED, { connected: true });
    
    // Add success notification
    useUIStore.getState().addNotification({
      type: 'success',
      title: 'Connected',
      message: 'Real-time data connection established',
    });
  };
  
  private handleMessage = (event: MessageEvent): void => {
    try {
      const data = JSON.parse(event.data);
      
      if (DEBUG.LOG_WEBSOCKET) {
        console.log('📥 WS Receive:', data);
      }
      
      this.processMessage(data);
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };
  
  private handleError = (error: Error | Event): void => {
    const errorMessage = error instanceof Error ? error.message : 'WebSocket connection failed';
    
    console.error('❌ WebSocket error:', errorMessage);
    
    this.updateConnectionState({
      connecting: false,
      lastError: errorMessage,
    });
    
    // Add error notification
    useUIStore.getState().addNotification({
      type: 'error',
      title: 'Connection Error',
      message: errorMessage,
    });
  };
  
  private handleClose = (event: CloseEvent): void => {
    if (DEBUG.LOG_WEBSOCKET) {
      console.log('🔌 WebSocket closed:', event.code, event.reason);
    }
    
    this.clearTimers();
    
    this.updateConnectionState({
      connected: false,
      connecting: false,
    });
    
    // Emit connection event
    storeEvents.emit(STORE_EVENTS.CONNECTION_CHANGED, { connected: false });
    
    // Attempt to reconnect if not a clean close
    if (event.code !== 1000 && this.state.reconnectAttempts < WS_CONFIG.RECONNECT_ATTEMPTS) {
      this.scheduleReconnect();
    } else if (event.code !== 1000) {
      // Add error notification for failed reconnection
      useUIStore.getState().addNotification({
        type: 'error',
        title: 'Connection Lost',
        message: 'Unable to reconnect to real-time data',
        persistent: true,
      });
    }
  };
  
  // Message Processing
  private processMessage(data: unknown): void {
    const message = data as Record<string, unknown>;
    
    // Handle pong responses
    if (message.channel === 'pong') {
      this.handlePong();
      return;
    }
    
    // Route messages based on channel/type
    switch (message.channel) {
      case 'allMids':
        this.handleAllMidsUpdate(message.data);
        break;
        
      case 'l2Book':
        this.handleOrderBookUpdate(
          (message.data as { coin: string }).coin,
          message.data
        );
        break;
        
      case 'trades':
        this.handleTradesUpdate(
          (message.data as { coin: string }).coin,
          message.data
        );
        break;
        
      case 'candle':
        const candleData = message.data as { coin: string; interval: string };
        this.handleCandleUpdate(candleData.coin, candleData.interval, message.data);
        break;
        
      case 'subscriptionResponse':
        // Handle subscription confirmation
        break;
        
      default:
        if (DEBUG.LOG_WEBSOCKET) {
          console.log('🤷 Unknown message type:', message.channel);
        }
    }
  }
  
  // Data Handlers
  private handleAllMidsUpdate = (data: unknown): void => {
    const midsData = data as { mids: Record<string, string> };
    const marketStore = useMarketStore.getState();
    
    if (midsData.mids) {
      const prices: Record<string, number> = {};
      
      Object.entries(midsData.mids).forEach(([symbol, priceStr]) => {
        prices[symbol] = parseFloat(priceStr);
      });
      
      marketStore.updatePrices(prices);
    }
  };
  
  private handleOrderBookUpdate = (symbol: string, data: unknown): void => {
    const bookData = data as {
      levels: [Array<{ px: string; sz: string }>, Array<{ px: string; sz: string }>];
      time: number;
    };
    
    const marketStore = useMarketStore.getState();
    
    marketStore.updateOrderBook(symbol, {
      bids: bookData.levels[0].map(level => ({
        price: parseFloat(level.px),
        size: parseFloat(level.sz),
      })),
      asks: bookData.levels[1].map(level => ({
        price: parseFloat(level.px),
        size: parseFloat(level.sz),
      })),
      timestamp: bookData.time,
    });
  };
  
  private handleTradesUpdate = (symbol: string, data: unknown): void => {
    // Handle trade updates - could be used for trade history or last price updates
    const tradesData = data as { trades: Array<{ px: string; sz: string; time: number; side: string }> };
    
    if (tradesData.trades && tradesData.trades.length > 0) {
      const lastTrade = tradesData.trades[tradesData.trades.length - 1];
      const marketStore = useMarketStore.getState();
      
      marketStore.updatePrice(symbol, {
        price: parseFloat(lastTrade.px),
      });
    }
  };
  
  private handleCandleUpdate = (symbol: string, interval: string, data: unknown): void => {
    console.log('Received candle update:', { symbol, interval, data });
    
    // Handle both single candle and array of candles
    const candles = Array.isArray(data) ? data : [data];
    
    const marketStore = useMarketStore.getState();
    
    candles.forEach((candleData: any) => {
      if (candleData && typeof candleData === 'object') {
        const candle = {
          timestamp: candleData.t || candleData.timestamp,
          open: parseFloat(candleData.o || candleData.open),
          high: parseFloat(candleData.h || candleData.high),
          low: parseFloat(candleData.l || candleData.low),
          close: parseFloat(candleData.c || candleData.close),
          volume: parseFloat(candleData.v || candleData.volume),
        };
        
        console.log('Adding candle to store:', candle);
        marketStore.addCandle(symbol, interval, candle);
      }
    });
  };
  
  // Connection Management
  private scheduleReconnect(): void {
    const delay = Math.min(
      WS_CONFIG.RECONNECT_DELAY * Math.pow(2, this.state.reconnectAttempts),
      WS_CONFIG.MAX_RECONNECT_DELAY
    );
    
    this.updateConnectionState({
      reconnectAttempts: this.state.reconnectAttempts + 1,
    });
    
    if (DEBUG.LOG_WEBSOCKET) {
      console.log(`⏰ Scheduling reconnection in ${delay}ms (attempt ${this.state.reconnectAttempts})`);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  private resubscribeAll(): void {
    this.state.subscriptions.forEach((subscription) => {
      this.send(JSON.stringify({
        method: subscription.method,
        subscription: subscription.subscription,
      }));
    });
  }
  
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(message);
      }
    }
  }
  
  // Ping/Pong
  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        this.send(JSON.stringify({ method: 'ping' }));
      }
    }, WS_CONFIG.PING_INTERVAL);
  }
  
  private handlePong(): void {
    if (this.lastPingTime > 0) {
      const latency = Date.now() - this.lastPingTime;
      this.updateConnectionState({ latency });
    }
  }
  
  // Utility Methods
  private clearTimers(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  private updateConnectionState(updates: Partial<ConnectionState>): void {
    Object.assign(this.state, updates);
  }
  
  // Event Handlers for Browser Events
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      // Reconnect when page becomes visible
      if (!this.state.connected && !this.state.connecting) {
        this.connect();
      }
    } else {
      // Optional: disconnect when page is hidden to save resources
      // this.disconnect();
    }
  };
  
  private handleOnline = (): void => {
    if (!this.state.connected && !this.state.connecting) {
      this.connect();
    }
  };
  
  private handleOffline = (): void => {
    this.disconnect();
    
    useUIStore.getState().addNotification({
      type: 'warning',
      title: 'Offline',
      message: 'Internet connection lost. Data may be stale.',
      persistent: true,
    });
  };
  
  // Public API
  public getConnectionState(): ConnectionState {
    return { ...this.state };
  }
  
  public isConnected(): boolean {
    return this.state.connected;
  }
  
  public getLatency(): number {
    return this.state.latency;
  }
  
  public getSubscriptions(): string[] {
    return Array.from(this.state.subscriptions.keys());
  }
  
  // Cleanup
  public destroy(): void {
    this.disconnect();
    
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }
}

// Singleton instance
export const websocketManager = new WebSocketManager();

// React hook for WebSocket connection state
export const useWebSocket = () => {
  const [connectionState, setConnectionState] = useState(websocketManager.getConnectionState());
  
  useEffect(() => {
    const updateConnectionState = () => {
      setConnectionState(websocketManager.getConnectionState());
    };
    
    // Listen for connection state changes
    const unsubscribe = storeEvents.subscribe(STORE_EVENTS.CONNECTION_CHANGED, updateConnectionState);
    
    // Auto-connect on mount
    if (!connectionState.connected && !connectionState.connecting) {
      websocketManager.connect();
    }
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Use useCallback to prevent recreation on every render
  const connect = useCallback(() => websocketManager.connect(), []);
  const disconnect = useCallback(() => websocketManager.disconnect(), []);
  const subscribe = useCallback((subscription: Record<string, unknown>, callback?: (data: unknown) => void) => 
    websocketManager.subscribe(subscription, callback), []);
  const unsubscribe = useCallback((subscriptionId: string) => websocketManager.unsubscribe(subscriptionId), []);
  const subscribeToAllMids = useCallback(() => websocketManager.subscribeToAllMids(), []);
  const subscribeToOrderBook = useCallback((symbol: string) => websocketManager.subscribeToOrderBook(symbol), []);
  const subscribeToTrades = useCallback((symbol: string) => websocketManager.subscribeToTrades(symbol), []);
  const subscribeToCandles = useCallback((symbol: string, interval: string) => 
    websocketManager.subscribeToCandles(symbol, interval), []);

  return {
    ...connectionState,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    subscribeToAllMids,
    subscribeToOrderBook,
    subscribeToTrades,
    subscribeToCandles,
  };
};

// Fix import
import { useState, useEffect, useCallback } from 'react';