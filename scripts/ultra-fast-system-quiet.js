const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class UltraFastSystemQuiet {
  constructor() {
    this.DELTA_API_URL = 'https://api.india.delta.exchange';
    this.BACKEND_URL = 'http://localhost:3001';
    this.isRunning = false;
    this.pollingTimer = null;
    this.followers = [];
    this.masterAccount = null;
    this.lastMasterPositions = new Map();
    this.lastMasterTrades = new Set();
    this.pollingInterval = 2000; // Increased to 2 seconds to reduce spam
    this.lastLogTime = 0;
    this.logInterval = 30000; // Only log status every 30 seconds
    
    // Dynamic product IDs - will be loaded from API
    this.productIds = {};

    // Supabase setup
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async initialize() {
    console.log('🚀 INITIALIZING QUIET ULTRA-FAST REAL-TIME TRADING SYSTEM');
    
    await this.loadDynamicProductIds();
    await this.loadMasterAccount(); // Load broker accounts first
    await this.loadFollowers(); // Then load followers that depend on broker accounts
    await this.initializeCurrentState();
    
    console.log('✅ Quiet ultra-fast real-time trading system initialized successfully!');
  }

  async loadDynamicProductIds() {
    try {
      console.log('📡 Loading dynamic product IDs from Delta Exchange API...');
      const response = await fetch(`${this.DELTA_API_URL}/v2/products`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.result || !Array.isArray(data.result)) {
        throw new Error('Invalid API response format');
      }
      
      // Filter for perpetual futures contracts that are live
      const perpetualFutures = data.result.filter(product => 
        product.contract_type === 'perpetual_futures' && 
        product.state === 'live'
      );
      
      // Create dynamic mapping
      this.productIds = {};
      perpetualFutures.forEach(product => {
        this.productIds[product.symbol] = product.id;
      });
      
      console.log(`✅ Loaded ${Object.keys(this.productIds).length} dynamic product IDs`);
      console.log(`📊 Available symbols: ${Object.keys(this.productIds).slice(0, 10).join(', ')}${Object.keys(this.productIds).length > 10 ? '...' : ''}`);
      
    } catch (error) {
      console.error('❌ Error loading dynamic product IDs:', error.message);
      throw error;
    }
  }

  async loadMasterAccount() {
    try {
      // Get ALL active broker accounts dynamically
      const { data: brokerAccounts, error } = await this.supabase
        .from('broker_accounts')
        .select('*')
        .eq('is_active', true)
        .eq('is_verified', true);

      if (error || !brokerAccounts || brokerAccounts.length === 0) {
        throw new Error('No active and verified broker accounts found');
      }

      // Use the first active broker account (or could implement logic to choose specific one)
      this.masterAccount = brokerAccounts[0];
      console.log(`📋 Master account loaded: ${this.masterAccount.account_name || 'Master'}`);
      console.log(`   Broker: ${this.masterAccount.broker_name}`);
      console.log(`   User ID: ${this.masterAccount.user_id}`);
      
      // Store all active broker accounts for multi-broker support
      this.allBrokerAccounts = brokerAccounts;
      console.log(`📊 Total active broker accounts: ${brokerAccounts.length}`);
      
    } catch (error) {
      console.error('❌ Error loading master account:', error.message);
      throw error;
    }
  }

  async loadFollowers() {
    try {
      // Ensure broker accounts are loaded first
      if (!this.allBrokerAccounts || this.allBrokerAccounts.length === 0) {
        throw new Error('No broker accounts loaded. Please load master accounts first.');
      }

      // Get ALL active followers for ALL active broker accounts
      const { data: followers, error } = await this.supabase
        .from('followers')
        .select('*')
        .eq('account_status', 'active');

      if (error || !followers || followers.length === 0) {
        throw new Error('No active followers found');
      }

      // Filter followers that are subscribed to any active broker account
      const activeBrokerIds = this.allBrokerAccounts.map(broker => broker.id);
      const activeFollowers = followers.filter(follower => 
        activeBrokerIds.includes(follower.master_broker_account_id)
      );

      if (activeFollowers.length === 0) {
        throw new Error('No followers found for active broker accounts');
      }

      this.followers = activeFollowers;
      console.log(`📋 Loaded ${activeFollowers.length} active follower(s) for ${activeBrokerIds.length} broker(s)`);
      
      // Verify API credentials for each follower
      for (const follower of this.followers) {
        if (follower.api_key && follower.api_secret) {
          console.log(`✅ ${follower.follower_name}: API credentials verified`);
        } else {
          console.log(`⚠️  ${follower.follower_name}: Missing API credentials`);
        }
      }
    } catch (error) {
      console.error('❌ Error loading followers:', error.message);
      throw error;
    }
  }

  async initializeCurrentState() {
    try {
      // Initialize state for ALL active broker accounts
      for (const brokerAccount of this.allBrokerAccounts) {
        const response = await fetch(`${this.BACKEND_URL}/api/real-time-monitor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ broker_id: brokerAccount.id })
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Initialize position tracking for this broker
          if (data.positions && data.positions.length > 0) {
            data.positions.forEach(pos => {
              const positionKey = `${brokerAccount.id}_${pos.product_symbol}`;
              this.lastMasterPositions.set(positionKey, pos);
            });
          }
          
          // Initialize trade tracking for this broker
          if (data.copy_results && data.copy_results.length > 0) {
            data.copy_results.forEach(trade => {
              const tradeKey = `${brokerAccount.id}_${trade.symbol}_${trade.side}_${trade.size}_${trade.timestamp}`;
              this.lastMasterTrades.add(tradeKey);
            });
          }
          
          console.log(`✅ Backend monitoring initialized for ${brokerAccount.account_name}`);
          console.log(`   Recent trades: ${data.copy_results?.length || 0}`);
          console.log(`   Current positions: ${data.positions?.length || 0}`);
        }
      }
      
      // Get follower balance for first follower
      if (this.followers.length > 0) {
        const balance = await this.getFollowerBalance(this.followers[0]);
        if (balance && balance.usd) {
          console.log(`   ${this.followers[0].follower_name} balance: $${balance.usd}`);
        }
      }
    } catch (error) {
      console.error('❌ Error initializing current state:', error.message);
    }
  }

  async startUltraFastPolling() {
    await this.initialize();
    
    this.isRunning = true;
    console.log(`\n🚀 STARTING QUIET ULTRA-FAST REAL-TIME TRADING`);
    console.log(`⚡ Polling interval: ${this.pollingInterval}ms (quiet mode)`);
    console.log(`📡 Monitoring for instant trade detection and execution`);
    console.log(`🔄 Press Ctrl+C to stop\n`);
    
    // Start polling
    this.pollingTimer = setInterval(() => {
      this.ultraFastPoll();
    }, this.pollingInterval);
  }

  async ultraFastPoll() {
    if (!this.isRunning) return;
    
    try {
      const timestamp = new Date().toISOString();
      
      // Only log status periodically
      const now = Date.now();
      if (now - this.lastLogTime > this.logInterval) {
        console.log(`⏰ ${new Date().toLocaleTimeString()} - Quiet monitoring active...`);
        this.lastLogTime = now;
      }
      
      // Check for new trades and position changes
      await this.checkForNewTradesViaBackend(timestamp);
      await this.checkForPositionChangesViaBackend(timestamp);
      
    } catch (error) {
      console.error('❌ Error in ultra-fast poll:', error.message);
    }
  }

  async checkForNewTradesViaBackend(timestamp) {
    try {
      // Monitor ALL active broker accounts dynamically
      for (const brokerAccount of this.allBrokerAccounts) {
        const response = await fetch(`${this.BACKEND_URL}/api/real-time-monitor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ broker_id: brokerAccount.id })
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (data.copy_results && data.copy_results.length > 0) {
          const newTrades = data.copy_results.filter(trade => {
            const tradeKey = `${brokerAccount.id}_${trade.symbol}_${trade.side}_${trade.size}_${trade.timestamp}`;
            return !this.lastMasterTrades.has(tradeKey);
          });
          
          if (newTrades.length > 0) {
            console.log(`\n🎯 NEW MASTER TRADES DETECTED [${timestamp}]`);
            console.log(`   Broker: ${brokerAccount.account_name}`);
            console.log(`   Found ${newTrades.length} new trade(s)`);
            
            for (const trade of newTrades) {
              console.log(`⚡ PROCESSING NEW TRADE [${timestamp}]`);
              console.log(`   Symbol: ${trade.symbol}`);
              console.log(`   Side: ${trade.side}`);
              console.log(`   Size: ${trade.size}`);
              console.log(`   Status: ${trade.status}`);
              
              // Only execute if the trade is not failed
              if (trade.status !== 'failed') {
                const masterTrade = {
                  symbol: trade.symbol,
                  side: trade.side,
                  size: trade.size,
                  price: trade.price || 0,
                  timestamp: trade.timestamp,
                  broker_id: brokerAccount.id
                };
                
                await this.executeCopyTrades(masterTrade, timestamp);
              }
              
              const tradeKey = `${brokerAccount.id}_${trade.symbol}_${trade.side}_${trade.size}_${trade.timestamp}`;
              this.lastMasterTrades.add(tradeKey);
            }
          }
        }
      }
    } catch (error) {
      // Silent error handling in quiet mode
    }
  }

  async checkForPositionChangesViaBackend(timestamp) {
    try {
      // Monitor ALL active broker accounts dynamically
      for (const brokerAccount of this.allBrokerAccounts) {
        const response = await fetch(`${this.BACKEND_URL}/api/real-time-monitor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ broker_id: brokerAccount.id })
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (data.positions && data.positions.length > 0) {
          const currentPositionsMap = new Map();
          data.positions.forEach(pos => {
            currentPositionsMap.set(`${brokerAccount.id}_${pos.product_symbol}`, pos);
          });

          // Check for NEW positions
          for (const [positionKey, currentPosition] of currentPositionsMap) {
            const lastPosition = this.lastMasterPositions.get(positionKey);
            if (!lastPosition || Math.abs(currentPosition.size) !== Math.abs(lastPosition.size)) {
              if (currentPosition.size !== 0) {
                const symbol = currentPosition.product_symbol;
                console.log(`\n🎯 NEW MASTER POSITION DETECTED: ${symbol} [${timestamp}]`);
                console.log(`   Broker: ${brokerAccount.account_name}`);
                console.log(`   Size: ${currentPosition.size}`);
                console.log(`   Entry Price: ${currentPosition.entry_price}`);
                console.log(`   Created: ${currentPosition.created_at}`);
                
                const masterTrade = {
                  symbol: symbol,
                  side: currentPosition.size > 0 ? 'buy' : 'sell',
                  size: Math.abs(currentPosition.size),
                  price: currentPosition.entry_price,
                  timestamp: timestamp,
                  broker_id: brokerAccount.id
                };
                
                await this.executeCopyTrades(masterTrade, timestamp);
              }
            }
          }

          // Check for CLOSED positions
          for (const [positionKey, lastPosition] of this.lastMasterPositions) {
            if (positionKey.startsWith(brokerAccount.id + '_')) {
              const currentPosition = currentPositionsMap.get(positionKey);
              if (!currentPosition || currentPosition.size === 0) {
                if (lastPosition.size !== 0) {
                  const symbol = lastPosition.product_symbol;
                  console.log(`\n🚪 MASTER POSITION CLOSED: ${symbol} [${timestamp}]`);
                  console.log(`   Broker: ${brokerAccount.account_name}`);
                  await this.closeFollowerPositions(symbol, timestamp);
                }
              }
            }
          }

          // Update last positions for this broker
          for (const [positionKey, position] of currentPositionsMap) {
            this.lastMasterPositions.set(positionKey, position);
          }
        } else {
          // Check if all positions were closed for this broker
          for (const [positionKey, lastPosition] of this.lastMasterPositions) {
            if (positionKey.startsWith(brokerAccount.id + '_') && lastPosition.size !== 0) {
              const symbol = lastPosition.product_symbol;
              console.log(`\n🚪 MASTER POSITION CLOSED: ${symbol} [${timestamp}]`);
              console.log(`   Broker: ${brokerAccount.account_name}`);
              await this.closeFollowerPositions(symbol, timestamp);
              this.lastMasterPositions.delete(positionKey);
            }
          }
        }
      }
    } catch (error) {
      // Silent error handling in quiet mode
    }
  }



  async executeCopyTrades(masterTrade, masterTimestamp) {
    console.log(`⚡ EXECUTING COPY TRADES [${masterTimestamp}]`);
    
    for (const follower of this.followers) {
      if (!follower.api_key || !follower.api_secret) {
        continue;
      }
      
      try {
        // Get follower balance
        const balance = await this.getFollowerBalance(follower);
        if (balance && balance.usd) {
          console.log(`   💰 ${follower.follower_name} balance: $${balance.usd}`);
          
          // Calculate copy size based on balance
          const copySize = this.calculateCopySize(masterTrade.size, parseFloat(balance.usd), masterTrade.symbol);
          
          if (copySize > 0) {
            const result = await this.placeCopyOrder(follower, masterTrade);
            
            if (result.success) {
              console.log(`   ✅ ${follower.follower_name}: Copy order executed`);
              console.log(`      Order ID: ${result.orderId}`);
              console.log(`      Size: ${copySize} contracts`);
              console.log(`      Timestamp: ${masterTimestamp}`);
              
              await this.saveCopyTrade(follower, masterTrade, copySize, 'executed', result.orderId, masterTimestamp);
            } else {
              console.log(`   ❌ ${follower.follower_name}: Copy order failed`);
              console.log(`      Error: ${result.error}`);
              
              await this.saveCopyTrade(follower, masterTrade, copySize, 'failed', null, masterTimestamp, result.error);
            }
          }
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
          
          const closeResult = await this.placeCloseOrder(follower, position);
          
          if (closeResult.success) {
            console.log(`   ✅ ${follower.follower_name}: Position closed successfully`);
            console.log(`      Close Order ID: ${closeResult.orderId}`);
          } else {
            console.log(`   ❌ ${follower.follower_name}: Failed to close position`);
            console.log(`      Error: ${closeResult.error}`);
            
            // If insufficient margin, try with smaller size
            if (closeResult.error && closeResult.error.includes('insufficient_margin')) {
              console.log(`   🔧 Retrying with reduced size due to insufficient margin...`);
              
              // Try closing with 1 contract at a time
              const originalSize = Math.abs(parseFloat(position.size));
              for (let i = 1; i <= Math.min(originalSize, 5); i++) { // Try up to 5 contracts
                const reducedPosition = { ...position, size: i * (position.size > 0 ? 1 : -1) };
                const retryResult = await this.placeCloseOrder(follower, reducedPosition);
                
                if (retryResult.success) {
                  console.log(`   ✅ Successfully closed ${i} contract(s)`);
                  break;
                } else {
                  console.log(`   ❌ Failed to close ${i} contract(s): ${retryResult.error}`);
                }
              }
            }
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
    const DELTA_API_URL = 'https://api.india.delta.exchange';
    
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/v2/wallet/balances';
      const message = `GET${timestamp}${path}`;
      const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

      const response = await fetch(`${DELTA_API_URL}${path}`, {
        method: 'GET',
        headers: {
          'api-key': follower.api_key,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success && data.result) {
        // Fix: Use asset_symbol instead of currency
        const usdBalance = data.result.find(b => b.asset_symbol === 'USD');
        return {
          usd: usdBalance ? usdBalance.available_balance : '0'
        };
      } else {
        return null;
      }
    } catch (error) {
      return null;
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
      
      if (response.ok && data.success && data.result) {
        const positions = Array.isArray(data.result) ? data.result : [data.result];
        const position = positions.find(pos => Math.abs(parseFloat(pos.size)) > 0);
        
        if (position) {
          // Ensure the position has the product_id field
          position.product_id = productId;
          position.product_symbol = symbol;
          return position;
        }
        return null;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  async placeCopyOrder(follower, trade) {
    const DELTA_API_URL = 'https://api.india.delta.exchange';
    
    try {
      const productId = this.productIds[trade.symbol];
      if (!productId) {
        return { success: false, error: 'Invalid symbol' };
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/v2/orders';
      
      const orderData = {
        product_id: productId,
        size: trade.size,
        side: trade.side,
        order_type: 'market_order',
        time_in_force: 'gtc'
      };

      // Fix: Include request body in signature for POST requests
      const message = `POST${timestamp}${path}${JSON.stringify(orderData)}`;
      const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

      const response = await fetch(`${DELTA_API_URL}${path}`, {
        method: 'POST',
        headers: {
          'api-key': follower.api_key,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          orderId: data.result.id,
          status: data.result.state
        };
      } else {
        return {
          success: false,
          error: data.error?.code || data.message || 'Unknown error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async placeCloseOrder(follower, position) {
    const DELTA_API_URL = 'https://api.india.delta.exchange';
    
    try {
      // Use the actual product_id from the position
      const productId = position.product_id;
      if (!productId) {
        return { success: false, error: `No product ID found in position` };
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/v2/orders';
      
      const orderData = {
        product_id: productId,
        size: Math.abs(parseFloat(position.size)),
        side: position.size > 0 ? 'sell' : 'buy',
        order_type: 'market_order',
        time_in_force: 'gtc'
      };

      // Fix: Include request body in signature for POST requests
      const message = `POST${timestamp}${path}${JSON.stringify(orderData)}`;
      const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

      const response = await fetch(`${DELTA_API_URL}${path}`, {
        method: 'POST',
        headers: {
          'api-key': follower.api_key,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          orderId: data.result.id,
          status: data.result.state
        };
      } else {
        return {
          success: false,
          error: data.error?.code || data.message || 'Unknown error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async saveCopyTrade(follower, masterTrade, copySize, status, orderId, masterTimestamp, errorMessage = null) {
    try {
      const tradeData = {
        master_trade_id: masterTrade.symbol + '_' + Date.now() + '_' + Math.random(),
        follower_id: follower.user_id, // Fix: Use user_id instead of id
        follower_order_id: orderId,
        original_symbol: masterTrade.symbol,
        original_side: masterTrade.side,
        original_size: masterTrade.size,
        original_price: masterTrade.price || 0,
        copied_size: copySize,
        copied_price: masterTrade.price || 0,
        status: status,
        entry_time: new Date(masterTimestamp).toISOString(),
        exit_time: null,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('copy_trades')
        .insert(tradeData)
        .select();

      if (error) {
        console.error('❌ Error saving copy trade to database:', error);
      } else {
        console.log(`✅ Copy trade saved to database: ${data[0]?.id}`);
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
    
    console.log('✅ Quiet ultra-fast real-time trading system stopped');
  }
}

// Start the quiet ultra-fast real-time trading system
const ultraFastSystemQuiet = new UltraFastSystemQuiet();
ultraFastSystemQuiet.startUltraFastPolling().catch(console.error); 