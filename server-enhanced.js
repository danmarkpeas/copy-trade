// server-enhanced.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const DeltaExchangeCopyTrader = require('./services/DeltaExchangeCopyTrader');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Multi-tenant copy trading system
const copyTraders = new Map(); // Map<userId, DeltaExchangeCopyTrader>
const userSessions = new Map(); // Map<userId, { email, lastActive }>

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Simple rate limiting for real-time monitor
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 5000; // 5 seconds
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per 5 seconds

// Rate limiting middleware
function rateLimit(req, res, next) {
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  
  if (!requestCounts.has(clientId)) {
    requestCounts.set(clientId, { count: 0, resetTime: now + RATE_LIMIT_WINDOW });
  }
  
  const client = requestCounts.get(clientId);
  
  if (now > client.resetTime) {
    client.count = 0;
    client.resetTime = now + RATE_LIMIT_WINDOW;
  }
  
  client.count++;
  
  if (client.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please slow down your requests.',
      retryAfter: Math.ceil((client.resetTime - now) / 1000)
    });
  }
  
  next();
}

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  const activeUsers = Array.from(userSessions.values()).map(session => session.email);
  const activeTraders = copyTraders.size;
  
  res.json({
    success: true,
    message: 'Multi-Tenant Delta Exchange Copy Trading System',
    stats: {
      activeUsers: activeUsers.length,
      activeTraders: activeTraders,
      users: activeUsers
    },
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      setUser: '/api/set-user',
      realTimeMonitor: '/api/real-time-monitor',
      tradeHistory: '/api/trade-history',
      stats: '/api/stats',
      positions: '/api/positions',
      allUsers: '/api/all-users'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats: {
      activeUsers: userSessions.size,
      activeTraders: copyTraders.size,
      uptime: process.uptime()
    }
  });
});

// System status endpoint
app.get('/api/status', (req, res) => {
  const { user_id } = req.query;
  
  if (user_id) {
    // Return status for specific user
    const copyTrader = copyTraders.get(user_id);
    if (!copyTrader) {
      return res.json({
        success: false,
        status: 'not_initialized',
        message: 'Copy trading system not initialized for this user',
        user_id: user_id
      });
    }

    const status = copyTrader.getStatus();
    const userSession = userSessions.get(user_id);
    
    res.json({
      success: true,
      status: 'running',
      data: {
        ...status,
        user: userSession ? userSession.email : 'Unknown',
        user_id: user_id
      }
    });
  } else {
    // Return overall system status
    const userStatuses = Array.from(copyTraders.entries()).map(([userId, trader]) => {
      const userSession = userSessions.get(userId);
      const status = trader.getStatus();
      return {
        user_id: userId,
        email: userSession ? userSession.email : 'Unknown',
        status: status
      };
    });

    res.json({
      success: true,
      status: 'multi_tenant',
      data: {
        totalUsers: userSessions.size,
        activeTraders: copyTraders.size,
        users: userStatuses
      }
    });
  }
});

// Get all active users
app.get('/api/all-users', (req, res) => {
  const users = Array.from(userSessions.entries()).map(([userId, session]) => ({
    user_id: userId,
    email: session.email,
    lastActive: session.lastActive,
    hasTrader: copyTraders.has(userId)
  }));

  res.json({
    success: true,
    data: users
  });
});

// Set current user endpoint
app.post('/api/set-user', async (req, res) => {
  try {
    const { user_id, email } = req.body;
    
    if (!user_id || !email) {
      return res.status(400).json({
        success: false,
        error: 'User ID and email are required'
      });
    }

    // Update user session
    userSessions.set(user_id, { 
      email: email, 
      lastActive: new Date().toISOString() 
    });

    console.log(`👤 User session updated: ${email} (${user_id})`);

    // Initialize copy trading for this user if not already running
    if (!copyTraders.has(user_id)) {
      await initializeForUser(user_id);
    }

    res.json({
      success: true,
      message: `User session updated: ${email}`,
      user: { id: user_id, email: email },
      traderActive: copyTraders.has(user_id)
    });

  } catch (error) {
    console.error('❌ Error setting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set user'
    });
  }
});

