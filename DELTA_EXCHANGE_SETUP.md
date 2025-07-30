# Delta Exchange Copy Trading System Setup Guide

## Overview

This comprehensive copy trading system for Delta Exchange provides real-time trade detection, automatic position copying, and advanced monitoring capabilities. The system is built with Node.js and includes WebSocket integration for ultra-fast trade execution.

## Features

- ✅ **Real-time Trade Detection**: WebSocket-based monitoring of broker trades
- ✅ **Automatic Position Copying**: Instant replication of broker positions to followers
- ✅ **Position Closure Detection**: Automatic closing of follower positions when broker closes
- ✅ **Multiple Follower Support**: Copy to multiple accounts with different size multipliers
- ✅ **Advanced Error Handling**: Comprehensive error recovery and reconnection logic
- ✅ **Performance Monitoring**: Real-time statistics and performance tracking
- ✅ **Order Queue Management**: Efficient order processing with queue system
- ✅ **Heartbeat Monitoring**: Connection health monitoring with automatic reconnection
- ✅ **Database Integration**: Trade history and position tracking in Supabase

## Quick Start

### 1. Environment Setup

Create a `.env` file in your project root:

```bash
# Delta Exchange API Credentials
BROKER_API_KEY=your_broker_api_key_here
BROKER_API_SECRET=your_broker_api_secret_here
BROKER_NAME=my_broker_account

# Follower Account 1
FOLLOWER1_API_KEY=your_follower1_api_key_here
FOLLOWER1_API_SECRET=your_follower1_api_secret_here
FOLLOWER1_NAME=follower_account_1
FOLLOWER1_MULTIPLIER=1.0

# Follower Account 2 (optional)
FOLLOWER2_API_KEY=your_follower2_api_key_here
FOLLOWER2_API_SECRET=your_follower2_api_secret_here
FOLLOWER2_NAME=follower_account_2
FOLLOWER2_MULTIPLIER=0.5

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=3001
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Demo

Test the system with the demo script:

```bash
npm run demo
```

### 4. Start the Server

```bash
npm run server
```

## API Endpoints

### System Management

- `GET /` - System overview and available endpoints
- `GET /api/health` - Health check
- `GET /api/status` - System status and statistics
- `POST /api/start` - Start copy trading system
- `POST /api/stop` - Stop copy trading system

### Monitoring

- `GET /api/real-time-monitor` - Real-time system monitoring (rate limited)
- `GET /api/stats` - Trading statistics
- `GET /api/positions` - Current positions for all accounts
- `GET /api/trade-history` - Historical trade data

## Configuration Examples

### Basic Configuration

```javascript
const brokerConfig = {
    api_key: 'your_broker_api_key',
    api_secret: 'your_broker_api_secret',
    name: 'my_broker'
};

const followerConfigs = [
    {
        api_key: 'your_follower_api_key',
        api_secret: 'your_follower_api_secret',
        name: 'my_follower',
        size_multiplier: 1.0 // Same size as broker
    }
];
```

### Advanced Configuration

```javascript
const brokerConfig = {
    api_key: 'your_broker_api_key',
    api_secret: 'your_broker_api_secret',
    name: 'professional_broker'
};

const followerConfigs = [
    {
        api_key: 'follower1_api_key',
        api_secret: 'follower1_api_secret',
        name: 'conservative_follower',
        size_multiplier: 0.5 // Half size for conservative approach
    },
    {
        api_key: 'follower2_api_key',
        api_secret: 'follower2_api_secret',
        name: 'aggressive_follower',
        size_multiplier: 2.0 // Double size for aggressive approach
    },
    {
        api_key: 'follower3_api_key',
        api_secret: 'follower3_api_secret',
        name: 'standard_follower',
        size_multiplier: 1.0 // Same size as broker
    }
];
```

## Usage Examples

### Starting the System via API

```bash
curl -X POST http://localhost:3001/api/start \
  -H "Content-Type: application/json" \
  -d '{
    "brokerConfig": {
      "api_key": "your_broker_api_key",
      "api_secret": "your_broker_api_secret",
      "name": "my_broker"
    },
    "followerConfigs": [
      {
        "api_key": "your_follower_api_key",
        "api_secret": "your_follower_api_secret",
        "name": "my_follower",
        "size_multiplier": 1.0
      }
    ]
  }'
