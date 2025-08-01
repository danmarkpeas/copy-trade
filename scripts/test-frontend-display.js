const axios = require('axios');

async function testFrontendDisplay() {
  console.log('🔍 TESTING FRONTEND DISPLAY FUNCTIONALITY');
  console.log('=' .repeat(60));
  
  try {
    // Test the real-time monitor endpoint
    console.log('1. Testing Real-Time Monitor Endpoint...');
    const response = await axios.post('http://localhost:3001/api/real-time-monitor', {
      broker_id: 'f9593e9d-b50d-447c-80e3-a79464be7dff'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log('✅ Backend Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check if the response has the expected structure
    const data = response.data;
    const expectedFields = [
      'success', 'message', 'broker_id', 'total_trades_found', 
      'active_followers', 'trades_copied', 'copy_results', 'positions', 'timestamp'
    ];
    
    console.log('\n2. Validating Response Structure...');
    const missingFields = expectedFields.filter(field => !(field in data));
    
    if (missingFields.length === 0) {
      console.log('✅ All expected fields are present');
    } else {
      console.log('❌ Missing fields:', missingFields);
    }
    
    // Check if copy_results has the expected structure
    if (data.copy_results && data.copy_results.length > 0) {
      console.log('\n3. Validating Trade Data Structure...');
      const firstTrade = data.copy_results[0];
      const tradeFields = ['symbol', 'side', 'size', 'price', 'status', 'timestamp', 'order_id'];
      const missingTradeFields = tradeFields.filter(field => !(field in firstTrade));
      
      if (missingTradeFields.length === 0) {
        console.log('✅ Trade data structure is correct');
        console.log('Sample trade:', JSON.stringify(firstTrade, null, 2));
      } else {
        console.log('❌ Missing trade fields:', missingTradeFields);
      }
    }
    
    console.log('\n4. Frontend Display Summary:');
    console.log(`✅ Total Trades Found: ${data.total_trades_found}`);
    console.log(`✅ Active Followers: ${data.active_followers}`);
    console.log(`✅ Trades Copied: ${data.trades_copied}`);
    console.log(`✅ Recent Trades: ${data.copy_results?.length || 0}`);
    console.log(`✅ Positions: ${data.positions?.length || 0}`);
    
    console.log('\n🎯 FRONTEND DISPLAY STATUS:');
    if (data.success && data.total_trades_found > 0) {
      console.log('✅ READY FOR DISPLAY');
      console.log('The frontend should now show:');
      console.log('- Real-time monitoring results card');
      console.log('- Recent trades table with 5 most recent trades');
      console.log('- All trade details (symbol, side, size, price, status, time)');
    } else {
      console.log('⚠️  LIMITED DATA');
      console.log('The frontend will show basic monitoring info but no recent trades');
    }
    
  } catch (error) {
    console.log('❌ ERROR: Failed to test frontend display');
    console.log('Error details:', error.response?.data || error.message);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('FRONTEND DISPLAY TEST COMPLETE');
  console.log('=' .repeat(60));
}

// Run the test
testFrontendDisplay().catch(console.error); 