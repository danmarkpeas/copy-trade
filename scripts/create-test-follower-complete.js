const fetch = require('node-fetch');

async function createTestFollower() {
  console.log('🧪 Creating test follower for complete copy trading system...\n');

  try {
    // First, get the current user's broker account
    const brokerResponse = await fetch('http://localhost:3002/api/broker-account');
    const brokerData = await brokerResponse.json();
    
    if (!brokerData.success || !brokerData.data || brokerData.data.length === 0) {
      console.log('❌ No active broker accounts found. Please create a broker account first.');
      return;
    }

    const brokerAccount = brokerData.data[0];
    console.log('✅ Found active broker account:', brokerAccount.account_name);

    // Create a test follower
    const followerData = {
      trader_id: brokerAccount.user_id, // Use the same user as trader
      broker_account_id: brokerAccount.id,
      copy_mode: 'multiplier',
      multiplier: 0.5,
      lot_size: 0.01,
      percentage_balance: 10,
      capital_allocated: 1000,
      drawdown_limit: 5,
      is_active: true,
      sync_status: 'active'
    };

    console.log('📝 Creating test follower with data:', JSON.stringify(followerData, null, 2));

    const response = await fetch('http://localhost:3002/api/followers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(followerData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Test follower created successfully:', result);
      
      // Now test the copy trading system
      console.log('\n🔄 Testing copy trading with the new follower...');
      
      const testTrade = {
        order_id: `complete_test_${Date.now()}`,
        symbol: 'BTC-PERP',
        side: 'buy',
        size: 0.1,
        price: 45000,
        timestamp: new Date().toISOString(),
        order_type: 'market',
        source: 'complete_test'
      };

      const copyResponse = await fetch('http://localhost:3002/api/copy-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_id: brokerAccount.id,
          trade_data: testTrade
        })
      });

      const copyResult = await copyResponse.json();
      
      if (copyResponse.ok) {
        console.log('✅ Copy trading test successful:', JSON.stringify(copyResult, null, 2));
      } else {
        console.log('❌ Copy trading test failed:', copyResponse.status, copyResult);
      }

    } else {
      console.log('❌ Failed to create test follower:', response.status, result);
    }

  } catch (error) {
    console.log('❌ Error creating test follower:', error.message);
  }
}

createTestFollower().catch(console.error); 