/**
 * Test Setup Configuration
 * Sets up global mocks and utilities for trading simulation tests
 */
//@ts-nocheck
// Mock WebSocket globally
global.WebSocket = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: WebSocket.OPEN,
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock performance for memory monitoring
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
    },
  },
  writable: true,
});

// Mock AbortSignal for API timeout handling
global.AbortSignal = {
  timeout: jest.fn(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    aborted: false,
  })),
} as any;

// Suppress console warnings during tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset fetch mock
  (fetch as jest.Mock).mockClear();
  
  // Reset localStorage mock
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  // Suppress console output during tests
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Restore console
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Test utilities
export const testUtils = {
  // Create mock market price data
  createMockPriceData: (symbol: string, price: number) => ({
    symbol,
    price,
    change24h: (Math.random() - 0.5) * price * 0.1, // Random 24h change up to 10%
    changePercent24h: (Math.random() - 0.5) * 10,
    volume24h: Math.random() * 1000000,
    high24h: price * (1 + Math.random() * 0.05),
    low24h: price * (1 - Math.random() * 0.05),
    timestamp: Date.now(),
  }),

  // Create mock order data
  createMockOrder: (overrides = {}) => ({
    symbol: 'BTC',
    type: 'market' as const,
    side: 'buy' as const,
    size: 0.001,
    ...overrides,
  }),

  // Create mock position data
  createMockPosition: (overrides = {}) => ({
    id: 'pos_' + Date.now(),
    symbol: 'BTC',
    side: 'long' as const,
    size: 0.001,
    entryPrice: 50000,
    currentPrice: 50000,
    margin: 500,
    leverage: 10,
    pnl: 0,
    pnlPercentage: 0,
    timestamp: Date.now(),
    status: 'open' as const,
    liquidationPrice: 45000,
    highestPrice: 50000,
    lowestPrice: 50000,
    priceHistory: [],
    realizedPnl: 0,
    unrealizedPnl: 0,
    closedAt: null,
    ...overrides,
  }),

  // Wait for next tick (useful for async operations)
  waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),

  // Mock successful API response
  mockApiSuccess: (data: any) => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(data),
    });
  },

  // Mock API error
  mockApiError: (error: string) => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error(error));
  },

  // Mock WebSocket price update
  mockWebSocketUpdate: (symbol: string, price: number) => {
    // This would be used with actual WebSocket mock implementation
    return {
      channel: 'allMids',
      data: { [symbol]: price.toString() },
      timestamp: Date.now(),
    };
  },
};

export default testUtils;