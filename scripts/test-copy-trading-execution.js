const { createClient } = require('@supabase/supabase-js');
const CopyTradingEngine = require('../services/CopyTradingEngine');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCopyTradingExecution() {
  console.log('🧪 TESTING COPY TRADING EXECUTION');
  console.log('=' .repeat(60));

  try {
    // 1. Get active broker accounts
    console.log('1. Getting active broker accounts...');
    
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    console.log(`✅ Found ${brokerAccounts.length} active broker accounts`);

    // 2. Get active followers
    console.log('\n2. Getting active followers...');
    
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }

    console.log(`✅ Found ${followers.length} active followers`);

    // 3. Create copy trading engine
    console.log('\n3. Creating copy trading engine...');
    
    const copyEngine = new CopyTradingEngine();

    // 4. Add master traders
    console.log('\n4. Adding master traders...');
    
    for (const broker of brokerAccounts) {
      const result = copyEngine.addMasterTrader(
        broker.id,
        broker.api_key,
        broker.api_secret
      );

      if (result.success) {
        console.log(`✅ Added master trader: ${broker.account_name}`);
      } else {
        console.log(`❌ Failed to add master trader: ${broker.account_name} - ${result.error}`);
      }
    }

    // 5. Add followers
    console.log('\n5. Adding followers...');
    
    for (const follower of followers) {
      const result = copyEngine.addFollower(
        follower.id,
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
        console.log(`✅ Added follower: ${follower.follower_name}`);
      } else {
        console.log(`❌ Failed to add follower: ${follower.follower_name} - ${result.error}`);
      }
    }

    // 6. Create copy relationships
    console.log('\n6. Creating copy relationships...');
    
    for (const follower of followers) {
      const result = copyEngine.createCopyRelationship(
        follower.id,
        follower.master_broker_account_id
      );

      if (result.success) {
        console.log(`✅ Created copy relationship: ${follower.follower_name} -> ${follower.master_broker_account_id}`);
      } else {
        console.log(`❌ Failed to create copy relationship: ${follower.follower_name} - ${result.error}`);
      }
    }

    // 7. Set up event listeners
    console.log('\n7. Setting up event listeners...');
    
    copyEngine.on('masterConnected', (masterId) => {
      console.log(`🎯 Master trader ${masterId} connected`);
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
    });

    copyEngine.on('copyTradeError', (errorData) => {
      console.error('❌ Copy trade error:', errorData);
    });

    // 8. Test with a mock trade
    console.log('\n8. Testing with mock trade...');
    
    const mockTrade = {
      symbol: 'BBUSD',
      fillId: 'test_fill_123',
      side: 'buy',
      size: 1,
      price: 0.0985,
      position: 'long',
      role: 'taker',
      timestamp: Date.now(),
      orderId: 'test_order_123'
    };

    console.log('📤 Simulating master trade:', mockTrade);
    
    // Simulate a master trade
    await copyEngine.handleMasterTrade(brokerAccounts[0].id, mockTrade);

    // 9. Wait for execution
    console.log('\n9. Waiting for execution...');
    
    setTimeout(() => {
      console.log('\n✅ Test completed');
      console.log('📊 Trade history:', copyEngine.getTradeHistory());
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCopyTradingExecution(); 