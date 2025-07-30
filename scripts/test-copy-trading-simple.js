const fetch = require('node-fetch');

async function testCopyTradingSimple() {
  console.log('🧪 Testing copy trading system...\n');

  try {
    // Step 1: Get broker account
    console.log('📊 Step 1: Getting broker account...');
    const brokerResponse = await fetch('http://localhost:3003/api/broker-account');
    const brokerData = await brokerResponse.json();
    
    if (!brokerData.success || !brokerData.data || brokerData.data.length === 0) {
      console.log('❌ No broker accounts found');
      console.log('📋 Please create a broker account first at http://localhost:3003/connect-broker');
      return;
    }

    const brokerAccount = brokerData.data[0];
    console.log('✅ Found broker account:', brokerAccount.account_name);

    // Step 2: Test real-time monitoring
    console.log('\n📊 Step 2: Testing real-time monitoring...');
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

    // Step 3: Test copy trading with a sample trade
    console.log('\n📊 Step 3: Testing copy trading...');
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

    // Step 4: Check database schema
    console.log('\n📊 Step 4: Checking database schema...');
    const schemaResponse = await fetch('http://localhost:3003/api/test-db-schema');
    const schemaResult = await schemaResponse.json();
    
    if (schemaResponse.ok) {
      console.log('✅ Database schema check successful:', JSON.stringify(schemaResult, null, 2));
    } else {
      console.log('❌ Database schema check failed:', schemaResponse.status, schemaResult);
    }

    console.log('\n🎯 Test Complete!');
    console.log('📋 Summary:');
    console.log('- Real-time monitoring:', monitorResponse.ok ? '✅ Working' : '❌ Failed');
    console.log('- Copy trading:', copyResponse.ok ? '✅ Working' : '❌ Failed');
    console.log('- Database schema:', schemaResponse.ok ? '✅ Working' : '❌ Failed');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testCopyTradingSimple().catch(console.error); 