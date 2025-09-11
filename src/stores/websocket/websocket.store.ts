//@ts-nocheck
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { WebSocketConnectionState } from '@/lib/types';
import { storeEvents, STORE_EVENTS } from '../middleware';

interface WebSocketState extends WebSocketConnectionState {
  // Connection Management
  ws: WebSocket | null;
  reconnectTimeout: NodeJS.Timeout | null;
  pingInterval: NodeJS.Timeout | null;
  lastPingTime: number;
  
  // Configuration
  url: string;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  pingIntervalMs: number;
  connectionTimeout: number;
  
  // Actions - Connection Management
  connect: (url: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
  
  // Actions - Subscription Management
  subscribe: (subscription: object) => void;
  unsubscribe: (subscription: object) => void;
  addSubscription: (subscription: string) => void;
  removeSubscription: (subscription: string) => void;
  clearSubscriptions: () => void;
  resubscribeAll: () => void;
  
  // Actions - Message Handling
  sendMessage: (message: object) => boolean;
  handleMessage: (event: MessageEvent) => void;
  
  // Actions - Connection Quality
  updateLatency: (latency: number) => void;
  updateConnectionQuality: () => void;
  
  // Actions - Error Handling
  handleError: (error: Event) => void;
  handleClose: (event: CloseEvent) => void;
  
  // Internal Methods
  _startPing: () => void;
  _stopPing: () => void;
  _scheduleReconnect: () => void;
  _clearReconnectTimeout: () => void;
  _resetConnection: () => void;
  
  // Utilities
  isConnected: () => boolean;
  getConnectionStatus: () => string;
  reset: () => void;
}

const HYPERLIQUID_WS_URL = 'wss://api.hyperliquid.xyz/ws';
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
const DEFAULT_RECONNECT_DELAY = 1000; // Start with 1 second
const DEFAULT_PING_INTERVAL = 30000; // 30 seconds
const DEFAULT_CONNECTION_TIMEOUT = 10000; // 10 seconds

const initialState: Omit<WebSocketState, keyof Omit<WebSocketState, keyof WebSocketConnectionState>> = {
  connected: false,
  connecting: false,
  reconnectAttempts: 0,
  lastError: null,
  connectionQuality: 'disconnected',
  latency: 0,
  subscriptions: new Set<string>(),
  
  // Internal state
  ws: null,
  reconnectTimeout: null,
  pingInterval: null,
  lastPingTime: 0,
  
  // Configuration
  url: HYPERLIQUID_WS_URL,
  maxReconnectAttempts: DEFAULT_MAX_RECONNECT_ATTEMPTS,
  reconnectDelay: DEFAULT_RECONNECT_DELAY,
  pingIntervalMs: DEFAULT_PING_INTERVAL,
  connectionTimeout: DEFAULT_CONNECTION_TIMEOUT,
};

export const useWebSocketStore = create<WebSocketState>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      connect: async (url?: string) => {
        return new Promise((resolve, reject) => {
          const wsUrl = url || get().url;
          
          set((state) => {
            state.connecting = true;
            state.lastError = null;
            state.url = wsUrl;
          });
          
          try {
            const ws = new WebSocket(wsUrl);
            
            // Connection timeout handler
            const connectionTimeout = setTimeout(() => {
              if (ws.readyState === WebSocket.CONNECTING) {
                ws.close();
                get().handleError(new Event('Connection timeout'));
                reject(new Error('Connection timeout'));
              }
            }, get().connectionTimeout);
            
            ws.onopen = () => {
              console.log('WebSocket connected to:', wsUrl);
              clearTimeout(connectionTimeout);
              
              set((state) => {
                state.ws = ws;
                state.connected = true;
                state.connecting = false;
                state.reconnectAttempts = 0;
                state.connectionQuality = 'good';
                state.lastError = null;
              });
              
              // Start ping mechanism
              get()._startPing();
              
              // Resubscribe to all active subscriptions
              get().resubscribeAll();
              
              // Emit connection event
              storeEvents.emit(STORE_EVENTS.CONNECTION_CHANGED, {
                connected: true,
                url: wsUrl,
              });
              
              resolve();
            };
            
            ws.onmessage = (event) => {
              get().handleMessage(event);
            };
            
            ws.onerror = (error) => {
              console.error('WebSocket error:', error);
              clearTimeout(connectionTimeout);
              get().handleError(error);
              reject(error);
            };
            
            ws.onclose = (event) => {
              clearTimeout(connectionTimeout);
              get().handleClose(event);
            };
            
          } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            set((state) => {
              state.connecting = false;
              state.lastError = (error as Error).message;
            });
            reject(error);
          }
        });
      },
      
      disconnect: () => {
        const { ws } = get();
        
        if (ws) {
          console.log('Disconnecting WebSocket...');
          ws.close(1000, 'Manual disconnect');
        }
        
        get()._resetConnection();
        
        storeEvents.emit(STORE_EVENTS.CONNECTION_CHANGED, {
          connected: false,
          manual: true,
        });
      },
      
      reconnect: () => {
        console.log('Reconnecting WebSocket...');
        get().disconnect();
        
        setTimeout(() => {
          const { reconnectAttempts, maxReconnectAttempts } = get();
          
          if (reconnectAttempts < maxReconnectAttempts) {
            set((state) => {
              state.reconnectAttempts++;
            });
            
            get().connect().catch((error) => {
              console.error('Reconnection failed:', error);
              get()._scheduleReconnect();
            });
          } else {
            console.error('Max reconnect attempts reached');
            set((state) => {
              state.lastError = 'Max reconnect attempts reached';
              state.connectionQuality = 'disconnected';
            });
          }
        }, 1000);
      },
      
      // Subscription Management
      subscribe: (subscription: object) => {
        const message = JSON.stringify({
          method: 'subscribe',
          subscription,
        });
        
        if (get().sendMessage({ method: 'subscribe', subscription })) {
          get().addSubscription(message);
        }
      },
      
      unsubscribe: (subscription: object) => {
        const message = JSON.stringify({
          method: 'unsubscribe',
          subscription,
        });
        
        if (get().sendMessage({ method: 'unsubscribe', subscription })) {
          get().removeSubscription(message);
        }
      },
      
      addSubscription: (subscription: string) => {
        set((state) => {
          state.subscriptions.add(subscription);
        });
      },
      
      removeSubscription: (subscription: string) => {
        set((state) => {
          state.subscriptions.delete(subscription);
        });
      },
      
      clearSubscriptions: () => {
        set((state) => {
          state.subscriptions.clear();
        });
      },
      
      resubscribeAll: () => {
        const { subscriptions, ws } = get();
        
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          return;
        }
        
        console.log(`Resubscribing to ${subscriptions.size} subscriptions...`);
        
        subscriptions.forEach((subscription) => {
          try {
            ws.send(subscription);
          } catch (error) {
            console.error('Failed to resubscribe:', error);
          }
        });
      },
      
      // Message Handling
      sendMessage: (message: object) => {
        const { ws, connected } = get();
        
        if (!ws || !connected || ws.readyState !== WebSocket.OPEN) {
          console.warn('Cannot send message: WebSocket not connected');
          return false;
        }
        
        try {
          ws.send(JSON.stringify(message));
          return true;
        } catch (error) {
          console.error('Failed to send WebSocket message:', error);
          get().handleError(error as Event);
          return false;
        }
      },
      
      handleMessage: (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle pong responses
          if (data.method === 'pong') {
            const latency = Date.now() - get().lastPingTime;
            get().updateLatency(latency);
            return;
          }
          
          // Handle subscription responses
          if (data.channel === 'subscriptionResponse') {
            console.log('Subscription response:', data);
            return;
          }
          
          // Forward market data to market store
          if (data.channel === 'allMids') {
            storeEvents.emit(STORE_EVENTS.PRICE_UPDATE, data);
          } else if (data.channel === 'l2Book') {
            storeEvents.emit('market:orderbook', data);
          } else if (data.channel === 'trades') {
            storeEvents.emit('market:trades', data);
          } else if (data.channel === 'candle') {
            storeEvents.emit('market:candle', data);
          }
          
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      },
      
      // Connection Quality
      updateLatency: (latency: number) => {
        set((state) => {
          state.latency = latency;
        });
        
        get().updateConnectionQuality();
      },
      
      updateConnectionQuality: () => {
        const { latency, connected } = get();
        
        if (!connected) {
          set((state) => {
            state.connectionQuality = 'disconnected';
          });
          return;
        }
        
        let quality: WebSocketConnectionState['connectionQuality'];
        
        if (latency < 50) {
          quality = 'excellent';
        } else if (latency < 150) {
          quality = 'good';
        } else {
          quality = 'poor';
        }
        
        set((state) => {
          state.connectionQuality = quality;
        });
      },
      
      // Error Handling
      handleError: (error: Event) => {
        console.error('WebSocket error:', error);
        
        set((state) => {
          state.lastError = error.type || 'Unknown WebSocket error';
          state.connectionQuality = 'disconnected';
        });
        
        storeEvents.emit(STORE_EVENTS.CONNECTION_CHANGED, {
          connected: false,
          error: error.type,
        });
      },
      
      handleClose: (event: CloseEvent) => {
        console.log('WebSocket closed:', event.code, event.reason);
        
        set((state) => {
          state.connected = false;
          state.connecting = false;
          state.connectionQuality = 'disconnected';
          
          if (event.code !== 1000) { // Not a normal closure
            state.lastError = `Connection closed: ${event.reason || 'Unknown reason'}`;
          }
        });
        
        get()._resetConnection();
        
        // Schedule reconnect if not a manual disconnect
        if (event.code !== 1000 && event.code !== 1001) {
          get()._scheduleReconnect();
        }
        
        storeEvents.emit(STORE_EVENTS.CONNECTION_CHANGED, {
          connected: false,
          code: event.code,
          reason: event.reason,
        });
      },
      
      // Internal Methods
      _startPing: () => {
        get()._stopPing();
        
        const pingInterval = setInterval(() => {
          const { ws, connected } = get();
          
          if (ws && connected && ws.readyState === WebSocket.OPEN) {
            set((state) => {
              state.lastPingTime = Date.now();
            });
            
            get().sendMessage({ method: 'ping' });
          } else {
            get()._stopPing();
          }
        }, get().pingIntervalMs);
        
        set((state) => {
          state.pingInterval = pingInterval;
        });
      },
      
      _stopPing: () => {
        const { pingInterval } = get();
        
        if (pingInterval) {
          clearInterval(pingInterval);
          set((state) => {
            state.pingInterval = null;
          });
        }
      },
      
      _scheduleReconnect: () => {
        get()._clearReconnectTimeout();
        
        const { reconnectAttempts, maxReconnectAttempts, reconnectDelay } = get();
        
        if (reconnectAttempts >= maxReconnectAttempts) {
          console.log('Max reconnect attempts reached, not scheduling reconnect');
          return;
        }
        
        // Exponential backoff with jitter
        const delay = Math.min(
          reconnectDelay * Math.pow(2, reconnectAttempts) + Math.random() * 1000,
          30000 // Max 30 seconds
        );
        
        console.log(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        
        const timeout = setTimeout(() => {
          get().reconnect();
        }, delay);
        
        set((state) => {
          state.reconnectTimeout = timeout;
        });
      },
      
      _clearReconnectTimeout: () => {
        const { reconnectTimeout } = get();
        
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          set((state) => {
            state.reconnectTimeout = null;
          });
        }
      },
      
      _resetConnection: () => {
        get()._stopPing();
        get()._clearReconnectTimeout();
        
        set((state) => {
          state.ws = null;
          state.connected = false;
          state.connecting = false;
        });
      },
      
      // Utilities
      isConnected: () => {
        const { ws, connected } = get();
        return connected && ws?.readyState === WebSocket.OPEN;
      },
      
      getConnectionStatus: () => {
        const { connected, connecting, reconnectAttempts, connectionQuality } = get();
        
        if (connecting) return 'connecting';
        if (connected) return `connected (${connectionQuality})`;
        if (reconnectAttempts > 0) return `reconnecting (${reconnectAttempts})`;
        return 'disconnected';
      },
      
      reset: () => {
        get().disconnect();
        get().clearSubscriptions();
        
        set(() => ({
          ...initialState,
          subscriptions: new Set<string>(),
        }));
      },
    })),
    { name: 'websocket-store' }
  )
);

// Helper hooks
export const useWebSocketConnection = () => {
  const connected = useWebSocketStore(state => state.connected);
  const connecting = useWebSocketStore(state => state.connecting);
  const connectionQuality = useWebSocketStore(state => state.connectionQuality);
  const reconnectAttempts = useWebSocketStore(state => state.reconnectAttempts);
  const latency = useWebSocketStore(state => state.latency);
  const lastError = useWebSocketStore(state => state.lastError);
  
  return {
    connected,
    connecting,
    connectionQuality,
    reconnectAttempts,
    latency,
    lastError,
  };
};

export const useWebSocketActions = () => {
  const connect = useWebSocketStore(state => state.connect);
  const disconnect = useWebSocketStore(state => state.disconnect);
  const reconnect = useWebSocketStore(state => state.reconnect);
  const subscribe = useWebSocketStore(state => state.subscribe);
  const unsubscribe = useWebSocketStore(state => state.unsubscribe);
  const sendMessage = useWebSocketStore(state => state.sendMessage);
  
  return {
    connect,
    disconnect,
    reconnect,
    subscribe,
    unsubscribe,
    sendMessage,
  };
};