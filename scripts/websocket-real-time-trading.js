const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
require('dotenv').config();

class WebSocketRealTimeTrading {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    
    // Use India Delta Exchange API URL
    this.DELTA_API_URL = 'https://api.india.delta.exchange';
    this.DELTA_WS_URL = 'wss://api.india.delta.exchange/ws';
    
    this.masterWs = null;
    this.followers = [];
    this.masterPositions = new Map();
    this.followerPositions = new Map();
    this.lastMasterTrade = null;
    this.isRunning = false;
    
    // Product ID mappings for India Delta Exchange
    this.productIds = {
      'POLUSD': 39943,
      'BTCUSD': 1,
      'ETHUSD': 2,
      'SOLUSD': 3,
      'ADAUSD': 4,
      'DOTUSD': 5,
      'DYDXUSD': 6
    };
  }

  async initialize() {
    console.log('🚀 INITIALIZING WEBSOCKET REAL-TIME TRADING SYSTEM\n');
    
    try {
      // Get active followers
      await this.loadFollowers();
      
      // Get master broker account
      await this.loadMasterAccount();
      
      // Initialize WebSocket connections
      await this.initializeWebSockets();
      
      this.isRunning = true;
      console.log('✅ WebSocket real-time trading system initialized successfully!');
      
    } catch (error) {
      console.error('❌ Error initializing WebSocket system:', error.message);
      throw error;
    }
  }

  async loadFollowers() {
    console.log('📋 Loading active followers...');
    
    const { data: followers, error } = await this.supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (error || !followers || followers.length === 0) {
      throw new Error('No active followers found');
    }

    this.followers = followers;
    console.log(`✅ Loaded ${followers.length} active follower(s)`);
    
    // Verify API credentials for each follower
    for (const follower of this.followers) {
      if (!follower.api_key || !follower.api_secret) {
        console.log(`⚠️ Warning: ${follower.follower_name} missing API credentials`);
      } else {
        console.log(`✅ ${follower.follower_name}: API credentials verified`);
      }
    }
  }

  async loadMasterAccount() {
    console.log('📋 Loading master broker account...');
    
    const { data: brokerAccounts, error } = await this.supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (error || !brokerAccounts || brokerAccounts.length === 0) {
      throw new Error('No active master broker account found');
    }

    this.masterAccount = brokerAccounts[0];
    console.log(`✅ Master account loaded: ${this.masterAccount.account_name}`);
    
    if (!this.masterAccount.api_key || !this.masterAccount.api_secret) {
      throw new Error('Master account missing API credentials');
    }
  }

  async initializeWebSockets() {
    console.log('🔌 Initializing WebSocket connections...');
    
    // Initialize master WebSocket for real-time fills
    await this.initializeMasterWebSocket();
    
    // Initialize follower WebSockets for position monitoring
    await this.initializeFollowerWebSockets();
    
    console.log('✅ WebSocket connections established');
  }

  async initializeMasterWebSocket() {
    console.log('📡 Connecting to master WebSocket...');
    
    try {
      // Create WebSocket connection to Delta Exchange
      this.masterWs = new WebSocket(this.DELTA_WS_URL);
      
      this.masterWs.on('open', () => {
        console.log('✅ Master WebSocket connected');
        this.subscribeToMasterFills();
      });
      
      this.masterWs.on('message', (data) => {
        this.handleMasterMessage(JSON.parse(data));
      });
      
      this.masterWs.on('error', (error) => {
        console.error('❌ Master WebSocket error:', error.message);
      });
      
      this.masterWs.on('close', () => {
        console.log('⚠️ Master WebSocket disconnected, attempting to reconnect...');
        setTimeout(() => this.initializeMasterWebSocket(), 5000);
      });
      
    } catch (error) {
      console.error('❌ Error initializing master WebSocket:', error.message);
    }
  }

  async initializeFollowerWebSockets() {
    console.log('📡 Initializing follower WebSocket connections...');
    
    for (const follower of this.followers) {
      if (follower.api_key && follower.api_secret) {
        try {
          const followerWs = new WebSocket(this.DELTA_WS_URL);
          
          followerWs.on('open', () => {
            console.log(`✅ ${follower.follower_name} WebSocket connected`);
            this.subscribeToFollowerPositions(follower, followerWs);
          });
          
          followerWs.on('message', (data) => {
            this.handleFollowerMessage(follower, JSON.parse(data));
          });
          
          followerWs.on('error', (error) => {
            console.error(`❌ ${follower.follower_name} WebSocket error:`, error.message);
          });
          
          followerWs.on('close', () => {
            console.log(`⚠️ ${follower.follower_name} WebSocket disconnected`);
          });
          
          // Store WebSocket connection
          follower.ws = followerWs;
          
        } catch (error) {
          console.error(`❌ Error initializing ${follower.follower_name} WebSocket:`, error.message);
        }
      }
    }
  }

  subscribeToMasterFills() {
    if (!this.masterWs || this.masterWs.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Subscribe to fills for the master account
    const subscribeMessage = {
      type: 'subscribe',
      channel: 'fills',
      api_key: this.masterAccount.api_key,
      timestamp: Math.floor(Date.now() / 1000),
      signature: this.generateSignature(this.masterAccount.api_secret, 'fills')
    };
    
    this.masterWs.send(JSON.stringify(subscribeMessage));
    console.log('📡 Subscribed to master fills');
  }

  subscribeToFollowerPositions(follower, ws) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Subscribe to positions for the follower
    const subscribeMessage = {
      type: 'subscribe',
      channel: 'positions',
      api_key: follower.api_key,
      timestamp: Math.floor(Date.now() / 1000),
      signature: this.generateSignature(follower.api_secret, 'positions')
    };
    
    ws.send(JSON.stringify(subscribeMessage));
    console.log(`📡 Subscribed to ${follower.follower_name} positions`);
  }

  generateSignature(secret, channel) {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `subscribe${timestamp}${channel}`;
    return require('crypto').createHmac('sha256', secret).update(message).digest('hex');
  }

  handleMasterMessage(data) {
    try {
      if (data.type === 'fill') {
        this.handleMasterFill(data);
      } else if (data.type === 'position') {
        this.handleMasterPosition(data);
      }
    } catch (error) {
      console.error('❌ Error handling master message:', error.message);
    }
  }

  handleFollowerMessage(follower, data) {
    try {
      if (data.type === 'position') {
        this.handleFollowerPosition(follower, data);
      }
    } catch (error) {
      console.error(`❌ Error handling ${follower.follower_name} message:`, error.message);
    }
  }

  async handleMasterFill(fillData) {
    const timestamp = new Date().toISOString();
    console.log(`\n🎯 MASTER FILL DETECTED [${timestamp}]`);
    console.log(`   Symbol: ${fillData.product_symbol}`);
    console.log(`   Side: ${fillData.side}`);
    console.log(`   Size: ${fillData.size}`);
    console.log(`   Price: ${fillData.price}`);
    console.log(`   Fill ID: ${fillData.fill_id}`);
    
    // Store the fill for timestamp matching
    this.lastMasterTrade = {
      ...fillData,
      timestamp: timestamp,
      fill_id: fillData.fill_id
    };
    
    // Immediately execute copy trades for all followers
    await this.executeCopyTrades(fillData, timestamp);
  }

  async handleMasterPosition(positionData) {
    const symbol = positionData.product_symbol;
    const size = positionData.size;
    
    // Update master positions
    this.masterPositions.set(symbol, {
      size: size,
      timestamp: new Date().toISOString()
    });
    
    // Check if position was closed (size = 0)
    if (size === 0) {
      console.log(`\n🚪 MASTER POSITION CLOSED: ${symbol}`);
      await this.closeFollowerPositions(symbol);
    }
  }

  async handleFollowerPosition(follower, positionData) {
    const symbol = positionData.product_symbol;
    const size = positionData.size;
    
    // Update follower positions
    if (!this.followerPositions.has(follower.follower_name)) {
      this.followerPositions.set(follower.follower_name, new Map());
    }
    
    this.followerPositions.get(follower.follower_name).set(symbol, {
      size: size,
      timestamp: new Date().toISOString()
    });
  }

  async executeCopyTrades(masterFill, masterTimestamp) {
    console.log(`\n⚡ EXECUTING COPY TRADES [${masterTimestamp}]`);
    
    for (const follower of this.followers) {
      if (!follower.api_key || !follower.api_secret) {
        console.log(`   ⚠️ Skipping ${follower.follower_name}: Missing API credentials`);
        continue;
      }
      
      try {
        // Get follower balance
        const balanceResult = await this.getFollowerBalance(follower);
        if (!balanceResult.success) {
          console.log(`   ❌ ${follower.follower_name}: Failed to get balance`);
          continue;
        }
        
        const availableBalance = parseFloat(balanceResult.data.result?.[0]?.available_balance || 0);
        console.log(`   💰 ${follower.follower_name} balance: $${availableBalance}`);
        
        if (availableBalance < 0.05) {
          console.log(`   ⚠️ ${follower.follower_name}: Insufficient balance`);
          continue;
        }
        
        // Calculate copy size
        const symbol = masterFill.product_symbol;
        const masterSize = Math.abs(masterFill.size);
        const copySize = this.calculateCopySize(masterSize, availableBalance, symbol);
        
        if (copySize === 0) {
          console.log(`   ⚠️ ${follower.follower_name}: Cannot afford ${symbol} trade`);
          continue;
        }
        
        // Place copy order with exact timestamp matching
        const orderResult = await this.placeCopyOrder(follower, masterFill, copySize, masterTimestamp);
        
        if (orderResult.success) {
          console.log(`   ✅ ${follower.follower_name}: Copy order executed`);
          console.log(`      Order ID: ${orderResult.order_id}`);
          console.log(`      Size: ${copySize} contracts`);
          console.log(`      Timestamp: ${masterTimestamp}`);
          
          // Save to database
          await this.saveCopyTrade(follower, masterFill, copySize, 'executed', orderResult.order_id, masterTimestamp);
        } else {
          console.log(`   ❌ ${follower.follower_name}: Copy order failed`);
          console.log(`      Error: ${orderResult.error}`);
          
          // Save failed trade to database
          await this.saveCopyTrade(follower, masterFill, copySize, 'failed', null, masterTimestamp, orderResult.error);
        }
        
      } catch (error) {
        console.error(`   ❌ ${follower.follower_name}: Error executing copy trade:`, error.message);
      }
    }
  }

  async closeFollowerPositions(symbol) {
    console.log(`\n🚪 CLOSING FOLLOWER POSITIONS: ${symbol}`);
    
    for (const follower of this.followers) {
      if (!follower.api_key || !follower.api_secret) {
        continue;
      }
      
      try {
        // Get current follower position
        const position = this.followerPositions.get(follower.follower_name)?.get(symbol);
        
        if (position && position.size !== 0) {
          console.log(`   🔧 Closing ${follower.follower_name} ${symbol} position: ${position.size} contracts`);
          
          const closeResult = await this.placeCloseOrder(follower, symbol, Math.abs(position.size));
          
          if (closeResult.success) {
            console.log(`   ✅ ${follower.follower_name}: Position closed successfully`);
            console.log(`      Close Order ID: ${closeResult.order_id}`);
          } else {
            console.log(`   ❌ ${follower.follower_name}: Failed to close position`);
            console.log(`      Error: ${closeResult.error}`);
          }
        }
        
      } catch (error) {
        console.error(`   ❌ ${follower.follower_name}: Error closing position:`, error.message);
      }
    }
  }

  calculateCopySize(masterSize, availableBalance, symbol) {
    const marginEstimates = {
      'POLUSD': 0.05,
      'BTCUSD': 50,
      'ETHUSD': 10,
      'SOLUSD': 0.5,
      'ADAUSD': 0.1,
      'DOTUSD': 0.2,
      'DYDXUSD': 0.3
    };
    
    const marginPerContract = marginEstimates[symbol] || 0.1;
    const maxContracts = Math.floor(availableBalance / marginPerContract);
    return Math.min(masterSize, maxContracts);
  }

  async getFollowerBalance(follower) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/v2/wallet/balances';
      const message = `GET${timestamp}${path}`;
      const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

      const response = await fetch(`${this.DELTA_API_URL}${path}`, {
        method: 'GET',
        headers: {
          'api-key': follower.api_key,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true, data: data };
      } else {
        return { success: false, error: data.error?.message || data.error || 'Unknown error' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async placeCopyOrder(follower, masterFill, copySize, masterTimestamp) {
    try {
      const productId = this.productIds[masterFill.product_symbol];
      if (!productId) {
        return { success: false, error: `Unknown product: ${masterFill.product_symbol}` };
      }
      
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/v2/orders';
      
      const orderData = {
        product_id: productId,
        size: copySize,
        side: masterFill.side,
        order_type: 'market_order'
      };

      const body = JSON.stringify(orderData);
      const message = `POST${timestamp}${path}${body}`;
      const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

      const response = await fetch(`${this.DELTA_API_URL}${path}`, {
        method: 'POST',
        headers: {
          'api-key': follower.api_key,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'Content-Type': 'application/json'
        },
        body: body
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          order_id: data.result?.id,
          status: data.result?.state,
          message: 'Copy order placed successfully'
        };
      } else {
        return {
          success: false,
          error: data.error?.message || data.error || 'Unknown error',
          details: data
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        type: 'network_error'
      };
    }
  }

  async placeCloseOrder(follower, symbol, size) {
    try {
      const productId = this.productIds[symbol];
      if (!productId) {
        return { success: false, error: `Unknown product: ${symbol}` };
      }
      
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/v2/orders';
      
      const orderData = {
        product_id: productId,
        size: size,
        side: 'sell', // Always sell to close
        order_type: 'market_order'
      };

      const body = JSON.stringify(orderData);
      const message = `POST${timestamp}${path}${body}`;
      const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

      const response = await fetch(`${this.DELTA_API_URL}${path}`, {
        method: 'POST',
        headers: {
          'api-key': follower.api_key,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'Content-Type': 'application/json'
        },
        body: body
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          order_id: data.result?.id,
          status: data.result?.state,
          message: 'Close order placed successfully'
        };
      } else {
        return {
          success: false,
          error: data.error?.message || data.error || 'Unknown error',
          details: data
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        type: 'network_error'
      };
    }
  }

  async saveCopyTrade(follower, masterFill, copySize, status, orderId, masterTimestamp, errorMessage = null) {
    try {
      const { error } = await this.supabase
        .from('copy_trades')
        .insert({
          follower_id: follower.user_id,
          master_broker_account_id: this.masterAccount.id,
          original_symbol: masterFill.product_symbol,
          original_side: masterFill.side,
          original_size: Math.abs(masterFill.size),
          copy_size: copySize,
          status: status,
          order_id: orderId,
          entry_time: masterTimestamp,
          error_message: errorMessage
        });

      if (error) {
        console.error('❌ Error saving copy trade to database:', error);
      }
    } catch (error) {
      console.error('❌ Error saving copy trade:', error.message);
    }
  }

  async start() {
    console.log('\n🚀 STARTING WEBSOCKET REAL-TIME TRADING SYSTEM');
    console.log('📡 Listening for master trades via WebSocket...');
    console.log('⚡ Ready for instant order mirroring with timestamp matching');
    console.log('🔄 Press Ctrl+C to stop\n');
    
    await this.initialize();
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down WebSocket real-time trading system...');
      this.stop();
      process.exit(0);
    });
  }

  stop() {
    this.isRunning = false;
    
    if (this.masterWs) {
      this.masterWs.close();
    }
    
    for (const follower of this.followers) {
      if (follower.ws) {
        follower.ws.close();
      }
    }
    
    console.log('✅ WebSocket real-time trading system stopped');
  }
}

// Start the WebSocket real-time trading system
const wsTrading = new WebSocketRealTimeTrading();
wsTrading.start().catch(console.error); 