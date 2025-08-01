const { createClient } = require('@supabase/supabase-js');
const CopyTradingEngine = require('../services/CopyTradingEngine');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testManualTradeTrigger() {
  console.log('🧪 TESTING MANUAL TRADE TRIGGER');
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

    const broker = brokerAccounts[0];
    console.log(`✅ Using broker: ${broker.account_name}`);

    // 2. Get active followers
    console.log('\n2. Getting active followers...');
    
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log(`✅ Found ${followers.length} active followers`);

    // 3. Create copy trading engine
    console.log('\n3. Creating copy trading engine...');
    
    const copyEngine = new CopyTradingEngine();

    // 4. Add master trader
    console.log('\n4. Adding master trader...');
    
    const masterResult = copyEngine.addMasterTrader(
      broker.id,
      broker.api_key,
      broker.api_secret
    );

    if (masterResult.success) {
      console.log(`✅ Added master trader: ${broker.account_name}`);
    } else {
      console.log(`❌ Failed to add master trader: ${masterResult.error}`);
      return;
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

    // 8. Wait for master connection
    console.log('\n8. Waiting for master connection...');
    
    await new Promise(resolve => {
      copyEngine.once('masterConnected', resolve);
      setTimeout(resolve, 10000); // 10 second timeout
    });

    // 9. Trigger manual trade
    console.log('\n9. Triggering manual trade...');
    
    const mockTrade = {
      symbol: 'BBUSD',
      fillId: 'manual_test_' + Date.now(),
      side: 'buy',
      size: 1,
      price: 0.0985,
      position: 'long',
      role: 'taker',
      timestamp: Date.now(),
      orderId: 'manual_order_' + Date.now()
    };

    console.log('📤 Simulating master trade:', mockTrade);
    
    // Manually trigger the copy trade
    await copyEngine.handleMasterTrade(broker.id, mockTrade);

    // 10. Wait for execution
    console.log('\n10. Waiting for execution...');
    
    setTimeout(() => {
      console.log('\n✅ Test completed');
      console.log('📊 Trade history:', copyEngine.getTradeHistory());
      
      const history = copyEngine.getTradeHistory();
      if (history.length > 0) {
        const lastTrade = history[history.length - 1];
        console.log('📊 Last copy trade result:', {
          success: lastTrade.result.success,
          error: lastTrade.result.error,
          symbol: lastTrade.masterTrade.symbol,
          side: lastTrade.masterTrade.side,
          size: lastTrade.copyOrder.size
        });
      }
      
      copyEngine.disconnect();
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testManualTradeTrigger(); 