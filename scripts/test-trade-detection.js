const DeltaExchangeCopyTrader = require('../services/DeltaExchangeCopyTrader');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTradeDetection() {
  console.log('🧪 Testing Trade Detection System...\n');
  
  try {
    // Get broker and followers from database
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
    console.log(`   Followers: ${followerConfigs.length}\n`);

    // Create copy trader instance
    const copyTrader = new DeltaExchangeCopyTrader(brokerConfig, followerConfigs);

    // Set up event listeners
    copyTrader.on('started', () => {
      console.log('✅ Copy trading system started');
    });

    copyTrader.on('authenticated', () => {
      console.log('✅ WebSocket authenticated');
    });

    copyTrader.on('brokerTrade', (tradeData) => {
      console.log('🎯 Trade detected:', tradeData);
    });

    copyTrader.on('tradeCopied', (data) => {
      console.log(`📈 Trade copied: ${data.follower} - ${data.side} ${data.size} ${data.symbol}`);
    });

    copyTrader.on('positionClosed', (data) => {
      console.log(`📉 Position closed: ${data.follower} - ${data.symbol}`);
    });

    copyTrader.on('error', (error) => {
      console.error('❌ Error:', error);
    });

    // Start monitoring
    await copyTrader.startMonitoring();

    // Monitor for 30 seconds
    console.log('\n⏰ Monitoring for 30 seconds...\n');
    
    let tradeCount = 0;
    const interval = setInterval(() => {
      const status = copyTrader.getStatus();
      const stats = copyTrader.getStats();
      
      console.log(`📊 Status: Connected=${status.isConnected}, Auth=${status.isAuthenticated}, Trades=${stats.totalTrades}, Copies=${stats.successfulCopies}`);
      
      if (stats.totalTrades > tradeCount) {
        console.log('🎉 New trades detected!');
        tradeCount = stats.totalTrades;
      }
    }, 5000);

    // Stop after 30 seconds
    setTimeout(() => {
      clearInterval(interval);
      copyTrader.stopMonitoring();
      
      const finalStats = copyTrader.getStats();
      console.log('\n📈 Final Statistics:');
      console.log(`   Total Trades: ${finalStats.totalTrades}`);
      console.log(`   Successful Copies: ${finalStats.successfulCopies}`);
      console.log(`   Failed Copies: ${finalStats.failedCopies}`);
      console.log(`   Success Rate: ${finalStats.successRate}`);
      console.log(`   Total Volume: ${finalStats.totalVolume}`);
      
      console.log('\n✅ Test completed');
      process.exit(0);
    }, 30000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testTradeDetection().catch(console.error); 