# Delta Exchange Copy Trading Platform

A comprehensive, production-ready copy trading platform for Delta Exchange built with Next.js, React, and Node.js. This system provides ultra-fast real-time trade detection, automatic position copying, and advanced monitoring capabilities.

## 🚀 Features

### Core Functionality
- **Real-time Trade Detection**: WebSocket-based monitoring of broker trades
- **Automatic Position Copying**: Instant replication of broker positions to followers
- **Position Closure Detection**: Automatic closing of follower positions when broker closes
- **Multiple Follower Support**: Copy to multiple accounts with different size multipliers
- **Advanced Error Handling**: Comprehensive error recovery and reconnection logic
- **Performance Monitoring**: Real-time statistics and performance tracking
- **Order Queue Management**: Efficient order processing with queue system
- **Heartbeat Monitoring**: Connection health monitoring with automatic reconnection
- **Database Integration**: Trade history and position tracking in Supabase

### Technical Features
- **WebSocket Integration**: Real-time connection to Delta Exchange
- **RESTful API**: Complete API for managing copy trading operations
- **Event-Driven Architecture**: Reactive system with comprehensive event handling
- **Error Handling**: Robust error handling and reconnection logic
- **Scalable Design**: Support for multiple brokers and followers
- **Modern UI**: Beautiful, responsive interface built with Next.js and Tailwind CSS

## 📁 Project Structure

```
copy-trading-platform/
├── services/
│   ├── TradingService.js          # Core trading service with WebSocket
│   └── CopyTradingEngine.js       # Copy trading logic and management
├── scripts/
│   ├── test-complete-system.js    # Complete system test
│   ├── test-api-endpoints.js      # API endpoint testing
│   ├── demo-complete-system.js    # System demonstration
│   ├── quick-trade-test.js        # Quick trade detection test
│   ├── fix-trade-detection.js     # Manual trade detection fix
│   └── create-tables-simple.js    # Database table creation
├── supabase/
│   └── functions/
│       ├── real-time-trade-monitor/  # Edge function for trade monitoring
│       ├── copy-trade/               # Edge function for trade copying
│       └── send-email/               # Email service
├── server.js                        # Main API server
├── server-enhanced.js               # Enhanced server with all features
├── publicTrades.js                  # Public trades service
├── userFills.js                     # User fills service
├── package.json                     # Dependencies and scripts
└── README.md                        # This file
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd copy-trading-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   PORT=3001
   ```

4. **Set up database tables**
   ```bash
   node scripts/create-tables-simple.js
   ```

## 🚀 Quick Start

### Start the Server
```bash
npm start
```

### Test the System
```bash
# Test complete system
npm run demo

# Test API endpoints
npm run test

# Quick trade test
npm run quick-test
```

## 📊 API Endpoints

### Health & Status
- `GET /api/health` - Health check
- `GET /api/copy-trading/status` - Copy trading engine status

### Master Traders
- `POST /api/copy-trading/master` - Add master trader
- `GET /api/copy-trading/masters` - List master traders

### Followers
- `POST /api/copy-trading/follower` - Add follower
- `PUT /api/copy-trading/follower/:id/settings` - Update follower settings
- `GET /api/copy-trading/followers/:id/stats` - Get follower statistics

### Copy Relationships
- `POST /api/copy-trading/relationship` - Create copy relationship
- `DELETE /api/copy-trading/relationship` - Remove copy relationship

### Trade Data
- `GET /api/copy-trading/history` - Get trade history
- `GET /api/trades/public/:symbol` - Get public trades
- `POST /api/trades/user/fills` - Get user fills

## 🔧 Configuration

### Copy Trading Settings
```javascript
const copySettings = {
  copyRatio: 0.1,              // Copy 10% of master's position
  useMarketOrders: true,       // Use market orders for execution
  symbolFilter: ['DYDXUSD'],   // Only copy specific symbols
  minTradeSize: 1,             // Minimum trade size to copy
  maxTradeSize: 100,           // Maximum trade size to copy
  reverseDirection: false,     // Copy in opposite direction
  copyPositionClose: true      // Close positions when master closes
};
```

### WebSocket Configuration
The system automatically handles:
- Connection establishment
- Authentication
- Reconnection on disconnection
- Channel subscriptions
- Message parsing and routing

## 📈 Usage Examples

### Adding a Master Trader
```javascript
const result = copyEngine.addMasterTrader(
  'master-id',
  'api-key',
  'api-secret'
);
```

### Adding a Follower
```javascript
const result = copyEngine.addFollower(
  'follower-id',
  'api-key',
  'api-secret',
  {
    copyRatio: 0.1,
    symbolFilter: ['DYDXUSD', 'BTCUSD'],
    useMarketOrders: true
  }
);
```

### Creating Copy Relationship
```javascript
const result = copyEngine.createCopyRelationship(
  'follower-id',
  'master-id'
);
```

### Getting Statistics
```javascript
const stats = copyEngine.getStats('follower-id');
console.log(`Success rate: ${stats.successRate}%`);
console.log(`Total trades: ${stats.totalTrades}`);
```

## 🔍 Monitoring & Debugging

### Real-time Events
The system emits various events for monitoring:
- `masterConnected` - Master trader connected
- `followerConnected` - Follower connected
- `copyTradeExecuted` - Copy trade executed
- `copyTradeError` - Copy trade error
- `positionCopyClosed` - Position copy closed

### Logging
Comprehensive logging is available for:
- WebSocket connections
- Trade executions
- API calls
- Database operations
- Error conditions

### Testing Scripts
- `scripts/test-complete-system.js` - Complete system test
- `scripts/test-api-endpoints.js` - API endpoint testing
- `scripts/demo-complete-system.js` - System demonstration
- `scripts/quick-trade-test.js` - Quick trade detection

## 🛡️ Security Considerations

### API Key Management
- Store API keys securely in environment variables
- Use service role keys for database operations
- Implement proper authentication for API endpoints

### Error Handling
- Comprehensive error handling for all operations
- Graceful degradation on failures
- Automatic reconnection for WebSocket connections

### Rate Limiting
- Implement rate limiting for API endpoints
- Respect Delta Exchange API limits
- Use exponential backoff for retries

## 🔄 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 📊 Database Schema

### copy_trades Table
```sql
CREATE TABLE copy_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_trade_id text NOT NULL,
  master_broker_id uuid REFERENCES broker_accounts(id),
  follower_id uuid REFERENCES users(id),
  original_symbol text NOT NULL,
  original_side text NOT NULL,
  original_size numeric NOT NULL,
  original_price numeric NOT NULL,
  copied_size numeric NOT NULL,
  copied_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  entry_time timestamptz DEFAULT now(),
  exit_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the test scripts for examples

## 🔮 Roadmap

- [ ] Advanced risk management
- [ ] Performance analytics dashboard
- [ ] Mobile app integration
- [ ] Multi-exchange support
- [ ] Social trading features
- [ ] Advanced order types
- [ ] Backtesting capabilities
