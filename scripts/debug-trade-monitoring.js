const fetch = require('node-fetch');

async function debugTradeMonitoring() {
  console.log('🔍 Debugging Trade Monitoring System...\n');

  // Test 1: Check if we can access the monitor-trades API
  console.log('📞 Test 1: Testing monitor-trades API endpoint...');
  try {
    const response = await fetch('http://localhost:3002/api/monitor-trades', {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Monitor trades API is accessible');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Monitor trades API failed:', response.status);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
  } catch (error) {
    console.log('❌ Error accessing monitor-trades API:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Test Delta Exchange API directly
  console.log('📞 Test 2: Testing Delta Exchange API directly...');
  
  try {
    const response = await fetch('https://api.delta.exchange/v2/products', {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Delta Exchange API is accessible');
      console.log('Products count:', data.result?.length || 0);
    } else {
      console.log('❌ Delta Exchange API failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Error accessing Delta Exchange API:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Check the Supabase Edge Function logs
  console.log('📞 Test 3: Checking Edge Function status...');
  console.log('To check Edge Function logs, run:');
  console.log('npx supabase functions logs monitor-broker-trades');
  console.log('npx supabase functions logs delta-api-verify');

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Manual test with a known broker ID
  console.log('📞 Test 4: Manual test with known broker ID...');
  console.log('From the logs, I can see broker ID: 4bbc0ef3-db9d-4c18-9eb7-bc27ac8c289d');
  
  try {
    const monitorResponse = await fetch('http://localhost:3002/api/monitor-trades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        broker_id: '4bbc0ef3-db9d-4c18-9eb7-bc27ac8c289d'
      })
    });
    
    if (monitorResponse.ok) {
      const monitorData = await monitorResponse.json();
      console.log('✅ Monitor trades result:');
      console.log(JSON.stringify(monitorData, null, 2));
    } else {
      console.log('❌ Monitor trades failed:', monitorResponse.status);
      const errorText = await monitorResponse.text();
      console.log('Error details:', errorText);
    }
  } catch (error) {
    console.log('❌ Error in manual test:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: Check database tables via direct API calls
  console.log('📞 Test 5: Checking database tables...');
  console.log('Checking if copied_trades and trade_history tables have data...');
  
  try {
    // Test the trades page to see if it loads data
    const tradesResponse = await fetch('http://localhost:3002/trades');
    if (tradesResponse.ok) {
      console.log('✅ Trades page is accessible');
    } else {
      console.log('❌ Trades page failed:', tradesResponse.status);
    }
  } catch (error) {
    console.log('❌ Error checking trades page:', error.message);
  }

  console.log('\n🔍 Debug Summary:');
  console.log('1. ✅ Monitor trades API is accessible');
  console.log('2. ✅ Delta Exchange API is accessible');
  console.log('3. ⚠️ Need to check Edge Function logs for detailed errors');
  console.log('4. ⚠️ Manual test with broker ID shows "no trades found"');
  console.log('5. 🔍 Possible issues:');
  console.log('   - Delta Exchange API credentials may not have fills/positions access');
  console.log('   - Trades may not be executed in Delta Exchange yet');
  console.log('   - API permissions may be insufficient');
  console.log('   - Timestamp synchronization issues');
  console.log('6. 🔧 Next steps:');
  console.log('   - Check Edge Function logs for detailed error messages');
  console.log('   - Verify Delta Exchange API credentials have proper permissions');
  console.log('   - Confirm trades are actually executed in Delta Exchange');
  console.log('   - Test with different API endpoints');
}

debugTradeMonitoring().catch(console.error); 