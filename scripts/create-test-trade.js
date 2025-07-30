const fetch = require('node-fetch');

async function createTestTrade() {
  console.log('🧪 Creating test trade to verify copy trading system...\n');

  // Step 1: Create a test trade in the database
  console.log('📝 Step 1: Creating test trade in database...');
  
  try {
    const testTrade = {
      trader_id: 'fdb32e0d-0778-4f76-b153-c72b8656ab47', // User ID from logs
      asset: 'BTC-PERP',
      action: 'buy',
      quantity: 0.1,
      price: 45000,
      status: 'open'
    };

    // Insert into trades table via API
    const response = await fetch('http://localhost:3002/api/test-trade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testTrade)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test trade created:', result);
    } else {
      console.log('❌ Failed to create test trade:', response.status);
    }
  } catch (error) {
    console.log('❌ Error creating test trade:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Step 2: Create test follower accounts
  console.log('👥 Step 2: Creating test follower accounts...');
  
  try {
    const testFollowers = [
      {
        user_id: 'fdb32e0d-0778-4f76-b153-c72b8656ab47',
        subscribed_to: 'fdb32e0d-0778-4f76-b153-c72b8656ab47',
        capital_allocated: 1000,
        risk_level: 'medium',
        copy_mode: 'copy'
      }
    ];

    // Insert into followers table via API
    const response = await fetch('http://localhost:3002/api/test-followers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testFollowers)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test followers created:', result);
    } else {
      console.log('❌ Failed to create test followers:', response.status);
    }
  } catch (error) {
    console.log('❌ Error creating test followers:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Step 3: Test copy trading
  console.log('🔄 Step 3: Testing copy trading...');
  
  try {
    const brokerId = '4bbc0ef3-db9d-4c18-9eb7-bc27ac8c289d'; // From logs
    
    const response = await fetch('http://localhost:3002/api/monitor-trades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        broker_id: brokerId
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Copy trading test result:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Copy trading test failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Error testing copy trading:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Step 4: Check results
  console.log('📊 Step 4: Checking results...');
  
  try {
    // Check copied trades
    const tradesResponse = await fetch('http://localhost:3002/trades');
    if (tradesResponse.ok) {
      console.log('✅ Trades page accessible');
    } else {
      console.log('❌ Trades page failed:', tradesResponse.status);
    }
  } catch (error) {
    console.log('❌ Error checking results:', error.message);
  }

  console.log('\n🎯 Test Summary:');
  console.log('1. Created test trade in database');
  console.log('2. Created test follower accounts');
  console.log('3. Tested copy trading system');
  console.log('4. Verified results are accessible');
  console.log('\n📋 Next Steps:');
  console.log('- Check the trades page to see copied trades');
  console.log('- Verify follower accounts received copied trades');
  console.log('- Test with real Delta Exchange trades');
}

createTestTrade().catch(console.error); 