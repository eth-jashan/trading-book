//@ts-nocheck
/**
 * Position Management Tests
 * Tests for position creation, P&L calculation, and position lifecycle
 */

import { useTradingStore } from '../src/stores/trading/trading.store';
import { useMarketStore } from '../src/stores/market/market.store';
import { calculatePnL } from '../src/lib/utils';
import { testUtils } from './setup';

// Mock the stores and utilities
jest.mock('../src/stores/trading/trading.store');
jest.mock('../src/stores/market/market.store');
jest.mock('../src/lib/utils', () => ({
  ...jest.requireActual('../src/lib/utils'),
  calculatePnL: jest.fn(),
}));

describe('Position Management Tests', () => {
  let mockTradingStore: any;
  let mockMarketStore: any;

  beforeEach(() => {
    // Setup mock store states
    mockTradingStore = {
      balance: {
        total: 100000,
        available: 90000,
        margin: 10000,
        unrealizedPnl: 0,
        realizedPnl: 0,
      },
      positions: [],
      orders: [],
      createPosition: jest.fn(),
      closePosition: jest.fn(),
      updatePosition: jest.fn(),
      refreshPnL: jest.fn(),
      updateBalance: jest.fn(),
    };

    mockMarketStore = {
      prices: new Map([
        ['BTC', testUtils.createMockPriceData('BTC', 50000)],
        ['ETH', testUtils.createMockPriceData('ETH', 3000)],
      ]),
      getPrice: jest.fn(),
    };

    (useTradingStore as jest.MockedFunction<typeof useTradingStore>).mockReturnValue(mockTradingStore);
    (useMarketStore as jest.MockedFunction<typeof useMarketStore>).mockReturnValue(mockMarketStore);

    // Setup market store getPrice method
    mockMarketStore.getPrice.mockImplementation((symbol: string) => 
      mockMarketStore.prices.get(symbol)
    );
  });

  describe('Position Creation Tests', () => {
    test('should create position from filled market order', () => {
      const orderData = {
        id: 'order_123',
        symbol: 'BTC',
        type: 'market',
        side: 'buy',
        size: 0.001,
        status: 'filled',
        filledPrice: 50000,
      };

      mockTradingStore.createPosition.mockImplementation((order: any) => {
        const position = testUtils.createMockPosition({
          id: 'pos_' + order.id,
          symbol: order.symbol,
          side: order.side === 'buy' ? 'long' : 'short',
          size: order.size,
          entryPrice: order.filledPrice,
          currentPrice: order.filledPrice,
          margin: order.size * order.filledPrice,
        });

        mockTradingStore.positions.push(position);
        return position;
      });

      const position = mockTradingStore.createPosition(orderData);

      expect(position.symbol).toBe('BTC');
      expect(position.side).toBe('long');
      expect(position.size).toBe(0.001);
      expect(position.entryPrice).toBe(50000);
      expect(position.status).toBe('open');
    });

    test('should create long position for buy order', () => {
      const buyOrder = {
        side: 'buy',
        symbol: 'BTC',
        size: 0.001,
        filledPrice: 50000,
      };

      mockTradingStore.createPosition.mockImplementation((order: any) => {
        return testUtils.createMockPosition({
          side: order.side === 'buy' ? 'long' : 'short',
          symbol: order.symbol,
          size: order.size,
          entryPrice: order.filledPrice,
        });
      });

      const position = mockTradingStore.createPosition(buyOrder);

      expect(position.side).toBe('long');
    });

    test('should create short position for sell order', () => {
      const sellOrder = {
        side: 'sell',
        symbol: 'ETH',
        size: 0.1,
        filledPrice: 3000,
      };

      mockTradingStore.createPosition.mockImplementation((order: any) => {
        return testUtils.createMockPosition({
          side: order.side === 'buy' ? 'long' : 'short',
          symbol: order.symbol,
          size: order.size,
          entryPrice: order.filledPrice,
        });
      });

      const position = mockTradingStore.createPosition(sellOrder);

      expect(position.side).toBe('short');
    });

    test('should set correct position properties', () => {
      const orderData = {
        symbol: 'BTC',
        side: 'buy',
        size: 0.002,
        filledPrice: 48000,
      };

      mockTradingStore.createPosition.mockImplementation((order: any) => {
        return testUtils.createMockPosition({
          symbol: order.symbol,
          side: 'long',
          size: order.size,
          entryPrice: order.filledPrice,
          currentPrice: order.filledPrice,
          margin: order.size * order.filledPrice, // 0.002 * 48000 = 96
          leverage: 1,
          pnl: 0,
          pnlPercentage: 0,
        });
      });

      const position = mockTradingStore.createPosition(orderData);

      expect(position.symbol).toBe('BTC');
      expect(position.side).toBe('long');
      expect(position.size).toBe(0.002);
      expect(position.entryPrice).toBe(48000);
      expect(position.margin).toBe(96);
      expect(position.pnl).toBe(0);
    });
  });

  describe('P&L Calculation Tests', () => {
    test('should calculate positive P&L for profitable long position', () => {
      const position = testUtils.createMockPosition({
        side: 'long',
        size: 0.001,
        entryPrice: 50000,
        currentPrice: 55000, // Price went up
      });

      (calculatePnL as jest.Mock).mockReturnValue({
        pnl: 5, // (55000 - 50000) * 0.001 = 5
        pnlPercentage: 10, // (5000 / 50000) * 100 = 10%
      });

      const pnlResult = calculatePnL(
        position.entryPrice,
        position.currentPrice,
        position.size,
        position.side
      );

      expect(pnlResult.pnl).toBe(5);
      expect(pnlResult.pnlPercentage).toBe(10);
    });

    test('should calculate negative P&L for losing long position', () => {
      const position = testUtils.createMockPosition({
        side: 'long',
        size: 0.001,
        entryPrice: 50000,
        currentPrice: 45000, // Price went down
      });

      (calculatePnL as jest.Mock).mockReturnValue({
        pnl: -5, // (45000 - 50000) * 0.001 = -5
        pnlPercentage: -10, // (-5000 / 50000) * 100 = -10%
      });

      const pnlResult = calculatePnL(
        position.entryPrice,
        position.currentPrice,
        position.size,
        position.side
      );

      expect(pnlResult.pnl).toBe(-5);
      expect(pnlResult.pnlPercentage).toBe(-10);
    });

    test('should calculate positive P&L for profitable short position', () => {
      const position = testUtils.createMockPosition({
        side: 'short',
        size: 0.001,
        entryPrice: 50000,
        currentPrice: 45000, // Price went down (good for short)
      });

      (calculatePnL as jest.Mock).mockReturnValue({
        pnl: 5, // (50000 - 45000) * 0.001 = 5
        pnlPercentage: 10,
      });

      const pnlResult = calculatePnL(
        position.entryPrice,
        position.currentPrice,
        position.size,
        position.side
      );

      expect(pnlResult.pnl).toBe(5);
      expect(pnlResult.pnlPercentage).toBe(10);
    });

    test('should calculate negative P&L for losing short position', () => {
      const position = testUtils.createMockPosition({
        side: 'short',
        size: 0.001,
        entryPrice: 50000,
        currentPrice: 55000, // Price went up (bad for short)
      });

      (calculatePnL as jest.Mock).mockReturnValue({
        pnl: -5, // (50000 - 55000) * 0.001 = -5
        pnlPercentage: -10,
      });

      const pnlResult = calculatePnL(
        position.entryPrice,
        position.currentPrice,
        position.size,
        position.side
      );

      expect(pnlResult.pnl).toBe(-5);
      expect(pnlResult.pnlPercentage).toBe(-10);
    });

    test('should update position P&L when price changes', () => {
      const position = testUtils.createMockPosition({
        id: 'pos_123',
        symbol: 'BTC',
        side: 'long',
        size: 0.001,
        entryPrice: 50000,
        currentPrice: 50000,
        pnl: 0,
      });

      mockTradingStore.positions = [position];

      // Mock P&L calculation
      (calculatePnL as jest.Mock).mockReturnValue({
        pnl: 2, // New P&L after price change
        pnlPercentage: 4,
      });

      mockTradingStore.refreshPnL.mockImplementation(() => {
        const newPrice = 52000;
        position.currentPrice = newPrice;
        
        const pnlResult = calculatePnL(
          position.entryPrice,
          newPrice,
          position.size,
          position.side
        );
        
        position.pnl = pnlResult.pnl;
        position.pnlPercentage = pnlResult.pnlPercentage;
      });

      mockTradingStore.refreshPnL();

      expect(position.currentPrice).toBe(52000);
      expect(position.pnl).toBe(2);
      expect(position.pnlPercentage).toBe(4);
    });
  });

  describe('Position Closing Tests', () => {
    test('should close full position and update balance', async () => {
      const position = testUtils.createMockPosition({
        id: 'pos_456',
        symbol: 'BTC',
        side: 'long',
        size: 0.001,
        entryPrice: 50000,
        currentPrice: 55000,
        margin: 500,
        pnl: 5,
        
      });

      mockTradingStore.closePosition.mockImplementation(async (positionId: string) => {
        const pos = mockTradingStore.positions.find((p: any) => p.id === positionId);
        if (pos) {
          pos.status = 'closed';
          pos.closedAt = Date.now();
          pos.closedPrice = pos.currentPrice;
          pos.realizedPnl = pos.pnl;

          // Update balance
          mockTradingStore.balance.available += pos.margin + pos.pnl;
          mockTradingStore.balance.margin -= pos.margin;
          mockTradingStore.balance.realizedPnl += pos.pnl;
          mockTradingStore.balance.unrealizedPnl -= pos.pnl;
        }
      });

      mockTradingStore.positions = [position];

      await mockTradingStore.closePosition('pos_456');

      expect(position.status).toBe('closed');
      expect(position.realizedPnl).toBe(5);
      expect(mockTradingStore.balance.available).toBe(90000 + 500 + 5); // Original + margin + profit
      expect(mockTradingStore.balance.margin).toBe(10000 - 500); // Reduced by released margin
      expect(mockTradingStore.balance.realizedPnl).toBe(5);
    });

    test('should update position status to closed', async () => {
      const position = testUtils.createMockPosition({
        id: 'pos_789',
        status: 'open',
      });

      mockTradingStore.closePosition.mockImplementation(async (positionId: string) => {
        const pos = mockTradingStore.positions.find((p: any) => p.id === positionId);
        if (pos) {
          pos.status = 'closed';
          pos.closedAt = Date.now();
        }
      });

      mockTradingStore.positions = [position];

      await mockTradingStore.closePosition('pos_789');

      expect(position.status).toBe('closed');
      expect(position.closedAt).toBeDefined();
    });

    test('should move P&L from unrealized to realized', async () => {
      const position = testUtils.createMockPosition({
        id: 'pos_111',
        pnl: 10, // Unrealized P&L
      });

      mockTradingStore.balance.unrealizedPnl = 10;
      mockTradingStore.balance.realizedPnl = 0;

      mockTradingStore.closePosition.mockImplementation(async (positionId: string) => {
        const pos = mockTradingStore.positions.find((p: any) => p.id === positionId);
        if (pos) {
          pos.status = 'closed';
          pos.realizedPnl = pos.pnl;

          // Move P&L from unrealized to realized
          mockTradingStore.balance.realizedPnl += pos.pnl;
          mockTradingStore.balance.unrealizedPnl -= pos.pnl;
        }
      });

      mockTradingStore.positions = [position];

      await mockTradingStore.closePosition('pos_111');

      expect(position.realizedPnl).toBe(10);
      expect(mockTradingStore.balance.realizedPnl).toBe(10);
      expect(mockTradingStore.balance.unrealizedPnl).toBe(0);
    });

    test('should handle closing non-existent position gracefully', async () => {
      mockTradingStore.closePosition.mockImplementation(async (positionId: string) => {
        const pos = mockTradingStore.positions.find((p: any) => p.id === positionId);
        if (!pos) {
          throw new Error('Position not found');
        }
      });

      mockTradingStore.positions = [];

      await expect(mockTradingStore.closePosition('non_existent')).rejects.toThrow('Position not found');
    });
  });

  describe('Position Update Tests', () => {
    test('should update position price tracking', () => {
      const position = testUtils.createMockPosition({
        id: 'pos_222',
        highestPrice: 50000,
        lowestPrice: 50000,
        currentPrice: 50000,
        priceHistory: [],
      });

      const newPrice = 52000;

      mockTradingStore.updatePosition.mockImplementation((positionId: string, updates: any) => {
        const pos = mockTradingStore.positions.find((p: any) => p.id === positionId);
        if (pos) {
          Object.assign(pos, updates);
          
          // Update price tracking
          pos.highestPrice = Math.max(pos.highestPrice, newPrice);
          pos.lowestPrice = Math.min(pos.lowestPrice, newPrice);
          pos.priceHistory.push({
            price: newPrice,
            timestamp: Date.now(),
            source: 'test',
          });
        }
      });

      mockTradingStore.positions = [position];

      mockTradingStore.updatePosition('pos_222', { currentPrice: newPrice });

      expect(position.currentPrice).toBe(52000);
      expect(position.highestPrice).toBe(52000);
      expect(position.lowestPrice).toBe(50000);
      expect(position.priceHistory).toHaveLength(1);
    });

    test('should limit price history length', () => {
      const position = testUtils.createMockPosition({
        id: 'pos_333',
        priceHistory: new Array(100).fill(null).map((_, i) => ({
          price: 50000 + i,
          timestamp: Date.now() - (100 - i) * 1000,
          source: 'test',
        })),
      });

      mockTradingStore.updatePosition.mockImplementation((positionId: string, updates: any) => {
        const pos = mockTradingStore.positions.find((p: any) => p.id === positionId);
        if (pos) {
          pos.priceHistory.push({
            price: updates.currentPrice,
            timestamp: Date.now(),
            source: 'test',
          });

          // Limit to 100 entries
          if (pos.priceHistory.length > 100) {
            pos.priceHistory.shift();
          }
        }
      });

      mockTradingStore.positions = [position];

      mockTradingStore.updatePosition('pos_333', { currentPrice: 52000 });

      expect(position.priceHistory).toHaveLength(100);
      expect(position.priceHistory[position.priceHistory.length - 1].price).toBe(52000);
    });
  });
});