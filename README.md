# 🚀 Trading Book - Advanced Paper Trading Platform

A sophisticated, full-featured paper trading platform built with Next.js, featuring real-time market data, advanced charting, comprehensive portfolio management, and intelligent risk management systems.

## 🎥 Demo Videos

### Desktop View
<video width="800" controls>
  <source src="https://d1v2n7tvgmp6ao.cloudfront.net/user/public/seshlabs.tech_1ba3100b-d44b-4269-971e-25b0a2e415ae/video/desktop-2025-09-12T151707.681472.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

### Responsive Mobile View  
<video width="800" controls>
  <source src="https://d1v2n7tvgmp6ao.cloudfront.net/user/public/seshlabs.tech_1ba3100b-d44b-4269-971e-25b0a2e415ae/video/responsive-2025-09-12T151236.511876.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## 🌟 Key Features

### 📈 **Real-Time Market Data & Charts**
- **Live Price Feeds**: Real-time price updates via WebSocket connections to Hyperliquid API
- **Advanced Charting**: TradingView's Lightweight Charts with candlestick patterns, volume indicators
- **Multiple Timeframes**: 1m, 5m, 15m, 1h, 4h, 1d chart intervals
- **Technical Indicators**: Price change visualization, high/low tracking, volume analysis
- **Cross-Platform Sync**: Seamless data synchronization across devices

### 🎯 **Sophisticated Trading Engine**
- **Order Types**: Market, Limit, with real-time execution
- **Order Management**: View and cancel pending limit orders until execution
- **Position Management**: Long/Short positions with dynamic P&L tracking
- **Settlement System**: Withdraw balance and settle P&L with complete transaction history
- **Transaction History**: Complete audit trail of all trading activities

### 💼 **Portfolio & Analytics**
- **Performance Tracking**: Real-time P&L, ROI, win rate, profit factor calculations
- **Advanced Analytics**: Sharpe ratio, maximum drawdown, risk-adjusted returns
- **Position Heatmaps**: Visual representation of portfolio performance
- **Comprehensive Dashboards**: Multiple view modes for different analysis needs
- **Historical Performance**: Long-term performance tracking and reporting

### 🛡️ **Risk Management System**
- **Dynamic Risk Assessment**: Real-time risk evaluation and warnings
- **Position Sizing**: Intelligent position sizing based on risk tolerance
- **Margin Management**: Automatic margin calculations and monitoring
- **Liquidation Protection**: Early warning system for liquidation risks
- **Risk Limits**: Customizable risk parameters and safety controls

### 📱 **Responsive Design**
- **Mobile-First**: Optimized for mobile and tablet devices
- **Floating Trading Panel**: Mobile-friendly trading interface with modal
- **Adaptive Charts**: Responsive chart scaling for different screen sizes
- **Touch-Optimized**: Smooth touch interactions and gestures
- **Progressive Web App**: Works offline with cached data

## 🏗️ Architecture & Tech Stack

### **Frontend Technologies**
```typescript
{
  "framework": "Next.js 15.5.2",
  "language": "TypeScript 5.x",
  "styling": "Tailwind CSS 4.x",
  "ui-library": "Radix UI Components",
  "animations": "Framer Motion 12.x",
  "charts": "Lightweight Charts 5.x",
  "icons": "Lucide React",
  "build-tool": "Turbopack"
}
```

### **State Management & Data Flow**
- **Zustand**: Lightweight, type-safe state management
- **Immer**: Immutable state updates for performance
- **Persist Middleware**: Automatic state persistence to localStorage
- **Real-time Updates**: WebSocket integration for live data streams
- **Optimized Rendering**: Batched updates and performance optimizations

### **API Integration**
```typescript
// Hyperliquid API Integration
const apis = {
  "market-data": "Real-time price feeds and market information",
  "chart-data": "OHLCV data for multiple timeframes",
  "websocket": "Live price updates and market events",
  "asset-metadata": "Trading pairs and market information"
}
```

## 📊 Trading Simulation Engine

The core trading engine provides a realistic simulation environment that mirrors real trading conditions:

