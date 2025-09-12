/**
 * Utility Functions Tests
 * Tests for P&L calculations, formatting, and other trading utilities
 */

import {
  calculatePnL,
  calculateLiquidationPrice,
  calculateRequiredMargin,
  formatPrice,
  formatPercentage,
  validateOrderSize,
  roundToTickSize,
} from '@/lib/utils';

describe('Trading Utility Functions', () => {
  describe('P&L Calculation Tests', () => {
    test('should calculate P&L for long position correctly', () => {
      const result = calculatePnL(
        50000, // entry price
        55000, // current price  
        0.001, // size
        'long'
      );

      expect(result.pnl).toBe(5); // (55000 - 50000) * 0.001 = 5
      expect(result.pnlPercentage).toBe(10); // (5000/50000) * 100 = 10%
    });

    test('should calculate P&L for short position correctly', () => {
      const result = calculatePnL(
        50000, // entry price
        45000, // current price (down 5000)
        0.001, // size
        'short'
      );

      expect(result.pnl).toBe(5); // (50000 - 45000) * 0.001 = 5
      expect(result.pnlPercentage).toBe(10); // (5000/50000) * 100 = 10%
    });

    test('should calculate negative P&L for losing long position', () => {
      const result = calculatePnL(
        50000, // entry price
        48000, // current price (down 2000)
        0.01,  // size
        'long'
      );

      expect(result.pnl).toBe(-20); // (48000 - 50000) * 0.01 = -20
      expect(result.pnlPercentage).toBe(-4); // (-2000/50000) * 100 = -4%
    });

    test('should calculate negative P&L for losing short position', () => {
      const result = calculatePnL(
        50000, // entry price
        52000, // current price (up 2000)
        0.01,  // size
        'short'
      );

      expect(result.pnl).toBe(-20); // (50000 - 52000) * 0.01 = -20
      expect(result.pnlPercentage).toBe(-4); // (-2000/50000) * 100 = -4%
    });

    test('should handle zero P&L when price unchanged', () => {
      const result = calculatePnL(
        50000, // entry price
        50000, // same current price
        0.001, // size
        'long'
      );

      expect(result.pnl).toBe(0);
      expect(result.pnlPercentage).toBe(0);
    });

    test('should handle very small position sizes accurately', () => {
      const result = calculatePnL(
        50000,    // entry price
        50001,    // price up by $1
        0.000001, // tiny size
        'long'
      );

      expect(result.pnl).toBe(0.000001); // 1 * 0.000001 = 0.000001
      expect(result.pnlPercentage).toBeCloseTo(0.002); // (1/50000) * 100 = 0.002%
    });
  });

  describe('Liquidation Price Calculation Tests', () => {
    test('should calculate liquidation price for long position', () => {
      const liquidationPrice = calculateLiquidationPrice(
        50000, // entry price
        10,    // 10x leverage
        'long'
      );

      // For long: entryPrice * (1 - (1/leverage) + maintenanceMargin)
      // Assuming 1% maintenance margin: 50000 * (1 - 0.1 + 0.01) = 50000 * 0.91 = 45500
      expect(liquidationPrice).toBeCloseTo(45500, 0);
    });

    test('should calculate liquidation price for short position', () => {
      const liquidationPrice = calculateLiquidationPrice(
        50000, // entry price
        10,    // 10x leverage
        'short'
      );

      // For short: entryPrice * (1 + (1/leverage) - maintenanceMargin)  
      // Assuming 1% maintenance margin: 50000 * (1 + 0.1 - 0.01) = 50000 * 1.09 = 54500
      expect(liquidationPrice).toBeCloseTo(54500, 0);
    });

    test('should handle high leverage correctly', () => {
      const liquidationPrice = calculateLiquidationPrice(
        50000, // entry price
        50,    // 50x leverage (higher risk)
        'long'
      );

      // With 50x leverage: 50000 * (1 - 0.02 + 0.01) = 50000 * 0.99 = 49500
      expect(liquidationPrice).toBeCloseTo(49500, 0);
    });

    test('should handle low leverage correctly', () => {
      const liquidationPrice = calculateLiquidationPrice(
        50000, // entry price
        2,     // 2x leverage (lower risk)
        'long'
      );

      // With 2x leverage: 50000 * (1 - 0.5 + 0.01) = 50000 * 0.51 = 25500
      expect(liquidationPrice).toBeCloseTo(25500, 0);
    });
  });

  describe('Margin Calculation Tests', () => {
    test('should calculate required margin correctly', () => {
      const requiredMargin = calculateRequiredMargin(
        0.001, // size
        50000, // price
        10     // 10x leverage
      );

      // (size * price) / leverage = (0.001 * 50000) / 10 = 5
      expect(requiredMargin).toBe(5);
    });

    test('should calculate margin for 1x leverage (no leverage)', () => {
      const requiredMargin = calculateRequiredMargin(
        0.01,  // size
        50000, // price
        1      // 1x leverage (full margin)
      );

      // (0.01 * 50000) / 1 = 500
      expect(requiredMargin).toBe(500);
    });

    test('should calculate margin for high leverage', () => {
      const requiredMargin = calculateRequiredMargin(
        0.1,   // size
        50000, // price
        50     // 50x leverage
      );

      // (0.1 * 50000) / 50 = 100
      expect(requiredMargin).toBe(100);
    });

    test('should handle fractional results correctly', () => {
      const requiredMargin = calculateRequiredMargin(
        0.003, // size
        33333, // price
        7      // 7x leverage
      );

      // (0.003 * 33333) / 7 ≈ 14.29
      expect(requiredMargin).toBeCloseTo(14.29, 2);
    });
  });

  describe('Price Formatting Tests', () => {
    test('should format BTC price with 2 decimals when > 100', () => {
      const formatted = formatPrice(50000, 'BTC');
      expect(formatted).toMatch(/\$50,000\.00/);
    });

    test('should format ETH price with 4 decimals when < 100', () => {
      const formatted = formatPrice(3000.1234, 'ETH');
      expect(formatted).toMatch(/\$3,000\.1234/);
    });

    test('should format small altcoin price with 6 decimals', () => {
      const formatted = formatPrice(0.000123, 'DOGE');
      expect(formatted).toMatch(/\$0\.000123/);
    });

    test('should handle invalid prices gracefully', () => {
      expect(formatPrice(NaN)).toBe('—');
      expect(formatPrice(Infinity)).toBe('—');
      expect(formatPrice(-Infinity)).toBe('—');
    });
  });

  describe('Percentage Formatting Tests', () => {
    test('should format positive percentage with green color', () => {
      const result = formatPercentage(5.67);
      
      expect(result.value).toMatch(/\+5\.67%/);
      expect(result.color).toBe('success');
    });

    test('should format negative percentage with red color', () => {
      const result = formatPercentage(-3.21);
      
      expect(result.value).toMatch(/-3\.21%/);
      expect(result.color).toBe('danger');
    });

    test('should format zero percentage with neutral color', () => {
      const result = formatPercentage(0);
      
      expect(result.value).toMatch(/0\.00%/);
      expect(result.color).toBe('neutral');
    });

    test('should respect decimal precision option', () => {
      const result = formatPercentage(1.23456, { decimals: 3 });
      
      expect(result.value).toMatch(/\+1\.235%/);
    });
  });

  describe('Order Size Validation Tests', () => {
    test('should validate order size within limits', () => {
      const result = validateOrderSize(
        0.005,  // size
        0.001,  // minSize
        1.0     // maxSize
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject order size below minimum', () => {
      const result = validateOrderSize(
        0.0005, // size (below min)
        0.001,  // minSize
        1.0     // maxSize
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Size must be at least');
    });

    test('should reject order size above maximum', () => {
      const result = validateOrderSize(
        2.0,    // size (above max)
        0.001,  // minSize
        1.0     // maxSize
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Size cannot exceed');
    });

    test('should reject zero or negative order size', () => {
      const zeroResult = validateOrderSize(0, 0.001, 1.0);
      const negativeResult = validateOrderSize(-0.1, 0.001, 1.0);

      expect(zeroResult.isValid).toBe(false);
      expect(zeroResult.error).toBe('Size must be greater than 0');
      
      expect(negativeResult.isValid).toBe(false);
      expect(negativeResult.error).toBe('Size must be greater than 0');
    });
  });

  describe('Tick Size Rounding Tests', () => {
    test('should round to nearest tick size', () => {
      expect(roundToTickSize(50000.123, 0.01)).toBe(50000.12);
      expect(roundToTickSize(50000.126, 0.01)).toBe(50000.13);
    });

    test('should handle large tick sizes', () => {
      expect(roundToTickSize(50123, 100)).toBe(50100);
      expect(roundToTickSize(50187, 100)).toBe(50200);
    });

    test('should handle small tick sizes', () => {
      expect(roundToTickSize(1.23456789, 0.00001)).toBe(1.23457);
      expect(roundToTickSize(1.23451789, 0.00001)).toBe(1.23452);
    });

    test('should handle exact multiples', () => {
      expect(roundToTickSize(50000.00, 0.01)).toBe(50000.00);
      expect(roundToTickSize(50100, 100)).toBe(50100);
    });
  });

  describe('Edge Case Tests', () => {
    test('should handle extreme position sizes', () => {
      const largePnL = calculatePnL(50000, 60000, 100, 'long');
      expect(largePnL.pnl).toBe(1000000); // 10000 * 100
      
      const smallPnL = calculatePnL(50000, 50001, 0.00000001, 'long');
      expect(smallPnL.pnl).toBe(0.00000001); // 1 * 0.00000001
    });

    test('should handle floating point precision issues', () => {
      const result = calculatePnL(
        0.1 + 0.2, // 0.30000000000000004 in JavaScript
        0.4,
        1,
        'long'
      );

      // Should handle floating point arithmetic correctly
      expect(result.pnl).toBeCloseTo(0.1, 10);
    });

    test('should handle very high leverage calculations', () => {
      const liquidationPrice = calculateLiquidationPrice(50000, 1000, 'long');
      
      // With 1000x leverage, liquidation should be very close to entry
      expect(liquidationPrice).toBeCloseTo(49550, 0); // Very close to entry price
    });
  });
});