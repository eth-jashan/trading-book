# Trading Simulation Engine - Test Suite

This directory contains comprehensive unit tests for the trading simulation engine, focusing on core functionality and essential trading operations.

## Test Structure

### Test Files

- **`setup.ts`** - Global test configuration, mocks, and utilities
- **`order-execution.test.ts`** - Market and limit order execution tests
- **`position-management.test.ts`** - Position lifecycle and P&L calculation tests  
- **`utils.test.ts`** - Trading utility functions and calculation tests
- **`balance-management.test.ts`** - Balance tracking and margin management tests

### Test Categories

#### 1. Order Execution Tests
- Market order placement and execution
- Limit order creation and triggering  
- Order validation (balance, parameters)
- Order status transitions
- Edge cases and error handling

#### 2. Position Management Tests
- Position creation from filled orders
- Real-time P&L calculations (long/short)
- Position closing and status updates
- Price tracking and history
- Position state synchronization

#### 3. Utility Function Tests
- P&L calculation accuracy
- Liquidation price calculations
- Margin requirement calculations
- Price formatting and validation
- Tick size rounding and precision

#### 4. Balance Management Tests
- Initial balance setup
- Margin deduction/release
- Unrealized vs realized P&L tracking
- Margin level calculations
- Balance consistency validation

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (development)  
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

## Test Configuration

### Jest Configuration
- **Environment**: jsdom (for React components)
- **Setup**: Global mocks for WebSocket, localStorage, fetch
- **Coverage**: Comprehensive coverage reporting
- **Mocks**: Zustand stores, API services, utilities

### Mock Setup
The test suite includes comprehensive mocks for:
- WebSocket connections
- localStorage persistence
- External API calls (Hyperliquid)
- Store state management
- Market data feeds

## Test Utilities

The `setup.ts` file provides helpful utilities:

```typescript
// Create mock market data
testUtils.createMockPriceData('BTC', 50000)

// Create mock order/position data
testUtils.createMockOrder({ symbol: 'BTC', size: 0.001 })
testUtils.createMockPosition({ side: 'long', pnl: 100 })

// Mock API responses
testUtils.mockApiSuccess({ price: 50000 })
testUtils.mockApiError('Network timeout')

// Async testing helpers
await testUtils.waitForNextTick()
```

## Writing New Tests

When adding new tests:

1. **Follow the existing patterns** - Use similar setup/teardown
2. **Test edge cases** - Include error conditions and boundary values  
3. **Mock external dependencies** - Don't rely on real API calls
4. **Validate state consistency** - Ensure all related state updates correctly
5. **Add descriptive test names** - Clearly explain what's being tested

### Example Test Structure

```typescript
describe('Feature Name Tests', () => {
  let mockStore: any;
  
  beforeEach(() => {
    // Setup mocks and initial state
    mockStore = {
      // ... mock implementation
    };
  });

  describe('Specific Functionality', () => {
    test('should handle normal case correctly', () => {
      // Arrange
      const input = { /* test data */ };
      
      // Act  
      const result = mockStore.someMethod(input);
      
      // Assert
      expect(result).toBe(expectedValue);
      expect(mockStore.someProperty).toHaveBeenCalledWith(expectedArg);
    });

    test('should handle edge case gracefully', () => {
      // Test edge cases, error conditions, etc.
    });
  });
});
```

## Coverage Goals

Target coverage levels:
- **Overall**: >85%
- **Critical paths**: 100% (order execution, P&L calculation)
- **Utility functions**: >95%
- **Store actions**: >90%

## Continuous Integration

Tests run automatically on:
- Push to main/develop branches
- Pull request creation
- Multiple Node.js versions (18.x, 20.x)

Coverage reports are generated and uploaded to maintain code quality standards.