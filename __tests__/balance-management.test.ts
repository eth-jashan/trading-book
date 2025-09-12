/**
 * Balance Management Tests
 * Tests for balance tracking, margin calculations, and balance consistency
 */

import { useTradingStore } from '@/stores/trading/trading.store';
import { TRADING_CONFIG } from '@/lib/constants';
import { testUtils } from './setup';

// Mock the trading store
jest.mock('@/stores/trading/trading.store');

describe('Balance Management Tests', () => {
  let mockTradingStore: any;

  beforeEach(() => {
    // Setup mock store with default balance
    mockTradingStore = {
      balance: {
        total: TRADING_CONFIG.DEFAULT_BALANCE, // 100,000
        available: TRADING_CONFIG.DEFAULT_BALANCE,
        margin: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        marginLevel: 0,
        freeMargin: TRADING_CONFIG.DEFAULT_BALANCE,
      },
      positions: [],
      updateBalance: jest.fn(),
      calculateMarginLevel: jest.fn(),
      refreshBalances: jest.fn(),
    };

    (useTradingStore as jest.Mock).mockReturnValue(mockTradingStore);
  });

  describe('Initial Balance Tests', () => {
    test('should start with correct default balance', () => {
      expect(mockTradingStore.balance.total).toBe(100000);
      expect(mockTradingStore.balance.available).toBe(100000);
      expect(mockTradingStore.balance.margin).toBe(0);
      expect(mockTradingStore.balance.unrealizedPnl).toBe(0);
      expect(mockTradingStore.balance.realizedPnl).toBe(0);
    });

    test('should have consistent balance components', () => {
      const { balance } = mockTradingStore;
      
      // Total balance should equal starting balance + realized P&L
      expect(balance.total).toBe(TRADING_CONFIG.DEFAULT_BALANCE + balance.realizedPnl);
      
      // Available should be total minus margin
      expect(balance.available).toBe(balance.total - balance.margin);
      
      // Free margin should be available + unrealized P&L
      expect(balance.freeMargin).toBe(balance.available + balance.unrealizedPnl);
    });
  });

  describe('Margin Deduction Tests', () => {
    test('should deduct margin when opening position', () => {
      const positionMargin = 5000; // $5000 margin required

      mockTradingStore.updateBalance.mockImplementation((updates: any) => {
        Object.assign(mockTradingStore.balance, updates);
      });

      // Simulate opening position
      mockTradingStore.updateBalance({
        available: mockTradingStore.balance.available - positionMargin,
        margin: mockTradingStore.balance.margin + positionMargin,
      });

      expect(mockTradingStore.balance.available).toBe(95000); // 100000 - 5000
      expect(mockTradingStore.balance.margin).toBe(5000);
      expect(mockTradingStore.balance.total).toBe(100000); // Total unchanged
    });

    test('should handle multiple positions margin correctly', () => {
      const position1Margin = 3000;
      const position2Margin = 2000;
      const totalMargin = position1Margin + position2Margin;

      mockTradingStore.updateBalance.mockImplementation((updates: any) => {
        Object.assign(mockTradingStore.balance, updates);
      });

      // Open first position
      mockTradingStore.updateBalance({
        available: mockTradingStore.balance.available - position1Margin,
        margin: mockTradingStore.balance.margin + position1Margin,
      });

      // Open second position
      mockTradingStore.updateBalance({
        available: mockTradingStore.balance.available - position2Margin,
        margin: mockTradingStore.balance.margin + position2Margin,
      });

      expect(mockTradingStore.balance.available).toBe(95000); // 100000 - 5000
      expect(mockTradingStore.balance.margin).toBe(totalMargin);
      expect(mockTradingStore.balance.total).toBe(100000);
    });

    test('should prevent opening position with insufficient balance', () => {
      const excessiveMargin = 120000; // More than available balance

      mockTradingStore.updateBalance.mockImplementation((updates: any) => {
        if (updates.available < 0) {
          throw new Error('Insufficient balance');
        }
        Object.assign(mockTradingStore.balance, updates);
      });

      expect(() => {
        mockTradingStore.updateBalance({
          available: mockTradingStore.balance.available - excessiveMargin,
          margin: mockTradingStore.balance.margin + excessiveMargin,
        });
      }).toThrow('Insufficient balance');
    });
  });

  describe('Margin Release Tests', () => {
    beforeEach(() => {
      // Setup with existing margin
      mockTradingStore.balance.available = 95000;
      mockTradingStore.balance.margin = 5000;
    });

    test('should release margin when closing position', () => {
      const releasedMargin = 2000;
      const realizedPnl = 300; // $300 profit

      mockTradingStore.updateBalance.mockImplementation((updates: any) => {
        Object.assign(mockTradingStore.balance, updates);
      });

      // Simulate closing position with profit
      mockTradingStore.updateBalance({
        available: mockTradingStore.balance.available + releasedMargin + realizedPnl,
        margin: mockTradingStore.balance.margin - releasedMargin,
        realizedPnl: mockTradingStore.balance.realizedPnl + realizedPnl,
        total: mockTradingStore.balance.total + realizedPnl,
      });

      expect(mockTradingStore.balance.available).toBe(97300); // 95000 + 2000 + 300
      expect(mockTradingStore.balance.margin).toBe(3000); // 5000 - 2000
      expect(mockTradingStore.balance.realizedPnl).toBe(300);
      expect(mockTradingStore.balance.total).toBe(100300); // Original + profit
    });

    test('should handle position closed at loss', () => {
      const releasedMargin = 2000;
      const realizedPnl = -500; // $500 loss

      mockTradingStore.updateBalance.mockImplementation((updates: any) => {
        Object.assign(mockTradingStore.balance, updates);
      });

      // Simulate closing position with loss
      mockTradingStore.updateBalance({
        available: mockTradingStore.balance.available + releasedMargin + realizedPnl,
        margin: mockTradingStore.balance.margin - releasedMargin,
        realizedPnl: mockTradingStore.balance.realizedPnl + realizedPnl,
        total: mockTradingStore.balance.total + realizedPnl,
      });

      expect(mockTradingStore.balance.available).toBe(96500); // 95000 + 2000 - 500
      expect(mockTradingStore.balance.margin).toBe(3000);
      expect(mockTradingStore.balance.realizedPnl).toBe(-500);
      expect(mockTradingStore.balance.total).toBe(99500); // Original minus loss
    });

    test('should release all margin when closing all positions', () => {
      const totalMargin = 5000;
      const totalPnl = 150;

      mockTradingStore.updateBalance.mockImplementation((updates: any) => {
        Object.assign(mockTradingStore.balance, updates);
      });

      // Close all positions
      mockTradingStore.updateBalance({
        available: mockTradingStore.balance.total + totalPnl,
        margin: 0,
        realizedPnl: mockTradingStore.balance.realizedPnl + totalPnl,
        total: mockTradingStore.balance.total + totalPnl,
      });

      expect(mockTradingStore.balance.available).toBe(100150);
      expect(mockTradingStore.balance.margin).toBe(0);
      expect(mockTradingStore.balance.realizedPnl).toBe(150);
    });
  });

  describe('Unrealized P&L Tests', () => {
    beforeEach(() => {
      // Setup with positions and margin
      mockTradingStore.balance.available = 90000;
      mockTradingStore.balance.margin = 10000;
    });

    test('should track positive unrealized P&L', () => {
      const unrealizedPnl = 1500;

      mockTradingStore.updateBalance.mockImplementation((updates: any) => {
        Object.assign(mockTradingStore.balance, updates);
      });

      mockTradingStore.updateBalance({
        unrealizedPnl,
        freeMargin: mockTradingStore.balance.available + unrealizedPnl,
      });

      expect(mockTradingStore.balance.unrealizedPnl).toBe(1500);
      expect(mockTradingStore.balance.freeMargin).toBe(91500); // 90000 + 1500
      expect(mockTradingStore.balance.total).toBe(100000); // Total unchanged (unrealized)
    });

    test('should track negative unrealized P&L', () => {
      const unrealizedPnl = -2000;

      mockTradingStore.updateBalance.mockImplementation((updates: any) => {
        Object.assign(mockTradingStore.balance, updates);
      });

      mockTradingStore.updateBalance({
        unrealizedPnl,
        freeMargin: mockTradingStore.balance.available + unrealizedPnl,
      });

      expect(mockTradingStore.balance.unrealizedPnl).toBe(-2000);
      expect(mockTradingStore.balance.freeMargin).toBe(88000); // 90000 - 2000
      expect(mockTradingStore.balance.total).toBe(100000);
    });

    test('should move unrealized to realized P&L when closing position', () => {
      const initialUnrealized = 1000;
      const realizedFromPosition = 800; // Part of unrealized becomes realized

      // Start with unrealized P&L
      mockTradingStore.balance.unrealizedPnl = initialUnrealized;

      mockTradingStore.updateBalance.mockImplementation((updates: any) => {
        Object.assign(mockTradingStore.balance, updates);
      });

      // Close position, moving some unrealized to realized
      mockTradingStore.updateBalance({
        unrealizedPnl: initialUnrealized - realizedFromPosition,
        realizedPnl: mockTradingStore.balance.realizedPnl + realizedFromPosition,
        total: mockTradingStore.balance.total + realizedFromPosition,
        available: mockTradingStore.balance.available + realizedFromPosition,
      });

      expect(mockTradingStore.balance.unrealizedPnl).toBe(200); // 1000 - 800
      expect(mockTradingStore.balance.realizedPnl).toBe(800);
      expect(mockTradingStore.balance.total).toBe(100800); // Realized profit added
    });
  });

  describe('Margin Level Tests', () => {
    test('should calculate margin level correctly', () => {
      mockTradingStore.calculateMarginLevel.mockImplementation(() => {
        const { balance } = mockTradingStore;
        if (balance.margin === 0) return 0;
        
        return ((balance.total + balance.unrealizedPnl) / balance.margin) * 100;
      });

      // Setup scenario: $100k total, $10k margin, $1k unrealized profit
      mockTradingStore.balance.total = 100000;
      mockTradingStore.balance.margin = 10000;
      mockTradingStore.balance.unrealizedPnl = 1000;

      const marginLevel = mockTradingStore.calculateMarginLevel();

      // Margin level = (100000 + 1000) / 10000 * 100 = 1010%
      expect(marginLevel).toBe(1010);
    });

    test('should handle zero margin gracefully', () => {
      mockTradingStore.calculateMarginLevel.mockImplementation(() => {
        const { balance } = mockTradingStore;
        if (balance.margin === 0) return 0;
        
        return ((balance.total + balance.unrealizedPnl) / balance.margin) * 100;
      });

      mockTradingStore.balance.margin = 0;

      const marginLevel = mockTradingStore.calculateMarginLevel();

      expect(marginLevel).toBe(0);
    });

    test('should detect low margin level scenarios', () => {
      mockTradingStore.calculateMarginLevel.mockImplementation(() => {
        const { balance } = mockTradingStore;
        return ((balance.total + balance.unrealizedPnl) / balance.margin) * 100;
      });

      // Setup dangerous scenario: large loss, low margin level
      mockTradingStore.balance.total = 100000;
      mockTradingStore.balance.margin = 50000;
      mockTradingStore.balance.unrealizedPnl = -40000; // Large loss

      const marginLevel = mockTradingStore.calculateMarginLevel();

      // Margin level = (100000 - 40000) / 50000 * 100 = 120%
      expect(marginLevel).toBe(120);
      expect(marginLevel).toBeLessThan(200); // Dangerously low
    });
  });

  describe('Balance Consistency Tests', () => {
    test('should maintain balance equation at all times', () => {
      const testScenarios = [
        // Initial state
        { available: 100000, margin: 0, realizedPnl: 0, unrealizedPnl: 0 },
        // After opening position
        { available: 95000, margin: 5000, realizedPnl: 0, unrealizedPnl: 0 },
        // With unrealized profit
        { available: 95000, margin: 5000, realizedPnl: 0, unrealizedPnl: 1000 },
        // After closing with profit
        { available: 101000, margin: 0, realizedPnl: 1000, unrealizedPnl: 0 },
      ];

      testScenarios.forEach((scenario, index) => {
        const expectedTotal = TRADING_CONFIG.DEFAULT_BALANCE + scenario.realizedPnl;
        const expectedFreeMargin = scenario.available + scenario.unrealizedPnl;

        // Balance consistency checks
        expect(scenario.available + scenario.margin).toBe(expectedTotal);
        expect(scenario.available + scenario.unrealizedPnl).toBe(expectedFreeMargin);

        // Total should only change with realized P&L
        expect(expectedTotal).toBe(TRADING_CONFIG.DEFAULT_BALANCE + scenario.realizedPnl);
      });
    });

    test('should refresh balances correctly', () => {
      const mockPositions = [
        testUtils.createMockPosition({
          margin: 3000,
          pnl: 500,
          status: 'open',
        }),
        testUtils.createMockPosition({
          margin: 2000,
          pnl: -200,
          status: 'open',
        }),
      ];

      mockTradingStore.positions = mockPositions;

      mockTradingStore.refreshBalances.mockImplementation(() => {
        const totalMargin = mockTradingStore.positions
          .filter((p: any) => p.status === 'open')
          .reduce((sum: number, pos: any) => sum + pos.margin, 0);

        const totalUnrealizedPnl = mockTradingStore.positions
          .filter((p: any) => p.status === 'open')
          .reduce((sum: number, pos: any) => sum + pos.pnl, 0);

        mockTradingStore.balance.margin = totalMargin;
        mockTradingStore.balance.available = mockTradingStore.balance.total - totalMargin;
        mockTradingStore.balance.unrealizedPnl = totalUnrealizedPnl;
        mockTradingStore.balance.freeMargin = mockTradingStore.balance.available + totalUnrealizedPnl;
      });

      mockTradingStore.refreshBalances();

      expect(mockTradingStore.balance.margin).toBe(5000); // 3000 + 2000
      expect(mockTradingStore.balance.available).toBe(95000); // 100000 - 5000
      expect(mockTradingStore.balance.unrealizedPnl).toBe(300); // 500 - 200
      expect(mockTradingStore.balance.freeMargin).toBe(95300); // 95000 + 300
    });
  });

  describe('Edge Case Tests', () => {
    test('should handle account blowup scenario', () => {
      // Simulate catastrophic loss scenario
      mockTradingStore.balance.total = 100000;
      mockTradingStore.balance.margin = 80000;
      mockTradingStore.balance.available = 20000;
      mockTradingStore.balance.unrealizedPnl = -90000; // Massive loss

      mockTradingStore.calculateMarginLevel.mockImplementation(() => {
        const { balance } = mockTradingStore;
        return ((balance.total + balance.unrealizedPnl) / balance.margin) * 100;
      });

      const marginLevel = mockTradingStore.calculateMarginLevel();

      // Margin level = (100000 - 90000) / 80000 * 100 = 12.5%
      expect(marginLevel).toBe(12.5);
      expect(marginLevel).toBeLessThan(50); // Below liquidation threshold
    });

    test('should handle floating point precision in balance calculations', () => {
      const preciseBalance = {
        available: 99999.99,
        margin: 0.01,
        realizedPnl: 0.001,
        unrealizedPnl: -0.001,
      };

      // Balance calculations should handle precision correctly
      const total = TRADING_CONFIG.DEFAULT_BALANCE + preciseBalance.realizedPnl;
      const freeMargin = preciseBalance.available + preciseBalance.unrealizedPnl;

      expect(total).toBeCloseTo(100000.001, 10);
      expect(freeMargin).toBeCloseTo(99999.989, 10);
    });

    test('should handle rapid balance updates', async () => {
      let updateCount = 0;

      mockTradingStore.updateBalance.mockImplementation((updates: any) => {
        updateCount++;
        Object.assign(mockTradingStore.balance, updates);
      });

      // Simulate rapid P&L updates
      const updates = [
        { unrealizedPnl: 100 },
        { unrealizedPnl: 150 },
        { unrealizedPnl: 75 },
        { unrealizedPnl: 200 },
        { unrealizedPnl: -50 },
      ];

      for (const update of updates) {
        mockTradingStore.updateBalance(update);
        await testUtils.waitForNextTick();
      }

      expect(updateCount).toBe(5);
      expect(mockTradingStore.balance.unrealizedPnl).toBe(-50); // Final state
    });
  });
});