### **Order Execution System**
```typescript
interface OrderExecution {
  marketOrders: "Instant execution at current market price";
  limitOrders: "Execution when price conditions are met";
  stopOrders: "Triggered execution based on stop conditions";
  stopLimitOrders: "Combined stop and limit order logic";
  slippage: "Realistic price slippage simulation";
}
```

### **Position Management**
```typescript
interface PositionTracking {
  realTimeUpdates: "Live P&L calculation with price updates";
  marginTracking: "Dynamic margin requirements and usage";
  leverageSystem: "Configurable leverage with risk calculations";
  autoClosing: "Stop-loss and take-profit automation";
  priceHistory: "Historical price tracking for analysis";
}
```

### **Risk Management Engine**
```typescript
interface RiskSystem {
  dynamicAssessment: "Real-time risk evaluation";
  positionSizing: "Intelligent position size calculations";
  marginCalls: "Early warning system for margin issues";
  liquidationRisk: "Liquidation price and risk monitoring";
  portfolioRisk: "Overall portfolio risk assessment";
}
```

## 🗂️ Project Structure

```
trading-book/
├── 📁 src/
│   ├── 📁 app/                    # Next.js App Router
│   │   ├── layout.tsx             # Root layout with providers
│   │   ├── page.tsx               # Main trading interface
│   │   └── 📁 api/                # API routes
│   │       └── hyperliquid/       # Market data endpoints
│   ├── 📁 components/             # React Components
│   │   ├── 📁 analytics/          # Analytics & Performance
│   │   │   ├── PositionHeatMap.tsx
│   │   │   └── PositionPerformanceDashboard.tsx
│   │   ├── 📁 chart/              # Trading Charts
│   │   │   └── TradingChart.tsx   # Main chart component
│   │   ├── 📁 layout/             # Layout Components
│   │   │   ├── MainContent.tsx    # Main application layout
│   │   │   ├── TradingLayout.tsx  # Trading-specific layout
│   │   │   └── BottomPanel.tsx    # Multi-tab analytics panel
│   │   ├── 📁 trading/            # Trading Components
│   │   │   ├── TradingPanel.tsx   # Order entry interface
│   │   │   ├── PositionsList.tsx  # Open/closed positions
│   │   │   ├── OrdersList.tsx     # Pending/filled orders display
│   │   │   ├── SettlementPanel.tsx # Balance withdrawal & settlement
│   │   │   ├── AssetSelector*.tsx # Asset selection components
│   │   │   └── Order*.tsx         # Order-related components
│   │   └── 📁 ui/                 # UI Components (Radix UI)
│   ├── 📁 stores/                 # State Management
│   │   ├── 📁 trading/            # Trading State
│   │   │   └── trading.store.ts   # Core trading logic
│   │   ├── 📁 market/             # Market Data
│   │   │   └── market.store.ts    # Price feeds & market info
│   │   ├── 📁 assets/             # Asset Management
│   │   │   └── assets.store.ts    # Asset search & favorites
│   │   ├── 📁 portfolio/          # Portfolio Analytics
│   │   │   └── portfolio.store.ts # Performance metrics
│   │   └── 📁 websocket/          # WebSocket Management
│   │       └── websocket.store.ts # Real-time connections
│   ├── 📁 services/               # External Services
│   │   ├── 📁 api/                # API Integration
│   │   │   └── hyperliquid-api.ts # Hyperliquid API client
│   │   └── 📁 websocket/          # WebSocket Services
│   │       └── websocket-manager.ts
│   ├── 📁 lib/                    # Utilities & Helpers
│   │   ├── 📁 types/              # TypeScript Definitions
│   │   ├── 📁 utils/              # Utility Functions
│   │   ├── 📁 risk/               # Risk Management
│   │   │   └── risk-manager.ts    # Advanced risk calculations
│   │   ├── 📁 constants/          # Application Constants
│   │   └── 📁 performance/        # Performance Optimizations
│   ├── 📁 hooks/                  # Custom React Hooks
│   └── 📁 types/                  # Global Type Definitions
├── 📄 package.json               # Dependencies & Scripts
├── 📄 tsconfig.json              # TypeScript Configuration
├── 📄 tailwind.config.js         # Tailwind CSS Configuration
└── 📄 next.config.ts             # Next.js Configuration
```

