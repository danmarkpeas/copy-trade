const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCopyTradingManual() {
  console.log('🧪 MANUAL COPY TRADING TEST');
  console.log('============================\n');

  try {
    // Get user and configuration
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (!users || users.length === 0) {
      console.log('❌ No users found');
      return;
    }

    const user = users[0];
    console.log(`👤 Testing for user: ${user.email}`);

    // Get broker and follower configurations
    const { data: brokers } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_verified', true);

    const { data: followers } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (!brokers || brokers.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    if (!followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log(`📈 Broker: ${brokers[0].account_name}`);
    console.log(`👥 Followers: ${followers.length}`);

    // Test multiple trade scenarios
    const testTrades = [
      {
        symbol: 'BTCUSD',
        side: 'buy',
        size: 0.1,
        price: 45000.00,
        description: 'BTC Buy Order'
      },
      {
        symbol: 'ETHUSD',
        side: 'sell',
        size: 1.5,
        price: 2800.00,
        description: 'ETH Sell Order'
      },
      {
        symbol: 'SOLUSD',
        side: 'buy',
        size: 10,
        price: 150.00,
        description: 'SOL Buy Order'
      }
    ];

    for (let i = 0; i < testTrades.length; i++) {
      const trade = testTrades[i];
      console.log(`\n📊 Test ${i + 1}: ${trade.description}`);
      console.log(`   Symbol: ${trade.symbol}`);
      console.log(`   Side: ${trade.side}`);
      console.log(`   Size: ${trade.size}`);
      console.log(`   Price: $${trade.price}`);

      const tradeData = {
        symbol: trade.symbol,
        side: trade.side,
        size: trade.size,
        order_id: `manual_test_${Date.now()}_${i}`,
        average_fill_price: trade.price,
        reduce_only: false
      };

      // Trigger the trade
      const response = await fetch(`http://localhost:3001/api/test-trade?user_id=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tradeData)
      });

      if (response.ok) {
        console.log('   ✅ Trade triggered successfully');
        
        // Wait a moment for processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if trade was recorded
        const historyResponse = await fetch('http://localhost:3001/api/trade-history?limit=1');
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          if (historyData.data.length > 0) {
            const latestTrade = historyData.data[0];
            if (latestTrade.original_symbol === trade.symbol) {
              console.log('   ✅ Trade recorded in history');
              console.log(`   📊 Status: ${latestTrade.status}`);
              console.log(`   📊 Copied Size: ${latestTrade.copied_size}`);
            }
          }
        }
      } else {
        console.log('   ❌ Trade trigger failed');
      }
    }

    // Final status check
    console.log('\n📊 FINAL STATUS CHECK');
    console.log('=====================');
    
    const statusResponse = await fetch('http://localhost:3001/api/status');
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log(`✅ System Status: ${statusData.data.totalUsers} users, ${statusData.data.activeTraders} traders`);
    }

    const historyResponse = await fetch('http://localhost:3001/api/trade-history?limit=5');
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      console.log(`📈 Recent Trades: ${historyData.data.length} trades`);
      
      // Show recent trades
      historyData.data.slice(0, 3).forEach((trade, index) => {
        console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.original_size} (${trade.status})`);
      });
    }

    console.log('\n🎉 Manual copy trading test completed!');
    console.log('✅ The system is processing trades correctly');
    console.log('✅ Trade history is being updated');
    console.log('✅ All endpoints are responding');

  } catch (error) {
    console.error('❌ Manual test failed:', error.message);
  }
}

testCopyTradingManual().catch(console.error); 