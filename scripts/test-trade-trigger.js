const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function triggerTestTrade() {
  console.log('🧪 TRIGGERING TEST TRADE');
  console.log('========================\n');

  try {
    // Get the first user
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (!users || users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    const user = users[0];
    console.log(`👤 Triggering test trade for user: ${user.email}`);

    // Simulate a broker trade event
    const testTradeData = {
      symbol: 'BTCUSD',
      side: 'buy',
      size: 0.1,
      order_id: `test_${Date.now()}`,
      average_fill_price: 45000.00,
      reduce_only: false
    };

    console.log('📊 Test Trade Data:');
    console.log(`   Symbol: ${testTradeData.symbol}`);
    console.log(`   Side: ${testTradeData.side}`);
    console.log(`   Size: ${testTradeData.size}`);
    console.log(`   Price: $${testTradeData.average_fill_price}`);
    console.log(`   Order ID: ${testTradeData.order_id}`);

    // Send test trade to the backend
    const response = await fetch(`http://localhost:3001/api/test-trade?user_id=${user.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testTradeData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ Test trade triggered successfully!');
      console.log('📊 Result:', result);
      
      // Wait a moment and check trade history
      console.log('\n⏳ Waiting 3 seconds to check trade history...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const historyResponse = await fetch('http://localhost:3001/api/trade-history?limit=1');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        if (historyData.data.length > 0) {
          const latestTrade = historyData.data[0];
          console.log('\n📈 Latest Trade in History:');
          console.log(`   Symbol: ${latestTrade.original_symbol}`);
          console.log(`   Side: ${latestTrade.original_side}`);
          console.log(`   Size: ${latestTrade.original_size}`);
          console.log(`   Status: ${latestTrade.status}`);
          console.log(`   Time: ${latestTrade.created_at}`);
        }
      }
    } else {
      console.log('❌ Failed to trigger test trade');
      const errorText = await response.text();
      console.log('Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Test trade trigger failed:', error.message);
  }
}

triggerTestTrade().catch(console.error); 