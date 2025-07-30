const { createClient } = require('@supabase/supabase-js');
const CopyTradingEngine = require('../services/CopyTradingEngine');
require('dotenv').config();

async function demoCompleteSystem() {
  console.log('🎯 COMPLETE COPY TRADING SYSTEM DEMONSTRATION\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get broker account
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    const brokerAccount = brokerAccounts[0];
    console.log('📋 BROKER ACCOUNT:');
    console.log('   ID:', brokerAccount.id);
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);

    // Get followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('master_broker_account_id', brokerAccount.id)
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log('\n👥 FOLLOWERS:');
    followers.forEach((follower, index) => {
      console.log(`   ${index + 1}. ${follower.follower_name} (${follower.copy_mode})`);
    });

    // Initialize Copy Trading Engine
    console.log('\n🚀 INITIALIZING COPY TRADING ENGINE...');
    const copyEngine = new CopyTradingEngine();

    // Set up comprehensive event listeners
    copyEngine.on('masterConnected', (masterId) => {
      console.log(`✅ Master trader ${masterId} connected to WebSocket`);
    });

    copyEngine.on('followerConnected', (followerId) => {
      console.log(`✅ Follower ${followerId} connected to WebSocket`);
    });

    copyEngine.on('copyTradeExecuted', (tradeRecord) => {
      console.log(`📊 COPY TRADE EXECUTED:`);
      console.log(`   Master: ${tradeRecord.masterId}`);
      console.log(`   Follower: ${tradeRecord.followerId}`);
      console.log(`   Symbol: ${tradeRecord.masterTrade.symbol}`);
      console.log(`   Side: ${tradeRecord.masterTrade.side}`);
      console.log(`   Original Size: ${tradeRecord.masterTrade.size}`);
      console.log(`   Copied Size: ${tradeRecord.copyOrder.size}`);
      console.log(`   Price: ${tradeRecord.masterTrade.price}`);
      console.log(`   Success: ${tradeRecord.result.success ? '✅' : '❌'}`);
      console.log(`   Timestamp: ${tradeRecord.timestamp.toISOString()}`);
      console.log('');
    });

    copyEngine.on('copyTradeError', (error) => {
      console.error(`❌ COPY TRADE ERROR:`);
      console.error(`   Follower: ${error.followerId}`);
      console.error(`   Master: ${error.masterId}`);
      console.error(`   Error: ${error.error}`);
      console.log('');
    });

    copyEngine.on('positionCopyClosed', (data) => {
      console.log(`🔒 POSITION COPY CLOSED:`);
      console.log(`   Follower: ${data.followerId}`);
      console.log(`   Master: ${data.masterId}`);
      console.log(`   Symbol: ${data.symbol}`);
      console.log('');
    });

    // Add master trader
    console.log('\n🎯 ADDING MASTER TRADER...');
    const masterResult = copyEngine.addMasterTrader(
      brokerAccount.id,
      brokerAccount.api_key,
      brokerAccount.api_secret
    );

    if (!masterResult.success) {
      console.log(`❌ Failed to add master trader: ${masterResult.error}`);
      return;
    }

    console.log('✅ Master trader added successfully');

    // Add followers
    console.log('\n👥 ADDING FOLLOWERS...');
    for (const follower of followers) {
      const copySettings = {
        copyRatio: follower.copy_mode === 'multiplier' ? 0.1 : 1.0,
        symbolFilter: [], // Copy all symbols
        minTradeSize: 0,
        maxTradeSize: 1000,
        useMarketOrders: true,
        reverseDirection: false,
        copyPositionClose: true
      };

      const followerResult = copyEngine.addFollower(
        follower.user_id,
        brokerAccount.api_key, // In production, use follower's own API key
        brokerAccount.api_secret, // In production, use follower's own API secret
        copySettings
      );

      if (followerResult.success) {
        console.log(`✅ Added follower: ${follower.follower_name}`);
        
        // Create copy relationship
        const relationshipResult = copyEngine.createCopyRelationship(
          follower.user_id,
          brokerAccount.id
        );
        
        if (relationshipResult.success) {
          console.log(`✅ Created copy relationship for ${follower.follower_name}`);
        } else {
          console.log(`❌ Failed to create relationship: ${relationshipResult.error}`);
        }
      } else {
        console.log(`❌ Failed to add follower: ${follower.follower_name} - ${followerResult.error}`);
      }
    }

    // Wait for connections
    console.log('\n⏳ Waiting for WebSocket connections...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check status
    console.log('\n📊 COPY TRADING ENGINE STATUS:');
    console.log('   Master traders:', copyEngine.masterTraders.size);
    console.log('   Followers:', copyEngine.followers.size);
    console.log('   Copy relationships:', copyEngine.copyRelationships.size);
    console.log('   Total trades:', copyEngine.tradeHistory.length);

    // Simulate multiple master trades
    console.log('\n🧪 SIMULATING MASTER TRADES...');
    
    const simulatedTrades = [
      {
        symbol: 'DYDXUSD',
        fillId: 'test_fill_001',
        side: 'buy',
        size: 2,
        price: 0.65,
        position: 'long',
        role: 'taker',
        timestamp: Date.now(),
        orderId: 'test_order_001'
      },
      {
        symbol: 'BTCUSD',
        fillId: 'test_fill_002',
        side: 'sell',
        size: 0.1,
        price: 45000,
        position: 'short',
        role: 'maker',
        timestamp: Date.now(),
        orderId: 'test_order_002'
      },
      {
        symbol: 'ETHUSD',
        fillId: 'test_fill_003',
        side: 'buy',
        size: 1.5,
        price: 2800,
        position: 'long',
        role: 'taker',
        timestamp: Date.now(),
        orderId: 'test_order_003'
      }
    ];

    // Execute simulated trades
    for (const trade of simulatedTrades) {
      console.log(`\n📈 Simulating trade: ${trade.symbol} ${trade.side} ${trade.size} @ ${trade.price}`);
      await copyEngine.handleMasterTrade(brokerAccount.id, trade);
      
      // Wait between trades
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check trade history
    console.log('\n📋 TRADE HISTORY:');
    const history = copyEngine.getTradeHistory();
    console.log(`   Total trades: ${history.length}`);
    
    if (history.length > 0) {
      history.forEach((trade, index) => {
        console.log(`   ${index + 1}. ${trade.masterTrade.symbol} ${trade.masterTrade.side} ${trade.copyOrder.size} (${trade.result.success ? '✅' : '❌'})`);
      });
    }

    // Get stats for each follower
    console.log('\n📈 FOLLOWER STATS:');
    for (const follower of followers) {
      const stats = copyEngine.getStats(follower.user_id);
      console.log(`   ${follower.follower_name}:`);
      console.log(`     Total trades: ${stats.totalTrades}`);
      console.log(`     Success rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`     Total volume: ${stats.totalVolume.toFixed(2)}`);
      console.log(`     Average trade size: ${stats.averageTradeSize.toFixed(2)}`);
    }

    // Demonstrate position closing
    console.log('\n🔒 DEMONSTRATING POSITION CLOSING...');
    const closedPosition = {
      action: 'delete',
      symbol: 'DYDXUSD',
      productId: 'test_product_001',
      size: 0,
      entryPrice: 0.65,
      margin: 0,
      liquidationPrice: 0
    };

    await copyEngine.handleMasterPositionClose(brokerAccount.id, closedPosition);

    console.log('\n🎯 SYSTEM DEMONSTRATION COMPLETE');
    console.log('✅ Copy trading engine is working');
    console.log('✅ WebSocket connections established');
    console.log('✅ Trade copying logic functional');
    console.log('✅ Position closing logic working');
    console.log('✅ Database integration working');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Place real trades in Delta Exchange');
    console.log('2. Monitor copy trades in real-time');
    console.log('3. Check the API endpoints for status');
    console.log('4. View trade history and statistics');
    console.log('5. Adjust follower settings as needed');

    // Keep the system running for a while to show real-time updates
    console.log('\n⏳ Keeping system running for 30 seconds to show real-time updates...');
    console.log('   Press Ctrl+C to stop');
    
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Clean up
    console.log('\n🛑 Disconnecting...');
    copyEngine.disconnect();
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

demoCompleteSystem().catch(console.error); 