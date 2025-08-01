// server.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const CopyTradingEngine = require('./services/CopyTradingEngine');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize copy trading engine
const copyEngine = new CopyTradingEngine();

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
  res.json({
    success: true,
    message: 'Ultra-Fast Real-Time Copy Trading System',
    status: 'Running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      setUser: '/api/set-user',
      realTimeMonitor: '/api/real-time-monitor',
      tradeHistory: '/api/trade-history'
    }
  });
});

// Event listeners for real-time updates
copyEngine.on('masterConnected', (masterId) => {
  console.log(`🎯 Master trader ${masterId} connected to WebSocket`);
});

copyEngine.on('followerConnected', (followerId) => {
  console.log(`👥 Follower ${followerId} connected to WebSocket`);
});

copyEngine.on('copyTradeExecuted', (tradeRecord) => {
  console.log('📊 Copy trade executed:', {
    masterId: tradeRecord.masterId,
    followerId: tradeRecord.followerId,
    symbol: tradeRecord.masterTrade.symbol,
    side: tradeRecord.masterTrade.side,
    size: tradeRecord.copyOrder.size,
    success: tradeRecord.result.success
  });
  
  // Save to database
  saveCopyTradeToDatabase(tradeRecord);
});

copyEngine.on('copyTradeError', (errorData) => {
  console.error('❌ Copy trade error:', errorData);
});

// Database helper function
async function saveCopyTradeToDatabase(tradeRecord) {
  try {
    const copyTrade = {
      master_trade_id: `ws_${tradeRecord.masterTrade.fillId}`,
      master_broker_id: tradeRecord.masterId,
      follower_id: tradeRecord.followerId,
      original_symbol: tradeRecord.masterTrade.symbol,
      original_side: tradeRecord.masterTrade.side,
      original_size: parseFloat(tradeRecord.masterTrade.size),
      original_price: parseFloat(tradeRecord.masterTrade.price),
      copied_size: parseFloat(tradeRecord.copyOrder.size),
      copied_price: parseFloat(tradeRecord.masterTrade.price),
      status: tradeRecord.result.success ? 'executed' : 'failed',
      entry_time: tradeRecord.timestamp.toISOString()
    };

    const { data, error } = await supabase
      .from('copy_trades')
      .insert(copyTrade)
      .select()
      .single();

    if (error) {
      console.error('Database error saving copy trade:', error);
    } else {
      console.log('✅ Copy trade saved to database:', data.id);
    }
  } catch (error) {
    console.error('Error saving copy trade to database:', error);
  }
}

// Initialize copy trading from database
async function initializeCopyTrading() {
  try {
    console.log('🔄 Initializing copy trading from database...');
    
    // Get active broker accounts
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    // Add master traders
    for (const broker of brokerAccounts) {
      const result = copyEngine.addMasterTrader(
        broker.id,
        broker.api_key,
        broker.api_secret
      );
      
      if (result.success) {
        console.log(`✅ Added master trader: ${broker.account_name || 'Master'}`);
      } else {
        console.log(`❌ Failed to add master trader: ${result.error}`);
      }
    }

    // Get active followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log(`✅ Found ${followers.length} active followers`);

    // Track added followers to prevent duplicates
    const addedFollowers = new Set();

    // Add followers to copy trading engine
    for (const follower of followers) {
      // Skip if already added
      if (addedFollowers.has(follower.id)) {
        console.log(`⏭️  Skipping duplicate follower: ${follower.follower_name}`);
        continue;
      }

      // Add follower to copy trading engine using their unique ID
      const result = copyEngine.addFollower(
        follower.id, // Use follower's unique ID instead of user_id
        follower.api_key,
        follower.api_secret,
        {
          copyMode: follower.copy_mode || 'percentage',
          multiplier: follower.multiplier || 1,
          percentage: follower.percentage || 100,
          fixedLot: follower.fixed_lot || null,
          maxLotSize: follower.max_lot_size || 10,
          minLotSize: follower.min_lot_size || 0.01,
          maxDailyTrades: follower.max_daily_trades || 50,
          maxOpenPositions: follower.max_open_positions || 5,
          stopLossPercentage: follower.stop_loss_percentage || 5,
          takeProfitPercentage: follower.take_profit_percentage || 10
        }
      );

      if (result.success) {
        console.log(`✅ Added follower: ${follower.follower_name} (${follower.id})`);
        addedFollowers.add(follower.id);

        // Create copy relationship
        copyEngine.createCopyRelationship(
          follower.id, // Use follower's unique ID
          follower.master_broker_account_id
        );

        console.log(`✅ Created copy relationship: ${follower.id} -> ${follower.master_broker_account_id}`);
      } else {
        console.log(`❌ Failed to add follower: ${follower.follower_name} - ${result.error}`);
      }
    }

    console.log('🎯 Copy trading initialization complete');
  } catch (error) {
    console.error('❌ Error initializing copy trading:', error);
  }
}