## 🚀 Getting Started

### **Prerequisites**
```bash
Node.js 18+ 
npm or yarn package manager
Modern web browser with WebSocket support
```

### **Installation**
```bash
# Clone the repository
git clone https://github.com/yourusername/trading-book.git
cd trading-book

# Install dependencies
npm install

# Start development server
npm run dev

# Open your browser
open http://localhost:3000
```

### **Available Scripts**
```bash
npm run dev        # Start development server with Turbopack
npm run build      # Build for production with Turbopack
npm start          # Start production server
npm run lint       # Run Biome linter
npm run lint:fix   # Fix linting issues automatically
npm run format     # Format code with Biome
```

## 💡 Key Features Deep Dive

### **1. Advanced Asset Selector**
- **Modern Interface**: Glass-morphism design with gradient backgrounds
- **Smart Search**: Real-time filtering with fuzzy search capabilities
- **Favorites System**: Star/unstar assets for quick access
- **Market Categorization**: Spot vs Perpetual market filtering
- **Live Price Display**: Real-time price updates with change indicators
- **Volume Information**: 24h volume and market activity data

### **2. Comprehensive Trading Panel**
- **Order Types**: Full suite of order types with validation
- **Order Management**: Real-time view of pending orders with cancel functionality
- **Position Sizing**: Intelligent size calculations with risk management
- **Real-time Validation**: Live order validation with helpful error messages
- **Quick Actions**: One-click position closing and modification
- **Mobile Optimization**: Responsive design with floating modal interface

### **3. Settlement & Withdrawal System**
- **Balance Overview**: Real-time display of total P&L and performance metrics
- **Withdrawal Interface**: Easy withdrawal of available balance with validation
- **Settlement History**: Complete transaction history including withdrawals
- **P&L Breakdown**: Clear separation of realized vs unrealized profits/losses
- **Return Calculation**: Percentage return based on initial trading balance

### **4. Multi-Tab Analytics Dashboard**
- **Orders Tab**: View pending limit orders and recent filled orders
- **Performance Overview**: Portfolio summary with key metrics  
- **Transaction History**: Complete trading history with search and filters
- **Position Analytics**: Detailed position performance analysis
- **Activity Heatmaps**: Visual representation of trading activity
- **Risk Analysis**: Comprehensive risk metrics and warnings

### **5. Real-time Chart Integration**
- **TradingView Integration**: Professional-grade charting experience
- **Live Updates**: Real-time price updates with WebSocket feeds
- **Multiple Timeframes**: Comprehensive timeframe selection
- **Technical Indicators**: Price overlays and volume analysis
- **Cross-Platform Sync**: Consistent experience across devices

## 🔧 Configuration & Customization

### **Trading Configuration**
```typescript
// src/lib/constants.ts
export const TRADING_CONFIG = {
  DEFAULT_BALANCE: 100000,    // Starting paper trading balance
  MAX_LEVERAGE: 50,           // Maximum allowed leverage
  DEFAULT_LEVERAGE: 10,       // Default leverage setting
  MIN_ORDER_SIZE: 0.001,      // Minimum order size
  MAX_POSITION_COUNT: 20,     // Maximum open positions
  RISK_WARNING_THRESHOLD: 0.8 // Risk warning trigger
};
```

### **Risk Management Settings**
```typescript
// Customizable risk parameters
export const RISK_LIMITS = {
  maxPositionSize: 0.1,       // 10% of portfolio per position
  maxTotalExposure: 0.5,      // 50% maximum total exposure
  maxDailyLoss: 0.05,         // 5% maximum daily loss
  marginCallThreshold: 0.8,    // 80% margin call threshold
  liquidationThreshold: 0.5    // 50% liquidation threshold
};
```

## 📚 API Documentation

### **Market Data Endpoints**
```typescript
// Real-time price data
GET /api/hyperliquid/prices
Response: { symbol: string, price: number, change24h: number }[]

// Chart data
GET /api/hyperliquid/candles?symbol={symbol}&interval={interval}
Response: { time: number, open: number, high: number, low: number, close: number, volume: number }[]

// Asset information
GET /api/hyperliquid/assets
Response: { symbol: string, name: string, type: 'spot'|'perpetual' }[]
```