// Start copy trading system
app.post('/api/start', async (req, res) => {
  try {
    const { brokerConfig, followerConfigs } = req.body;

    if (!brokerConfig || !followerConfigs || !Array.isArray(followerConfigs)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration. brokerConfig and followerConfigs array required.'
      });
    }

    // Validate broker config
    if (!brokerConfig.api_key || !brokerConfig.api_secret || !brokerConfig.name) {
      return res.status(400).json({
        success: false,
        error: 'Broker config must include api_key, api_secret, and name.'
      });
    }

    // Validate follower configs
    for (const config of followerConfigs) {
      if (!config.api_key || !config.api_secret || !config.name) {
        return res.status(400).json({
          success: false,
          error: `Follower config must include api_key, api_secret, and name. Invalid config: ${config.name || 'unnamed'}`
        });
      }
    }

    // Stop existing system if running
    if (copyTrader) {
      copyTrader.stopMonitoring();
      copyTrader = null;
    }

    // Create new copy trader instance
    copyTrader = new DeltaExchangeCopyTrader(brokerConfig, followerConfigs);

    // Set up event listeners
    copyTrader.on('started', () => {
      console.log('🎉 Copy trading system started successfully');
      isSystemRunning = true;
    });

    copyTrader.on('authenticated', () => {
      console.log('🔐 Successfully authenticated with Delta Exchange');
    });

    copyTrader.on('tradeCopied', (data) => {
      console.log(`📈 Trade copied: ${data.follower} - ${data.side} ${data.size} ${data.symbol}`);
      // Note: user_id not available in this context, will be handled in initializeForUser
      saveCopyTradeToDatabase(data, null);
    });

    copyTrader.on('positionClosed', (data) => {
      console.log(`📉 Position closed: ${data.follower} - ${data.symbol} (${data.size})`);
      savePositionCloseToDatabase(data, null);
    });

    copyTrader.on('error', (error) => {
      console.error('🚨 Copy Trader Error:', error);
    });

    copyTrader.on('stopped', () => {
      console.log('⏹️ Copy trading system has been stopped');
      isSystemRunning = false;
    });

    // Start monitoring
    await copyTrader.startMonitoring();

    res.json({
      success: true,
      message: 'Copy trading system started successfully',
      broker: brokerConfig.name,
      followers: followerConfigs.map(f => f.name)
    });

  } catch (error) {
    console.error('Failed to start copy trading system:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test trade endpoint
app.post('/api/test-trade', async (req, res) => {
  try {
    const { user_id } = req.query;
    const tradeData = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id query parameter is required'
      });
    }

    if (!tradeData || !tradeData.symbol || !tradeData.side || !tradeData.size) {
      return res.status(400).json({
        success: false,
        error: 'Invalid trade data. symbol, side, and size are required.'
      });
    }

    // Get the copy trader for this user
    const copyTrader = copyTraders.get(user_id);
    if (!copyTrader) {
      return res.status(404).json({
        success: false,
        error: 'Copy trading system not running for this user'
      });
    }

    console.log('🧪 Triggering test trade:', tradeData);

    // Emit the broker trade event
    copyTrader.emit('brokerTrade', tradeData);

    res.json({
      success: true,
      message: 'Test trade triggered successfully',
      tradeData: tradeData
    });

  } catch (error) {
    console.error('Failed to trigger test trade:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stop copy trading system
app.post('/api/stop', (req, res) => {
  try {
    if (copyTrader) {
      copyTrader.stopMonitoring();
      copyTrader = null;
      isSystemRunning = false;
      
      res.json({
        success: true,
        message: 'Copy trading system stopped successfully'
      });
    } else {
      res.json({
        success: false,
        message: 'No copy trading system running'
      });
    }
  } catch (error) {
    console.error('Failed to stop copy trading system:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Real-time monitor endpoint - handle both GET and POST
app.get('/api/real-time-monitor', rateLimit, (req, res) => {
  handleRealTimeMonitor(req, res);
});

app.post('/api/real-time-monitor', rateLimit, (req, res) => {
  handleRealTimeMonitor(req, res);
});

function handleRealTimeMonitor(req, res) {
  const { user_id } = req.query;
  
  if (user_id) {
    // Return monitoring data for specific user
    const copyTrader = copyTraders.get(user_id);
    if (!copyTrader) {
      return res.status(400).json({
        success: false,
        error: 'Copy trading system not running for this user'
      });
    }

    const status = copyTrader.getStatus();
    const stats = copyTrader.getStats();
    const userSession = userSessions.get(user_id);

    res.json({
      success: true,
      data: {
        user: userSession ? userSession.email : 'Unknown',
        user_id: user_id,
        systemStatus: {
          isConnected: status.isConnected,
          isAuthenticated: status.isAuthenticated,
          uptime: status.uptime
        },
        tradingStats: {
          totalTrades: stats.totalTrades,
          successfulCopies: stats.successfulCopies,
          failedCopies: stats.failedCopies,
          successRate: stats.successRate,
          totalVolume: stats.totalVolume,
          averageVolume: stats.averageVolume
        },
        positions: {
          broker: status.brokerPositions,
          followers: status.followerPositions
        },
        queue: {
          length: status.queueLength,
          isProcessing: copyTrader.isProcessing
        },
        timestamp: new Date().toISOString()
      }
    });
  } else {
    // Return monitoring data for all users
    const allUserData = Array.from(copyTraders.entries()).map(([userId, trader]) => {
      const userSession = userSessions.get(userId);
      const status = trader.getStatus();
      const stats = trader.getStats();
      
      return {
        user_id: userId,
        email: userSession ? userSession.email : 'Unknown',
        systemStatus: {
          isConnected: status.isConnected,
          isAuthenticated: status.isAuthenticated,
          uptime: status.uptime
        },
        tradingStats: {
          totalTrades: stats.totalTrades,
          successfulCopies: stats.successfulCopies,
          failedCopies: stats.failedCopies,
          successRate: stats.successRate,
          totalVolume: stats.totalVolume,
          averageVolume: stats.averageVolume
        },
        positions: {
          broker: status.brokerPositions,
          followers: status.followerPositions
        },
        queue: {
          length: status.queueLength,
          isProcessing: trader.isProcessing
        }
      };
    });

    res.json({
      success: true,
      data: {
        totalUsers: userSessions.size,
        activeTraders: copyTraders.size,
        users: allUserData,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Get trading statistics
app.get('/api/stats', (req, res) => {
  if (!copyTrader) {
    return res.status(400).json({
      success: false,
      error: 'Copy trading system not running'
    });
  }

  const stats = copyTrader.getStats();
  res.json({
    success: true,
    data: stats
  });
});

// Get current positions
app.get('/api/positions', (req, res) => {
  if (!copyTrader) {
    return res.status(400).json({
      success: false,
      error: 'Copy trading system not running'
    });
  }

  const status = copyTrader.getStatus();
  res.json({
    success: true,
    data: {
      broker: status.brokerPositions,
      followers: status.followerPositions,
      timestamp: new Date().toISOString()
    }
  });
});

// Trade history endpoint
app.get('/api/trade-history', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('copy_trades')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: data?.length || 0
      }
    });

  } catch (error) {
    console.error('Failed to fetch trade history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Database helper functions
async function saveCopyTradeToDatabase(tradeData, userId) {
  try {
    const { data, error } = await supabase
      .from('copy_trades')
      .insert({
        user_id: userId,
        master_trade_id: tradeData.orderId || `trade_${Date.now()}`,
        master_broker_id: tradeData.brokerId || 'default_broker',
        follower_id: tradeData.followerId || userId,
        follower_order_id: tradeData.followerOrderId || `follower_${Date.now()}`,
        original_symbol: tradeData.symbol,
        original_side: tradeData.side,
        original_size: tradeData.size,
        original_price: tradeData.price || 0,
        copied_size: tradeData.copiedSize || tradeData.size,
        copied_price: tradeData.price || 0,
        status: 'executed',
        entry_time: new Date().toISOString(),
        exit_time: null,
        // Add missing columns that might be required
        follower_name: tradeData.followerName || 'Unknown',
        broker_name: tradeData.brokerName || 'Unknown'
      });

    if (error) {
      console.error(`Failed to save copy trade to database for user ${userId}:`, error);
    } else {
      console.log(`✅ Copy trade saved to database for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error saving copy trade for user ${userId}:`, error);
  }
}

async function savePositionCloseToDatabase(positionData, userId) {
  try {
    const { data, error } = await supabase
      .from('position_closes')
      .insert({
        user_id: userId,
        follower_name: positionData.follower,
        symbol: positionData.symbol,
        size: positionData.size,
        timestamp: new Date(positionData.timestamp).toISOString(),
        status: 'closed'
      });

    if (error) {
      console.error(`Failed to save position close to database for user ${userId}:`, error);
    } else {
      console.log(`✅ Position close saved to database for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error saving position close for user ${userId}:`, error);
  }
}

// Initialize copy trading system from database
// Initialize copy trading for a specific user
async function initializeForUser(userId) {
  try {
    console.log(`🔍 Loading broker accounts and followers for user: ${userId}...`);
    
    // Get active broker account for this specific user
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('is_verified', true)
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log(`⚠️ No active broker accounts found for user: ${userId}`);
      return;
    }

    const brokerAccount = brokerAccounts[0];
    
    // Get followers for this broker
    const { data: followers, error: followerError } = await supabase
      .from('followers')
      .select('*')
      .eq('master_broker_account_id', brokerAccount.id)
      .eq('account_status', 'active');

    if (followerError || !followers || followers.length === 0) {
      console.log(`⚠️ No active followers found for broker account: ${brokerAccount.account_name}`);
      return;
    }

    // Create broker config
    const brokerConfig = {
      api_key: brokerAccount.api_key,
      api_secret: brokerAccount.api_secret,
      name: brokerAccount.account_name,
      id: brokerAccount.id
    };

    // Create follower configs
    const followerConfigs = followers.map(follower => ({
      api_key: follower.api_key,
      api_secret: follower.api_secret,
      name: follower.follower_name,
      id: follower.id,
      size_multiplier: follower.multiplier || 1.0
    }));

    const userSession = userSessions.get(userId);
    console.log(`🚀 Starting copy trading system for user: ${userSession ? userSession.email : userId}`);
    console.log(`📊 Broker: ${brokerConfig.name}`);
    console.log(`👥 Followers: ${followerConfigs.length}`);
    
    const copyTrader = new DeltaExchangeCopyTrader(brokerConfig, followerConfigs);
    
    // Set up event listeners
    copyTrader.on('started', () => {
      console.log(`🎉 Copy trading system started for user: ${userId}`);
    });

    copyTrader.on('authenticated', () => {
      console.log(`🔐 Authenticated with Delta Exchange for user: ${userId}`);
    });

    copyTrader.on('tradeCopied', (data) => {
      console.log(`📈 Trade copied for user ${userId}: ${data.follower} - ${data.side} ${data.size} ${data.symbol}`);
      saveCopyTradeToDatabase(data, userId);
    });

    copyTrader.on('positionClosed', (data) => {
      console.log(`📉 Position closed for user ${userId}: ${data.follower} - ${data.symbol} (${data.size})`);
      savePositionCloseToDatabase(data, userId);
    });

    copyTrader.on('error', (error) => {
      console.error(`🚨 Copy Trader Error for user ${userId}:`, error);
    });

    copyTrader.on('stopped', () => {
      console.log(`⏹️ Copy trading system stopped for user: ${userId}`);
      copyTraders.delete(userId);
    });

    // Store the copy trader
    copyTraders.set(userId, copyTrader);
    
    // Start monitoring
    await copyTrader.startMonitoring();
    
  } catch (error) {
    console.error(`❌ Error initializing for user ${userId}:`, error.message);
  }
}

// Legacy function for backward compatibility
async function initializeFromDatabase() {
  try {
    console.log('🔍 Loading broker accounts and followers from database...');
    
    // Get active broker accounts
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true)
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('⚠️ No active broker accounts found in database');
      return;
    }

    const brokerAccount = brokerAccounts[0];
    
    // Get followers for this broker
    const { data: followers, error: followerError } = await supabase
      .from('followers')
      .select('*')
      .eq('master_broker_account_id', brokerAccount.id)
      .eq('account_status', 'active');

    if (followerError || !followers || followers.length === 0) {
      console.log('⚠️ No active followers found for broker account');
      return;
    }

    // Create broker config
    const brokerConfig = {
      api_key: brokerAccount.api_key,
      api_secret: brokerAccount.api_secret,
      name: brokerAccount.account_name,
      id: brokerAccount.id
    };

    // Create follower configs
    const followerConfigs = followers.map(follower => ({
      api_key: follower.api_key,
      api_secret: follower.api_secret,
      name: follower.follower_name,
      follower_name: follower.follower_name,
      id: follower.id,
      copy_mode: follower.copy_mode || 'fixed_lot',
      multiplier: follower.multiplier || 1.0,
      fixed_lot: follower.fixed_lot || 0.001,
      min_lot_size: follower.min_lot_size || 0.001,
      max_lot_size: follower.max_lot_size || 0.01,
      size_multiplier: follower.multiplier || 1.0
    }));

    console.log(`🚀 Auto-starting copy trading system from database...`);
    console.log(`📊 Broker: ${brokerConfig.name}`);
    console.log(`👥 Followers: ${followerConfigs.length}`);
    
    copyTrader = new DeltaExchangeCopyTrader(brokerConfig, followerConfigs);
    
    // Set up event listeners
    copyTrader.on('started', () => {
      console.log('🎉 Copy trading system started successfully');
      isSystemRunning = true;
    });

    copyTrader.on('authenticated', () => {
      console.log('🔐 Successfully authenticated with Delta Exchange');
    });

    copyTrader.on('tradeCopied', (data) => {
      console.log(`📈 Trade copied: ${data.follower} - ${data.side} ${data.size} ${data.symbol}`);
      saveCopyTradeToDatabase(data, userId);
    });

    copyTrader.on('positionClosed', (data) => {
      console.log(`📉 Position closed: ${data.follower} - ${data.symbol} (${data.size})`);
      savePositionCloseToDatabase(data, userId);
    });

    copyTrader.on('error', (error) => {
      console.error('🚨 Copy Trader Error:', error);
    });

    copyTrader.on('stopped', () => {
      console.log('⏹️ Copy trading system has been stopped');
      isSystemRunning = false;
    });

    await copyTrader.startMonitoring();
    
  } catch (error) {
    console.error('❌ Error initializing from database:', error.message);
  }
}

// Initialize copy trading system from environment variables (optional)
async function initializeFromEnvironment() {
  const brokerApiKey = process.env.BROKER_API_KEY;
  const brokerApiSecret = process.env.BROKER_API_SECRET;
  const brokerName = process.env.BROKER_NAME || 'default_broker';

  if (brokerApiKey && brokerApiSecret) {
    const brokerConfig = {
      api_key: brokerApiKey,
      api_secret: brokerApiSecret,
      name: brokerName
    };

    // Parse follower configs from environment
    const followerConfigs = [];
    let followerIndex = 1;
    
    while (process.env[`FOLLOWER${followerIndex}_API_KEY`] && process.env[`FOLLOWER${followerIndex}_API_SECRET`]) {
      followerConfigs.push({
        api_key: process.env[`FOLLOWER${followerIndex}_API_KEY`],
        api_secret: process.env[`FOLLOWER${followerIndex}_API_SECRET`],
        name: process.env[`FOLLOWER${followerIndex}_NAME`] || `follower_${followerIndex}`,
        size_multiplier: parseFloat(process.env[`FOLLOWER${followerIndex}_MULTIPLIER`] || '1.0')
      });
      followerIndex++;
    }

    if (followerConfigs.length > 0) {
      console.log('🚀 Auto-starting copy trading system from environment variables...');
      
      copyTrader = new DeltaExchangeCopyTrader(brokerConfig, followerConfigs);
      
      // Set up event listeners
      copyTrader.on('started', () => {
        console.log('🎉 Copy trading system started successfully');
        isSystemRunning = true;
      });

      copyTrader.on('authenticated', () => {
        console.log('🔐 Successfully authenticated with Delta Exchange');
      });

      copyTrader.on('tradeCopied', (data) => {
        console.log(`📈 Trade copied: ${data.follower} - ${data.side} ${data.size} ${data.symbol}`);
        saveCopyTradeToDatabase(data, null);
      });

      copyTrader.on('positionClosed', (data) => {
        console.log(`📉 Position closed: ${data.follower} - ${data.symbol} (${data.size})`);
        savePositionCloseToDatabase(data, null);
      });

      copyTrader.on('error', (error) => {
        console.error('🚨 Copy Trader Error:', error);
      });

      copyTrader.on('stopped', () => {
        console.log('⏹️ Copy trading system has been stopped');
        isSystemRunning = false;
      });

      await copyTrader.startMonitoring();
    }
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📈 Status: http://localhost:${PORT}/api/status`);
  
  // Auto-initialize from database
  await initializeFromDatabase();
  console.log(`💡 Copy trading system ready. Use POST /api/start to initialize with your API credentials.`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  if (copyTrader) {
    copyTrader.stopMonitoring();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  if (copyTrader) {
    copyTrader.stopMonitoring();
  }
  process.exit(0);
});

module.exports = app; 