// Routes

// Add master trader
app.post('/api/masters', (req, res) => {
  try {
    const { masterId, apiKey, apiSecret } = req.body;
    
    if (!masterId || !apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        error: 'masterId, apiKey, and apiSecret are required'
      });
    }

    const result = copyEngine.addMasterTrader(masterId, apiKey, apiSecret);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Add follower
app.post('/api/followers', (req, res) => {
  try {
    const { followerId, apiKey, apiSecret, settings } = req.body;
    
    if (!followerId || !apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        error: 'followerId, apiKey, and apiSecret are required'
      });
    }

    const defaultSettings = {
      copyRatio: 1,
      useMarketOrders: true,
      symbolFilter: [],
      minTradeSize: 0,
      maxTradeSize: null,
      fixedAmount: null,
      reverseDirection: false,
      copyPositionClose: true
    };

    const copySettings = { ...defaultSettings, ...settings };
    const result = copyEngine.addFollower(followerId, apiKey, apiSecret, copySettings);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create copy relationship
app.post('/api/copy-relationships', (req, res) => {
  try {
    const { followerId, masterId } = req.body;
    
    if (!followerId || !masterId) {
      return res.status(400).json({
        success: false,
        error: 'followerId and masterId are required'
      });
    }

    const result = copyEngine.createCopyRelationship(followerId, masterId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Remove copy relationship
app.delete('/api/copy-relationships', (req, res) => {
  try {
    const { followerId, masterId } = req.body;
    
    if (!followerId || !masterId) {
      return res.status(400).json({
        success: false,
        error: 'followerId and masterId are required'
      });
    }

    const result = copyEngine.removeCopyRelationship(followerId, masterId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update follower settings
app.put('/api/followers/:followerId/settings', (req, res) => {
  try {
    const { followerId } = req.params;
    const { settings } = req.body;
    
    if (!settings) {
      return res.status(400).json({
        success: false,
        error: 'Settings are required'
      });
    }

    const result = copyEngine.updateFollowerSettings(followerId, settings);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get trade history
app.get('/api/trade-history', (req, res) => {
  try {
    const filters = {
      followerId: req.query.followerId,
      masterId: req.query.masterId,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const history = copyEngine.getTradeHistory(filters);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get follower stats
app.get('/api/followers/:followerId/stats', (req, res) => {
  try {
    const { followerId } = req.params;
    const stats = copyEngine.getStats(followerId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
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

    console.log(`👤 User session updated: ${email} (${user_id})`);

    res.json({
      success: true,
      message: `User session updated: ${email}`,
      user: { id: user_id, email: email }
    });

  } catch (error) {
    console.error('❌ Error setting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set user'
    });
  }
});

// Real-time monitor endpoint
app.post('/api/real-time-monitor', async (req, res) => {
  try {
    const { broker_id } = req.body;

    if (!broker_id) {
      return res.status(400).json({
        success: false,
        error: 'broker_id is required'
      });
    }

    console.log('🔍 Backend real-time monitoring triggered for broker:', broker_id);

    // Get broker account from database
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', broker_id)
      .single();

    if (brokerError || !brokerAccount) {
      return res.status(404).json({
        success: false,
        error: 'Broker account not found'
      });
    }

    // Get active followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('master_broker_account_id', broker_id)
      .eq('account_status', 'active');

    if (followersError) {
      return res.status(500).json({
        success: false,
        error: 'Error fetching followers'
      });
    }

    // Get recent master trades from Delta Exchange API
    const masterTrades = await getRecentMasterTrades(brokerAccount);

    // Get current positions via API
    const positions = await getCurrentPositions(brokerAccount);

    const result = {
      success: true,
      message: 'Real-time monitoring completed',
      broker_id: broker_id,
      total_trades_found: masterTrades?.length || 0,
      active_followers: followers?.length || 0,
      trades_copied: 0, // Will be calculated by the ultra-fast system
      copy_results: masterTrades || [],
      positions: positions,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Backend monitoring completed:', result);
    res.json(result);

  } catch (error) {
    console.error('❌ Error in backend real-time monitor:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Helper function to get recent master trades from Delta Exchange
async function getRecentMasterTrades(brokerAccount) {
  try {
    const crypto = require('crypto');
    const API_KEY = brokerAccount.api_key;
    const API_SECRET = brokerAccount.api_secret;
    const BASE_URL = 'https://api.india.delta.exchange';

    function generateSignature(secret, prehashString) {
      return crypto.createHmac('sha256', secret).update(prehashString).digest('hex');
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'GET';
    const path = '/v2/fills';
    const queryString = '?limit=20'; // Get last 20 fills
    const payload = '';
    
    const prehashString = method + timestamp + path + queryString + payload;
    const signature = generateSignature(API_SECRET, prehashString);

    const headers = {
      'Accept': 'application/json',
      'api-key': API_KEY,
      'signature': signature,
      'timestamp': timestamp,
      'User-Agent': 'copy-trading-platform'
    };

    const response = await fetch(`${BASE_URL}${path}${queryString}`, {
      method: 'GET',
      headers: headers
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.result) {
        // Convert fills to trade format
        return data.result.map(fill => ({
          symbol: fill.product_symbol,
          side: fill.side,
          size: parseFloat(fill.size),
          price: parseFloat(fill.price),
          status: fill.status || 'executed',
          timestamp: fill.created_at,
          order_id: fill.order_id
        }));
      }
    } else {
      console.log('❌ Failed to fetch master trades:', await response.text());
    }
    
    return [];
  } catch (error) {
    console.log('❌ Error fetching master trades:', error.message);
    return [];
  }
}

// Helper function to get current positions
async function getCurrentPositions(brokerAccount) {
  try {
    const crypto = require('crypto');
    const API_KEY = brokerAccount.api_key;
    const API_SECRET = brokerAccount.api_secret;
    const BASE_URL = 'https://api.india.delta.exchange';

    function generateSignature(secret, prehashString) {
      return crypto.createHmac('sha256', secret).update(prehashString).digest('hex');
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'GET';
    const path = '/v2/positions/margined';
    const queryString = '';
    const payload = '';
    
    const prehashString = method + timestamp + path + queryString + payload;
    const signature = generateSignature(API_SECRET, prehashString);

    const headers = {
      'Accept': 'application/json',
      'api-key': API_KEY,
      'signature': signature,
      'timestamp': timestamp,
      'User-Agent': 'copy-trading-platform'
    };

    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: headers
    });

    if (response.ok) {
      const data = await response.json();
      return data.result?.filter(pos => parseFloat(pos.size) !== 0) || [];
    } else {
      console.log('❌ Failed to fetch positions:', await response.text());
      return [];
    }
  } catch (error) {
    console.log('❌ Error fetching positions:', error.message);
    return [];
  }
}

// Get copy trading status
app.get('/api/status', (req, res) => {
  try {
    const status = {
      masterTraders: copyEngine.masterTraders.size,
      followers: copyEngine.followers.size,
      copyRelationships: copyEngine.copyRelationships.size,
      totalTrades: copyEngine.tradeHistory.length,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Real-time monitor endpoint for positions
app.get('/api/real-time-monitor', async (req, res) => {
  try {
    // Completely silent - no logging at all
    // console.log('🔍 Backend real-time monitoring triggered');
    
    // Get active broker accounts
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      return res.json({
        success: true,
        message: 'No active broker accounts found',
        positions: [],
        timestamp: new Date().toISOString()
      });
    }

    const brokerAccount = brokerAccounts[0];
    // Completely silent - no logging at all
    // console.log(`🔍 Backend real-time monitoring triggered for broker: ${brokerAccount.id}`);

    // Get current positions
    const positions = await getCurrentPositions(brokerAccount);
    
    // Get recent trades for context
    const { data: recentTrades, error: tradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .order('entry_time', { ascending: false })
      .limit(10);

    const copyResults = recentTrades?.map(trade => ({
      symbol: trade.original_symbol,
      side: trade.original_side,
      size: trade.original_size,
      status: trade.status,
      timestamp: trade.entry_time
    })) || [];

    const result = {
      success: true,
      message: 'Real-time monitoring completed',
      broker_id: brokerAccount.id,
      total_trades_found: copyResults.length,
      active_followers: copyEngine.followers.size,
      trades_copied: copyResults.filter(t => t.status === 'executed').length,
      copy_results: copyResults,
      positions: positions,
      timestamp: new Date().toISOString()
    };

    // Completely silent - no logging at all
    // console.log('✅ Backend monitoring completed:', result);
    
    res.json(result);

  } catch (error) {
    console.error('❌ Error in real-time monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Copy trading engine is running',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down copy trading engine...');
  copyEngine.disconnect();
  process.exit(0);
});

app.listen(PORT, async () => {
  console.log(`🚀 Copy trading server running on port ${PORT}`);
  
  // Initialize copy trading after server starts
  setTimeout(initializeCopyTrading, 2000);
}); 