### **WebSocket Connections**
```typescript
// Subscribe to real-time price updates
websocket.subscribe('prices', { symbols: ['BTC', 'ETH'] })

// Subscribe to chart data updates
websocket.subscribe('candles', { symbol: 'BTC', interval: '1m' })
```

## 🧪 Testing Strategy

### **Unit Testing**
```bash
# Component testing with Jest and React Testing Library
npm test

# Test coverage reports
npm run test:coverage
```

### **Integration Testing**
```bash
# API integration tests
npm run test:integration

# WebSocket connection tests
npm run test:websocket
```

### **Performance Testing**
```bash
# Bundle analysis
npm run analyze

# Lighthouse performance audit
npm run audit:performance
```

## 🔒 Security & Privacy

### **Data Protection**
- **Local Storage Only**: No sensitive data sent to external servers
- **Encrypted Storage**: Critical data encrypted in localStorage
- **API Key Protection**: Secure API key management and rotation
- **HTTPS Only**: All external API calls use HTTPS encryption

### **Privacy Features**
- **No User Tracking**: No analytics or user behavior tracking
- **Local Processing**: All calculations performed client-side
- **Data Portability**: Easy export/import of trading data
- **Minimal Data Collection**: Only essential market data is collected

## 🚦 Performance Optimizations

### **Frontend Performance**
- **Code Splitting**: Automatic route-based code splitting
- **Bundle Optimization**: Tree shaking and dead code elimination
- **Image Optimization**: Next.js automatic image optimization
- **Caching Strategy**: Intelligent API response caching
- **Lazy Loading**: Component lazy loading for better performance

### **Real-time Updates**
- **Efficient WebSockets**: Connection pooling and automatic reconnection
- **Batched Updates**: Grouped state updates to reduce renders
- **Virtual Scrolling**: Efficient rendering of large data sets
- **Memory Management**: Automatic cleanup of unused data
- **Throttled Updates**: Controlled update frequency for smooth performance

## 🤝 Contributing

### **Development Setup**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Start development server: `npm run dev`
5. Make your changes and test thoroughly
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### **Code Standards**
- **TypeScript**: Strict type checking enabled
- **ESLint/Biome**: Consistent code formatting and linting
- **Git Hooks**: Pre-commit hooks for code quality
- **Testing**: Comprehensive test coverage required
- **Documentation**: Update docs for new features

## 📈 Roadmap

### **Phase 1: Core Features** ✅
- [x] Real-time market data integration
- [x] Advanced trading simulation engine
- [x] Order management system (pending/filled orders display)
- [x] Settlement and withdrawal functionality
- [x] Comprehensive risk management
- [x] Responsive design implementation
- [x] Performance analytics dashboard

### **Phase 2: Advanced Features** 🚧
- [ ] Advanced technical indicators
- [ ] Algorithmic trading strategies
- [ ] Social trading features
- [ ] Advanced charting tools
- [ ] Portfolio optimization algorithms

### **Phase 3: Platform Expansion** 🔮
- [ ] Multi-exchange support
- [ ] Cryptocurrency integration
- [ ] Mobile app development
- [ ] API for third-party integration
- [ ] Advanced backtesting engine

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **TradingView**: For the excellent Lightweight Charts library
- **Hyperliquid**: For providing comprehensive market data APIs
- **Radix UI**: For accessible and customizable UI components
- **Framer Motion**: For smooth and performant animations
- **Zustand**: For lightweight and efficient state management

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/trading-book/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/trading-book/discussions)
- **Documentation**: [Project Wiki](https://github.com/yourusername/trading-book/wiki)
- **Email**: support@trading-book.dev

---

<div align="center">

**Built with ❤️ for traders, by traders**

[🌟 Star this repository](https://github.com/yourusername/trading-book) • [🐛 Report Bug](https://github.com/yourusername/trading-book/issues) • [💡 Request Feature](https://github.com/yourusername/trading-book/issues)

</div>
