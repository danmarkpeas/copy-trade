const DeltaExchangeCopyTrader = require('../services/DeltaExchangeCopyTrader');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFollowerExecution() {
  console.log('🧪 Testing Follower Execution...\n');
  
  try {
    // Get broker and followers
    const { data: brokerAccounts } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true)
      .limit(1);

    if (!brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    const broker = brokerAccounts[0];
    
    const { data: followers } = await supabase
      .from('followers')
      .select('*')
      .eq('master_broker_account_id', broker.id)
      .eq('account_status', 'active');

    if (!followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

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

    console.log(`📊 Testing with:`);
    console.log(`   Broker: ${brokerConfig.name}`);
    console.log(`   Followers: ${followerConfigs.length}`);
    followerConfigs.forEach(f => {
      console.log(`     - ${f.name} (multiplier: ${f.size_multiplier})`);
    });
    console.log('');

    // Create copy trader
    const copyTrader = new DeltaExchangeCopyTrader(brokerConfig, followerConfigs);

    // Set up event listeners
    copyTrader.on('started', () => {
      console.log('✅ Copy trading system started');
    });

    copyTrader.on('authenticated', () => {
      console.log('✅ WebSocket authenticated');
    });

    copyTrader.on('brokerTrade', (tradeData) => {
      console.log('🎯 Trade detected:', {
        symbol: tradeData.symbol,
        side: tradeData.side,
        size: tradeData.size,
        price: tradeData.average_fill_price
      });
    });

    copyTrader.on('tradeCopied', (data) => {
      console.log(`📈 Trade copied: ${data.follower} - ${data.side} ${data.size} ${data.symbol}`);
    });

    copyTrader.on('error', (error) => {
      console.error('❌ Error:', error);
    });

    // Start monitoring
    await copyTrader.startMonitoring();

    // Wait for system to be ready
    console.log('\n⏳ Waiting for system to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test trade trigger
    console.log('\n🧪 Triggering test trade...');
    
    const testTradeData = {
      symbol: 'BTCUSD',
      side: 'buy',
      size: 1,
      order_id: 'test_' + Date.now(),
      average_fill_price: 50000,
      reduce_only: false
    };

    console.log('📤 Emitting test trade:', testTradeData);
    copyTrader.emit('brokerTrade', testTradeData);

    // Monitor for 10 seconds
    console.log('\n⏰ Monitoring for 10 seconds...\n');
    
    let tradeCount = 0;
    const interval = setInterval(() => {
      const status = copyTrader.getStatus();
      const stats = copyTrader.getStats();
      
      console.log(`📊 Status: Connected=${status.isConnected}, Auth=${status.isAuthenticated}, Trades=${stats.totalTrades}, Copies=${stats.successfulCopies}`);
      
      if (stats.totalTrades > tradeCount) {
        console.log('🎉 New trades detected!');
        tradeCount = stats.totalTrades;
      }
    }, 2000);

    // Stop after 10 seconds
    setTimeout(() => {
      clearInterval(interval);
      copyTrader.stopMonitoring();
      
      const finalStats = copyTrader.getStats();
      console.log('\n📈 Final Statistics:');
      console.log(`   Total Trades: ${finalStats.totalTrades}`);
      console.log(`   Successful Copies: ${finalStats.successfulCopies}`);
      console.log(`   Failed Copies: ${finalStats.failedCopies}`);
      console.log(`   Success Rate: ${finalStats.successRate}`);
      
      if (finalStats.successfulCopies > 0) {
        console.log('\n✅ SUCCESS: Followers executed trades!');
      } else {
        console.log('\n❌ FAILED: No followers executed trades');
        console.log('   Possible issues:');
        console.log('   - Invalid API credentials for followers');
        console.log('   - API permissions issues');
        console.log('   - Network connectivity problems');
      }
      
      process.exit(0);
    }, 10000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testFollowerExecution().catch(console.error); 