```

### Monitoring System Status

```bash
curl http://localhost:3001/api/status
```

### Getting Real-time Statistics

```bash
curl http://localhost:3001/api/real-time-monitor
```

## Event System

The copy trading system emits various events that you can listen to:

```javascript
const copyTrader = new DeltaExchangeCopyTrader(brokerConfig, followerConfigs);

// System events
copyTrader.on('started', () => {
    console.log('System started successfully');
});

copyTrader.on('authenticated', () => {
    console.log('Successfully authenticated with Delta Exchange');
});

copyTrader.on('stopped', () => {
    console.log('System stopped');
});

// Trading events
copyTrader.on('brokerTrade', (tradeData) => {
    console.log('Broker trade detected:', tradeData);
});

copyTrader.on('tradeCopied', (data) => {
    console.log('Trade copied successfully:', data);
});

copyTrader.on('positionClosed', (data) => {
    console.log('Position closed:', data);
});

// Error events
copyTrader.on('error', (error) => {
    console.error('System error:', error);
});
```

## Error Handling

The system includes comprehensive error handling for various scenarios:

- **WebSocket Connection Errors**: Automatic reconnection with exponential backoff
- **Authentication Failures**: Clear error messages for API credential issues
- **Trade Copy Failures**: Individual error tracking for each follower
- **Position Close Failures**: Graceful handling of position closure errors
- **API Rate Limiting**: Built-in rate limiting and retry logic

## Performance Monitoring

The system tracks various performance metrics:

- Total trades processed
- Successful vs failed copies
- Success rate percentage
- Total volume traded
- Average trade size
- System uptime
- Queue length and processing status

## Security Considerations

1. **API Key Security**: Never commit API keys to version control
2. **Environment Variables**: Use environment variables for sensitive data
3. **Rate Limiting**: Built-in rate limiting to prevent API abuse
4. **Error Logging**: Comprehensive error logging without exposing sensitive data
5. **Connection Security**: Secure WebSocket connections with proper authentication

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify API credentials are correct
   - Check if API keys have proper permissions
   - Ensure API keys are active and not expired

2. **WebSocket Connection Issues**
   - Check network connectivity
   - Verify Delta Exchange service status
   - Check firewall settings

3. **Trade Copy Failures**
   - Verify follower account has sufficient balance
   - Check if symbol is available for trading
   - Ensure follower account has proper permissions

4. **Position Sync Issues**
   - Check if positions exist in follower accounts
   - Verify symbol names match between accounts
   - Check for any trading restrictions

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=delta-exchange-copy-trader npm run server
```

## Database Schema

The system uses Supabase for data storage. Required tables:

### copy_trades
```sql
CREATE TABLE copy_trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    size DECIMAL NOT NULL,
    order_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'executed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### position_closes
```sql
CREATE TABLE position_closes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    size DECIMAL NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'closed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Production Deployment

### Environment Variables
Ensure all required environment variables are set in production:

```bash
# Required
BROKER_API_KEY
BROKER_API_SECRET
BROKER_NAME
FOLLOWER1_API_KEY
FOLLOWER1_API_SECRET
FOLLOWER1_NAME

# Optional
FOLLOWER2_API_KEY
FOLLOWER2_API_SECRET
FOLLOWER2_NAME
FOLLOWER2_MULTIPLIER

# Database
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

# Server
PORT
NODE_ENV=production
```

### Process Management
Use a process manager like PM2 for production:

```bash
npm install -g pm2
pm2 start server-enhanced.js --name "delta-copy-trader"
pm2 save
pm2 startup
```

### Monitoring
Set up monitoring for:
- System uptime
- Error rates
- Trade success rates
- API response times
- Memory usage

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review error logs
3. Test with the demo script
4. Verify API credentials and permissions

## License

MIT License - see LICENSE file for details. 