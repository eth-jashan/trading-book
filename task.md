# Frontend Developer Screening Task: Trading Interface

## Overview
Build a simulated trading interface that allows users to paper trade crypto assets with real-time price data. This task evaluates your React skills, API integration abilities, state management expertise, and UI/UX design sense.

**Tech Stack:** Your choice of React framework and libraries

## Core Requirements

### Essential Features
1. **Price visualization** - Display price data in a meaningful way
2. **Asset selection** - Users can browse and select different crypto assets
3. **Trading simulation** - Create and manage simulated positions
4. **Position tracking** - View active positions with profit/loss calculations
5. **Transaction history** - Record of past trading activity

### Technical Requirements
- Use **Hyperliquid API** (`https://api.hyperliquid.xyz/info`) for market data
- Implement **persistent storage** for user positions
- Handle **real-time price updates**
- Create **responsive design** for different screen sizes
- Include proper **loading states** and **error handling**

## API Information

### Hyperliquid Endpoints
The API accepts POST requests to `https://api.hyperliquid.xyz/info` with different request types:

- **Current Prices**: `{"type": "allMids"}`
- **Market Data**: `{"type": "meta"}`
- **Price History**: `{"type": "candleSnapshot", "req": {"coin": "ETH", "interval": "1h", "startTime": timestamp}}`

## What We're Looking For

### Technical Skills
- Clean, organized code architecture
- Proper state management patterns
- Effective API integration and error handling
- TypeScript usage (if chosen)
- Performance considerations

### Design & UX
- Intuitive user interface
- Professional visual design
- Smooth user interactions
- Accessibility considerations
- Mobile responsiveness

### Problem Solving
- How you approach complex state synchronization
- Creative solutions to technical challenges  
- Code organization and reusability
- Documentation and code clarity

## Submission Requirements

### Deliverables
1. **Source code** - Complete, runnable application
2. **README** - Setup instructions and architectural overview
3. **Demo** - Screenshots or video showing key features
4. **Reflection** - Brief notes on your design decisions and trade-offs

### Evaluation Criteria
- **Functionality** - Does it work as intended?
- **Code Quality** - Is it well-structured and maintainable?
- **User Experience** - Is it pleasant to use?
- **Technical Execution** - Are best practices followed?

## Getting Started Tips

### Suggested Approach
1. Start with basic API integration and data fetching
2. Build core components (markets, chart, trading form)
3. Implement position management and persistence
4. Add real-time updates and polish the UI
5. Test edge cases and error scenarios

### Common Challenges
- **State synchronization** across multiple components
- **Real-time data updates** without performance issues
- **Persistent storage** that works reliably
- **Error handling** for network failures
- **Responsive design** for different screen sizes

## Bonus Opportunities
Feel free to add features that showcase your skills:
- Advanced charting capabilities
- Portfolio analytics
- Dark/light mode toggle
- Keyboard shortcuts
- Unit tests
- Performance optimizations
- Creative UI enhancements

## Questions?
This is an open-ended task designed to see how you approach real-world frontend challenges. No need to spend more than 1-2 hours. Feel free to make reasonable assumptions about requirements and focus on areas where you can demonstrate your strongest skills.

The goal is to build something you'd be proud to show off while solving interesting technical problems along the way.