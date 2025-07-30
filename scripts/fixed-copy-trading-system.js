const DeltaExchangeCopyTrader = require('../services/DeltaExchangeCopyTrader');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class FixedCopyTradingSystem {
  constructor() {
    this.copyTrader = null;
    this.isRunning = false;
    this.stats = {
      totalTrades: 0,
      successfulCopies: 0,
      failedCopies: 0,
      startTime: Date.now()
    };
  }

  async initialize() {
    console.log('🚀 Initializing Fixed Copy Trading System...\n');
    
    try {
      // Get broker accounts
      const { data: brokerAccounts, error: brokerError } = await supabase
        .from('broker_accounts')
        .select('*')
        .eq('is_active', true)
        .eq('is_verified', true)
        .limit(1);

      if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
        console.log('❌ No active broker accounts found');
        return false;
      }

      const broker = brokerAccounts[0];
      console.log(`📊 Found broker: ${broker.account_name}`);
      
      // Get followers
      const { data: followers, error: followerError } = await supabase
        .from('followers')
        .select('*')
        .eq('master_broker_account_id', broker.id)
        .eq('account_status', 'active');

      if (followerError || !followers || followers.length === 0) {
        console.log('❌ No active followers found');
        return false;
      }

      console.log(`👥 Found ${followers.length} followers`);

      // Create configurations
      const brokerConfig = {
        api_key: broker.api_key,
        api_secret: broker.api_secret,
        name: broker.account_name,
        id: broker.id
      };

      const followerConfigs = followers.map(follower => ({
        api_key: follower.api_key,
        api_secret: follower.api_secret,
        name: follower.follower_name,
        id: follower.id,
        size_multiplier: follower.multiplier || 1.0
      }));

      // Create copy trader
      this.copyTrader = new DeltaExchangeCopyTrader(brokerConfig, followerConfigs);
      
      // Set up event listeners
      this.setupEventListeners();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      return false;
    }
  }

  setupEventListeners() {
    this.copyTrader.on('started', () => {
      console.log('✅ Copy trading system started');
      this.isRunning = true;
    });

    this.copyTrader.on('authenticated', () => {
      console.log('✅ WebSocket authenticated');
    });

    this.copyTrader.on('brokerTrade', (tradeData) => {
      console.log('🎯 Trade detected:', {
        symbol: tradeData.symbol,
        side: tradeData.side,
        size: tradeData.size,
        price: tradeData.average_fill_price
      });
      this.stats.totalTrades++;
    });

    this.copyTrader.on('tradeCopied', (data) => {
      console.log(`📈 Trade copied: ${data.follower} - ${data.side} ${data.size} ${data.symbol}`);
      this.stats.successfulCopies++;
      
      // Save to database
      this.saveCopyTrade(data);
    });

    this.copyTrader.on('positionClosed', (data) => {
      console.log(`📉 Position closed: ${data.follower} - ${data.symbol}`);
    });

    this.copyTrader.on('error', (error) => {
      console.error('❌ Copy Trader Error:', error);
      if (error.type === 'tradeCopyFailed') {
        this.stats.failedCopies++;
      }
    });

    this.copyTrader.on('stopped', () => {
      console.log('⏹️ Copy trading system stopped');
      this.isRunning = false;
    });
  }

  async saveCopyTrade(tradeData) {
    try {
      const { error } = await supabase
        .from('copy_trades')
        .insert({
          master_trade_id: tradeData.orderId,
          master_broker_id: this.copyTrader.brokerConfig.id,
          follower_id: tradeData.follower,
          follower_order_id: tradeData.orderId,
          original_symbol: tradeData.symbol,
          original_side: tradeData.side,
          original_size: tradeData.size,
          original_price: 0, // Will be updated from broker trade
          copied_size: tradeData.size,
          copied_price: 0, // Market order
          status: 'executed',
          entry_time: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Failed to save copy trade:', error);
      } else {
        console.log('💾 Copy trade saved to database');
      }
    } catch (error) {
      console.error('❌ Error saving copy trade:', error);
    }
  }

  async start() {
    if (!this.copyTrader) {
      const initialized = await this.initialize();
      if (!initialized) {
        console.log('❌ Failed to initialize copy trading system');
        return false;
      }
    }

    try {
      await this.copyTrader.startMonitoring();
      return true;
    } catch (error) {
      console.error('❌ Failed to start monitoring:', error);
      return false;
    }
  }

  stop() {
    if (this.copyTrader) {
      this.copyTrader.stopMonitoring();
    }
  }

  getStatus() {
    if (!this.copyTrader) {
      return { isRunning: false, error: 'Not initialized' };
    }

    const status = this.copyTrader.getStatus();
    const stats = this.copyTrader.getStats();
    
    return {
      isRunning: this.isRunning,
      isConnected: status.isConnected,
      isAuthenticated: status.isAuthenticated,
      stats: {
        totalTrades: stats.totalTrades,
        successfulCopies: stats.successfulCopies,
        failedCopies: stats.failedCopies,
        successRate: stats.successRate,
        uptime: Date.now() - this.stats.startTime
      },
      positions: {
        broker: status.brokerPositions,
        followers: status.followerPositions
      },
      queue: {
        length: status.queueLength,
        isProcessing: status.isProcessing
      }
    };
  }

  // Manual trade trigger for testing
  async triggerTestTrade() {
    if (!this.copyTrader) {
      console.log('❌ Copy trader not initialized');
      return;
    }

    console.log('🧪 Triggering test trade...');
    
    const testTradeData = {
      symbol: 'BTCUSD',
      side: 'buy',
      size: 1,
      order_id: 'test_' + Date.now(),
      average_fill_price: 50000,
      reduce_only: false
    };

    // Emit the trade event
    this.copyTrader.emit('brokerTrade', testTradeData);
  }
}

// Main execution
async function main() {
  const system = new FixedCopyTradingSystem();
  
  // Start the system
  const started = await system.start();
  if (!started) {
    console.log('❌ Failed to start copy trading system');
    process.exit(1);
  }

  console.log('\n🎉 Fixed Copy Trading System is running!');
  console.log('📊 Monitoring for trades...\n');

  // Status monitoring
  const statusInterval = setInterval(() => {
    const status = system.getStatus();
    console.log(`📊 Status: Running=${status.isRunning}, Connected=${status.isConnected}, Auth=${status.isAuthenticated}`);
    console.log(`📈 Stats: Trades=${status.stats.totalTrades}, Copies=${status.stats.successfulCopies}, Failed=${status.stats.failedCopies}`);
    console.log(`⏱️  Uptime: ${Math.round(status.stats.uptime / 1000)}s`);
    console.log('---');
  }, 10000);

  // Test trade trigger (uncomment to test)
  // setTimeout(() => {
  //   system.triggerTestTrade();
  // }, 15000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    clearInterval(statusInterval);
    system.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    clearInterval(statusInterval);
    system.stop();
    process.exit(0);
  });
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = FixedCopyTradingSystem; 