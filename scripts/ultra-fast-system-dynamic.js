require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

class UltraFastRealTimeTradingDynamic {
  constructor() {
    this.supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    this.pollingInterval = 2000; // 2 seconds for quiet mode
    this.lastMasterPositions = new Map();
    this.productIds = {}; // Will be populated dynamically
    this.followers = [];
    this.masterAccount = null;
    this.isRunning = false;
    this.pollCount = 0;
  }

  async initialize() {
    console.log('🚀 INITIALIZING DYNAMIC ULTRA-FAST REAL-TIME TRADING SYSTEM');
    
    // Load followers
    await this.loadFollowers();
    
    // Load master account
    await this.loadMasterAccount();
    
    // Initialize backend monitoring
    await this.initializeBackendMonitoring();
    
    // Load dynamic product IDs
    await this.loadDynamicProductIds();
    
    console.log('✅ Dynamic ultra-fast real-time trading system initialized successfully!');
  }

  async loadDynamicProductIds() {
    try {
      console.log('📡 Loading dynamic product IDs from India Delta Exchange API...');
      
      const response = await fetch('https://api.india.delta.exchange/v2/products');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(`API error: ${data.message || 'Unknown error'}`);
      }
      
      const products = data.result;
      const perpetualFutures = products.filter(product => 
        product.contract_type === 'perpetual_futures' && 
        product.state === 'live'
      );
      
      // Create symbol mapping
      perpetualFutures.forEach(product => {
        this.productIds[product.symbol] = product.id;
      });
      
      console.log(`✅ Loaded ${Object.keys(this.productIds).length} dynamic product IDs`);
      console.log('📊 Popular symbols:', Object.keys(this.productIds).slice(0, 10));
      
    } catch (error) {
      console.error('❌ Error loading dynamic product IDs:', error.message);
      // Fallback to hardcoded IDs for critical symbols
      this.productIds = {
        'BTCUSD': 27,
        'ETHUSD': 3136,
        'SOLUSD': 14823,
        'POLUSD': 39943,
        'ALGOUSD': 16617,
        'ADAUSD': 16614,
        'DOTUSD': 15304,
        'LINKUSD': 15041,
        'UNIUSD': 15303
      };
      console.log('🔄 Using fallback product IDs');
    }
  }

  async loadFollowers() {
    try {
      const { data: followers, error } = await this.supabase
        .from('followers')
        .select('*')
        .eq('account_status', 'active');

      if (error) throw error;

      this.followers = followers;
      console.log(`📋 Loaded ${followers.length} active follower(s)`);
      
      // Verify API credentials for each follower
      for (const follower of followers) {
        try {
          await this.verifyFollowerCredentials(follower);
          console.log(`✅ ${follower.follower_name}: API credentials verified`);
        } catch (error) {
          console.error(`❌ ${follower.follower_name}: API credentials failed - ${error.message}`);
        }
      }
    } catch (error) {
      console.error('❌ Error loading followers:', error.message);
      throw error;
    }
  }

  async loadMasterAccount() {
    try {
      const { data: brokerAccounts, error } = await this.supabase
        .from('broker_accounts')
        .select('*')
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;
      if (!brokerAccounts || brokerAccounts.length === 0) {
        throw new Error('No active master broker accounts found');
      }

      this.masterAccount = brokerAccounts[0];
      console.log(`📋 Master account loaded: ${this.masterAccount.broker_name || this.masterAccount.account_name}`);
    } catch (error) {
      console.error('❌ Error loading master account:', error.message);
      throw error;
    }
  }

  async initializeBackendMonitoring() {
    try {
      const response = await fetch('http://localhost:3001/api/real-time-monitor');
      if (!response.ok) {
        throw new Error(`Backend not responding: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Backend monitoring initialized');
      console.log(`   Recent trades: ${data.total_trades_found || 0}`);
      console.log(`   Current positions: ${data.positions?.length || 0}`);
      
      // Check follower balance
      if (this.followers.length > 0) {
        const balance = await this.getFollowerBalance(this.followers[0]);
        console.log(`   ${this.followers[0].follower_name} balance: $${balance}`);
      }
    } catch (error) {
      console.error('❌ Error initializing backend monitoring:', error.message);
      throw error;
    }
  }

  async verifyFollowerCredentials(follower) {
    try {
      const balance = await this.getFollowerBalance(follower);
      return balance > 0;
    } catch (error) {
      throw new Error(`Credential verification failed: ${error.message}`);
    }
  }

  async getFollowerBalance(follower) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/v2/wallet/balances';
      const prehashString = `GET${timestamp}${path}`;
      const signature = this.generateSignature(prehashString, follower.api_secret);

      const response = await fetch(`https://api.india.delta.exchange${path}`, {
        method: 'GET',
        headers: {
          'api-key': follower.api_key,
          'timestamp': timestamp.toString(),
          'signature': signature
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'API error');
      }

      // Find USD balance
      const usdBalance = data.result.find(balance => balance.asset_symbol === 'USD');
      return usdBalance ? parseFloat(usdBalance.wallet_balance) : 0;
    } catch (error) {
      throw new Error(`Balance fetch failed: ${error.message}`);
    }
  }

  generateSignature(message, secret) {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
  }

  async start() {
    console.log('🚀 STARTING DYNAMIC ULTRA-FAST REAL-TIME TRADING');
    console.log(`⚡ Polling interval: ${this.pollingInterval}ms (dynamic symbols)`);
    console.log('📡 Monitoring for instant trade detection and execution');
    console.log('🔄 Press Ctrl+C to stop');
    
    this.isRunning = true;
    this.ultraFastPoll();
  }

  async ultraFastPoll() {
    if (!this.isRunning) return;

    try {
      this.pollCount++;
      
      // Only log every 10th poll to reduce noise
      if (this.pollCount % 10 === 0) {
        const time = new Date().toLocaleTimeString();
        console.log(`⏰ ${time} - Dynamic monitoring active... (${Object.keys(this.productIds).length} symbols loaded)`);
      }

      await this.checkForPositionChangesViaBackend();
      await this.checkForNewTradesViaBackend();

    } catch (error) {
      console.error('❌ Error in ultra-fast poll:', error.message);
    }

    setTimeout(() => this.ultraFastPoll(), this.pollingInterval);
  }

  async checkForPositionChangesViaBackend() {
    try {
      const response = await fetch('http://localhost:3001/api/real-time-monitor');
      if (!response.ok) return;

      const data = await response.json();
      if (!data.success || !data.positions) return;

      const currentPositionsMap = new Map();
      data.positions.forEach(pos => {
        currentPositionsMap.set(pos.product_symbol, pos);
      });

      // Check for new positions or size changes
      for (const [symbol, position] of currentPositionsMap) {
        const lastPosition = this.lastMasterPositions.get(symbol);
        
        if (!lastPosition || Math.abs(position.size - lastPosition.size) > 0.001) {
          // New position or size changed
          const masterTrade = {
            symbol: symbol,
            side: position.size > 0 ? 'buy' : 'sell',
            size: Math.abs(position.size),
            price: position.entry_price,
            timestamp: new Date().toISOString()
          };

          await this.executeCopyTrades(masterTrade);
        }
      }

      // Check for closed positions
      for (const [symbol, lastPosition] of this.lastMasterPositions) {
        if (!currentPositionsMap.has(symbol)) {
          // Position was closed
          await this.closeFollowerPositions(symbol, lastPosition);
        }
      }

      this.lastMasterPositions = currentPositionsMap;

    } catch (error) {
      console.error('❌ Error checking position changes:', error.message);
    }
  }

  async checkForNewTradesViaBackend() {
    try {
      const response = await fetch('http://localhost:3001/api/real-time-monitor');
      if (!response.ok) return;

      const data = await response.json();
      if (!data.success || !data.copy_results) return;

      // Process recent trades that haven't been processed yet
      const recentTrades = data.copy_results.filter(trade => 
        trade.status === 'failed' && 
        new Date(trade.timestamp) > new Date(Date.now() - 60000) // Last minute
      );

      for (const trade of recentTrades) {
        await this.executeCopyTrades(trade);
      }

    } catch (error) {
      console.error('❌ Error checking new trades:', error.message);
    }
  }

  async executeCopyTrades(masterTrade) {
    if (!this.productIds[masterTrade.symbol]) {
      console.log(`⚠️ Symbol ${masterTrade.symbol} not found in product IDs`);
      return;
    }

    for (const follower of this.followers) {
      try {
        const copySize = await this.calculateCopySizeWithBalance(follower, masterTrade);
        if (copySize <= 0) {
          console.log(`⚠️ Insufficient balance for ${follower.follower_name} to copy ${masterTrade.symbol}`);
          continue;
        }

        const orderResult = await this.placeCopyOrder(follower, masterTrade, copySize);
        
        if (orderResult.success) {
          await this.saveCopyTrade(masterTrade, follower, copySize, 'executed');
          console.log(`✅ Copied ${masterTrade.symbol} ${masterTrade.side} ${copySize} for ${follower.follower_name}`);
        } else {
          await this.saveCopyTrade(masterTrade, follower, copySize, 'failed', orderResult.error);
          console.log(`❌ Failed to copy ${masterTrade.symbol} for ${follower.follower_name}: ${orderResult.error}`);
        }

      } catch (error) {
        console.error(`❌ Error executing copy trade for ${follower.follower_name}:`, error.message);
        await this.saveCopyTrade(masterTrade, follower, 0, 'failed', error.message);
      }
    }
  }

  async calculateCopySizeWithBalance(follower, masterTrade) {
    try {
      const balance = await this.getFollowerBalance(follower);
      const estimatedMarginPerContract = 0.1; // Conservative estimate
      const maxContracts = Math.floor(balance / estimatedMarginPerContract);
      
      // Apply follower's copy ratio
      const baseSize = masterTrade.size * (follower.copy_ratio || 1);
      const finalSize = Math.min(baseSize, maxContracts);
      
      return Math.max(0.01, finalSize); // Minimum 0.01
    } catch (error) {
      console.error(`❌ Error calculating copy size for ${follower.follower_name}:`, error.message);
      return 0;
    }
  }

  async placeCopyOrder(follower, masterTrade, copySize) {
    try {
      const productId = this.productIds[masterTrade.symbol];
      if (!productId) {
        return { success: false, error: `Product ID not found for ${masterTrade.symbol}` };
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const orderData = {
        product_id: productId,
        size: Math.max(1, Math.ceil(copySize * 10)), // Convert to contract units
        side: masterTrade.side,
        order_type: 'market_order',
        time_in_force: 'gtc'
      };

      const path = '/v2/orders';
      const message = `POST${timestamp}${path}${JSON.stringify(orderData)}`;
      const signature = this.generateSignature(message, follower.api_secret);

      const response = await fetch(`https://api.india.delta.exchange${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': follower.api_key,
          'timestamp': timestamp.toString(),
          'signature': signature
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, orderId: data.result.id };
      } else {
        return { success: false, error: data.message || 'Order placement failed' };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async closeFollowerPositions(symbol, masterPosition) {
    for (const follower of this.followers) {
      try {
        const followerPositions = await this.getFollowerPositions(follower, symbol);
        
        for (const position of followerPositions) {
          if (Math.abs(position.size) > 0.001) {
            await this.placeCloseOrder(follower, position);
          }
        }
      } catch (error) {
        console.error(`❌ Error closing positions for ${follower.follower_name}:`, error.message);
      }
    }
  }

  async getFollowerPositions(follower, symbol) {
    try {
      const productId = this.productIds[symbol];
      if (!productId) return [];

      const timestamp = Math.floor(Date.now() / 1000);
      const path = `/v2/positions?product_id=${productId}`;
      const prehashString = `GET${timestamp}${path}`;
      const signature = this.generateSignature(prehashString, follower.api_secret);

      const response = await fetch(`https://api.india.delta.exchange${path}`, {
        method: 'GET',
        headers: {
          'api-key': follower.api_key,
          'timestamp': timestamp.toString(),
          'signature': signature
        }
      });

      if (!response.ok) return [];

      const data = await response.json();
      if (!data.success) return [];

      return Array.isArray(data.result) ? data.result : [data.result];

    } catch (error) {
      console.error(`❌ Error getting positions for ${follower.follower_name}:`, error.message);
      return [];
    }
  }

  async placeCloseOrder(follower, position) {
    try {
      const productId = this.productIds[position.product_symbol];
      if (!productId) {
        return { success: false, error: `Product ID not found for ${position.product_symbol}` };
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const orderData = {
        product_id: productId,
        size: Math.max(1, Math.ceil(Math.abs(parseFloat(position.size)) * 10)),
        side: position.size > 0 ? 'sell' : 'buy',
        order_type: 'market_order',
        time_in_force: 'gtc'
      };

      const path = '/v2/orders';
      const message = `POST${timestamp}${path}${JSON.stringify(orderData)}`;
      const signature = this.generateSignature(message, follower.api_secret);

      const response = await fetch(`https://api.india.delta.exchange${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': follower.api_key,
          'timestamp': timestamp.toString(),
          'signature': signature
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Closed ${position.product_symbol} position for ${follower.follower_name}`);
        return { success: true, orderId: data.result.id };
      } else {
        console.log(`❌ Failed to close position for ${follower.follower_name}: ${data.message}`);
        return { success: false, error: data.message };
      }

    } catch (error) {
      console.error(`❌ Error placing close order for ${follower.follower_name}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async saveCopyTrade(masterTrade, follower, copySize, status, errorMessage = null) {
    try {
      const copyTradeData = {
        master_trade_id: masterTrade.timestamp, // Using timestamp as trade ID
        follower_id: follower.user_id,
        symbol: masterTrade.symbol,
        side: masterTrade.side,
        copied_size: copySize,
        copied_price: masterTrade.price || 0,
        status: status,
        entry_time: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('copy_trades')
        .insert(copyTradeData);

      if (error) {
        console.error('❌ Error saving copy trade to database:', error);
      }
    } catch (error) {
      console.error('❌ Error saving copy trade:', error.message);
    }
  }

  stop() {
    console.log('\n🛑 Stopping dynamic ultra-fast real-time trading system...');
    this.isRunning = false;
  }
}

// Start the system
async function main() {
  const system = new UltraFastRealTimeTradingDynamic();
  
  try {
    await system.initialize();
    await system.start();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      system.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start system:', error.message);
    process.exit(1);
  }
}

main().catch(console.error); 