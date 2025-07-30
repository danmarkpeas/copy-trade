const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class UltraFastRealTimeTrading {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    
    // Use India Delta Exchange API URL
    this.DELTA_API_URL = 'https://api.india.delta.exchange';
    
    this.followers = [];
    this.masterAccount = null;
    this.lastMasterTradeId = null;
    this.lastMasterPositionHash = null;
    this.isRunning = false;
    this.pollingInterval = 1000; // 1 second polling for ultra-fast response
    
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
    
    // Track processed trades to avoid duplicates
    this.processedTrades = new Set();
  }

  async initialize() {
    console.log('🚀 INITIALIZING ULTRA-FAST REAL-TIME TRADING SYSTEM\n');
    
    try {
      // Get active followers
      await this.loadFollowers();
      
      // Get master broker account
      await this.loadMasterAccount();
      
      // Initialize with current state
      await this.initializeCurrentState();
      
      this.isRunning = true;
      console.log('✅ Ultra-fast real-time trading system initialized successfully!');
      
    } catch (error) {
      console.error('❌ Error initializing ultra-fast system:', error.message);
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

  async initializeCurrentState() {
    console.log('📋 Initializing current state...');
    
    try {
      // Get current master positions
      const masterPositions = await this.getMasterPositions();
      this.lastMasterPositionHash = this.hashPositions(masterPositions);
      
      // Get recent master trades
      const recentTrades = await this.getRecentMasterTrades();
      if (recentTrades.length > 0) {
        this.lastMasterTradeId = recentTrades[0].id;
      }
      
      console.log(`✅ Current state initialized`);
      console.log(`   Master positions: ${masterPositions.length}`);
      console.log(`   Recent trades: ${recentTrades.length}`);
      
    } catch (error) {
      console.error('❌ Error initializing current state:', error.message);
    }
  }

  async getMasterPositions() {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/v2/positions';
      const message = `GET${timestamp}${path}`;
      const signature = require('crypto').createHmac('sha256', this.masterAccount.api_secret).update(message).digest('hex');

      const response = await fetch(`${this.DELTA_API_URL}${path}`, {
        method: 'GET',
        headers: {
          'api-key': this.masterAccount.api_key,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.result || [];
      } else {
        console.log(`❌ Failed to get master positions: ${data.error?.message || 'Unknown error'}`);
        return [];
      }
    } catch (error) {
      console.log(`❌ Error getting master positions: ${error.message}`);
      return [];
    }
  }

  async getRecentMasterTrades() {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/v2/fills';
      const message = `GET${timestamp}${path}`;
      const signature = require('crypto').createHmac('sha256', this.masterAccount.api_secret).update(message).digest('hex');

      const response = await fetch(`${this.DELTA_API_URL}${path}?limit=10`, {
        method: 'GET',
        headers: {
          'api-key': this.masterAccount.api_key,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.result || [];
      } else {
        console.log(`❌ Failed to get recent master trades: ${data.error?.message || 'Unknown error'}`);
        return [];
      }
    } catch (error) {
      console.log(`❌ Error getting recent master trades: ${error.message}`);
      return [];
    }
  }

  hashPositions(positions) {
    return require('crypto').createHash('md5').update(JSON.stringify(positions)).digest('hex');
  }

  async startPolling() {
    console.log('\n🚀 STARTING ULTRA-FAST REAL-TIME TRADING');
    console.log(`⚡ Polling interval: ${this.pollingInterval}ms (ultra-fast)`);
    console.log('📡 Monitoring for instant trade detection and execution');
    console.log('🔄 Press Ctrl+C to stop\n');
    
    await this.initialize();
    
    // Start ultra-fast polling
    this.pollingTimer = setInterval(async () => {
      if (this.isRunning) {
        await this.pollForChanges();
      }
    }, this.pollingInterval);
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down ultra-fast real-time trading system...');
      this.stop();
      process.exit(0);
    });
  }

  async pollForChanges() {
    try {
      const timestamp = new Date().toISOString();
      
      // Check for new trades (ultra-fast)
      await this.checkForNewTrades(timestamp);
      
      // Check for position changes (ultra-fast)
      await this.checkForPositionChanges(timestamp);
      
    } catch (error) {
      console.error('❌ Error in polling cycle:', error.message);
    }
  }

  async checkForNewTrades(timestamp) {
    try {
      const recentTrades = await this.getRecentMasterTrades();
      
      if (recentTrades.length === 0) {
        return;
      }
      
      // Find new trades since last check
      const newTrades = recentTrades.filter(trade => {
        const tradeId = trade.id || trade.fill_id;
        return tradeId && !this.processedTrades.has(tradeId);
      });
      
      if (newTrades.length > 0) {
        console.log(`\n🎯 NEW MASTER TRADES DETECTED [${timestamp}]`);
        console.log(`   Found ${newTrades.length} new trade(s)`);
        
        // Process each new trade immediately
        for (const trade of newTrades) {
          await this.processNewTrade(trade, timestamp);
          this.processedTrades.add(trade.id || trade.fill_id);
        }
      }
      
    } catch (error) {
      console.error('❌ Error checking for new trades:', error.message);
    }
  }

  async checkForPositionChanges(timestamp) {
    try {
      const currentPositions = await this.getMasterPositions();
      const currentHash = this.hashPositions(currentPositions);
      
      if (currentHash !== this.lastMasterPositionHash) {
        console.log(`\n🔄 MASTER POSITION CHANGE DETECTED [${timestamp}]`);
        
        // Analyze position changes
        await this.analyzePositionChanges(currentPositions, timestamp);
        
        this.lastMasterPositionHash = currentHash;
      }
      
    } catch (error) {
      console.error('❌ Error checking for position changes:', error.message);
    }
  }

  async processNewTrade(trade, timestamp) {
    console.log(`\n⚡ PROCESSING NEW TRADE [${timestamp}]`);
    console.log(`   Symbol: ${trade.product_symbol}`);
    console.log(`   Side: ${trade.side}`);
    console.log(`   Size: ${trade.size}`);
    console.log(`   Price: ${trade.price}`);
    console.log(`   Trade ID: ${trade.id || trade.fill_id}`);
    
    // Immediately execute copy trades for all followers
    await this.executeCopyTrades(trade, timestamp);
  }

  async analyzePositionChanges(currentPositions, timestamp) {
    console.log(`\n📊 ANALYZING POSITION CHANGES [${timestamp}]`);
    
    // Check for closed positions
    for (const position of currentPositions) {
      if (position.size === 0) {
        console.log(`   🚪 Position closed: ${position.product_symbol}`);
        await this.closeFollowerPositions(position.product_symbol, timestamp);
      }
    }
    
    // Check for new positions
    const openPositions = currentPositions.filter(p => p.size !== 0);
    console.log(`   📈 Open positions: ${openPositions.length}`);
    
    for (const position of openPositions) {
      console.log(`      ${position.product_symbol}: ${position.size} contracts`);
    }
  }

  async executeCopyTrades(masterTrade, masterTimestamp) {
    console.log(`\n⚡ EXECUTING COPY TRADES [${masterTimestamp}]`);
    
    for (const follower of this.followers) {
      if (!follower.api_key || !follower.api_secret) {
        console.log(`   ⚠️ Skipping ${follower.follower_name}: Missing API credentials`);
        continue;
      }
      
      try {
        // Get follower balance (ultra-fast)
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
        const symbol = masterTrade.product_symbol;
        const masterSize = Math.abs(masterTrade.size);
        const copySize = this.calculateCopySize(masterSize, availableBalance, symbol);
        
        if (copySize === 0) {
          console.log(`   ⚠️ ${follower.follower_name}: Cannot afford ${symbol} trade`);
          continue;
        }
        
        // Place copy order with exact timestamp matching
        const orderResult = await this.placeCopyOrder(follower, masterTrade, copySize, masterTimestamp);
        
        if (orderResult.success) {
          console.log(`   ✅ ${follower.follower_name}: Copy order executed`);
          console.log(`      Order ID: ${orderResult.order_id}`);
          console.log(`      Size: ${copySize} contracts`);
          console.log(`      Timestamp: ${masterTimestamp}`);
          
          // Save to database
          await this.saveCopyTrade(follower, masterTrade, copySize, 'executed', orderResult.order_id, masterTimestamp);
        } else {
          console.log(`   ❌ ${follower.follower_name}: Copy order failed`);
          console.log(`      Error: ${orderResult.error}`);
          
          // Save failed trade to database
          await this.saveCopyTrade(follower, masterTrade, copySize, 'failed', null, masterTimestamp, orderResult.error);
        }
        
      } catch (error) {
        console.error(`   ❌ ${follower.follower_name}: Error executing copy trade:`, error.message);
      }
    }
  }

  async closeFollowerPositions(symbol, timestamp) {
    console.log(`\n🚪 CLOSING FOLLOWER POSITIONS: ${symbol} [${timestamp}]`);
    
    for (const follower of this.followers) {
      if (!follower.api_key || !follower.api_secret) {
        continue;
      }
      
      try {
        // Get current follower position
        const position = await this.getFollowerPosition(follower, symbol);
        
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

  async getFollowerPosition(follower, symbol) {
    try {
      const productId = this.productIds[symbol];
      if (!productId) {
        return null;
      }
      
      const timestamp = Math.floor(Date.now() / 1000);
      const path = `/v2/positions?product_id=${productId}`;
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
        const positions = Array.isArray(data.result) ? data.result : [data.result];
        return positions.find(p => p.product_symbol === symbol) || null;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  async placeCopyOrder(follower, masterTrade, copySize, masterTimestamp) {
    try {
      const productId = this.productIds[masterTrade.product_symbol];
      if (!productId) {
        return { success: false, error: `Unknown product: ${masterTrade.product_symbol}` };
      }
      
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/v2/orders';
      
      const orderData = {
        product_id: productId,
        size: copySize,
        side: masterTrade.side,
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

  async saveCopyTrade(follower, masterTrade, copySize, status, orderId, masterTimestamp, errorMessage = null) {
    try {
      const { error } = await this.supabase
        .from('copy_trades')
        .insert({
          follower_id: follower.user_id,
          master_broker_account_id: this.masterAccount.id,
          original_symbol: masterTrade.product_symbol,
          original_side: masterTrade.side,
          original_size: Math.abs(masterTrade.size),
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

  stop() {
    this.isRunning = false;
    
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
    
    console.log('✅ Ultra-fast real-time trading system stopped');
  }
}

// Start the ultra-fast real-time trading system
const ultraFastTrading = new UltraFastRealTimeTrading();
ultraFastTrading.startPolling().catch(console.error); 