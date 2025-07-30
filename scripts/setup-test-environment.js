const fetch = require('node-fetch');

async function setupTestEnvironment() {
  console.log('🧪 Setting up complete test environment for copy trading...\n');

  try {
    // Step 1: Check if we have an active broker account
    console.log('📊 Step 1: Checking broker accounts...');
    const brokerResponse = await fetch('http://localhost:3003/api/broker-account');
    const brokerData = await brokerResponse.json();
    
    let brokerAccount;
    if (brokerData.success && brokerData.data && brokerData.data.length > 0) {
      brokerAccount = brokerData.data[0];
      console.log('✅ Found existing broker account:', brokerAccount.account_name);
    } else {
      console.log('❌ No active broker accounts found. Please create one first.');
      console.log('📋 Go to http://localhost:3003/connect-broker to add a broker account');
      return;
    }

    // Step 2: Create a test follower
    console.log('\n📊 Step 2: Creating test follower...');
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

    console.log('📝 Creating follower with settings:', JSON.stringify(followerData, null, 2));

    const followerResponse = await fetch('http://localhost:3003/api/followers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(followerData)
    });

    const followerResult = await followerResponse.json();

    if (followerResponse.ok) {
      console.log('✅ Test follower created successfully:', followerResult);
    } else {
      console.log('❌ Failed to create test follower:', followerResponse.status, followerResult);
      return;
    }

    // Step 3: Test the copy trading system
    console.log('\n📊 Step 3: Testing copy trading system...');
    
    const testTrade = {
      order_id: `test_${Date.now()}`,
      symbol: 'BTC-PERP',
      side: 'buy',
      size: 0.1,
      price: 45000,
      timestamp: new Date().toISOString(),
      order_type: 'market',
      source: 'test_setup'
    };

    console.log('🔄 Testing with trade:', JSON.stringify(testTrade, null, 2));

    const copyResponse = await fetch('http://localhost:3003/api/copy-trade', {
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

    // Step 4: Test real-time monitoring
    console.log('\n📊 Step 4: Testing real-time monitoring...');
    
    const monitorResponse = await fetch('http://localhost:3003/api/real-time-monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broker_id: brokerAccount.id })
    });

    const monitorResult = await monitorResponse.json();
    
    if (monitorResponse.ok) {
      console.log('✅ Real-time monitoring test successful:', JSON.stringify(monitorResult, null, 2));
    } else {
      console.log('❌ Real-time monitoring test failed:', monitorResponse.status, monitorResult);
    }

    console.log('\n🎯 Test Environment Setup Complete!');
    console.log('📋 Next Steps:');
    console.log('1. Open http://localhost:3003/trades');
    console.log('2. Click "Real-Time Monitor & Copy"');
    console.log('3. Check "Copied Trades" tab for results');
    console.log('4. Monitor console for real-time updates');

  } catch (error) {
    console.log('❌ Error setting up test environment:', error.message);
  }
}

setupTestEnvironment().catch(console.error); 