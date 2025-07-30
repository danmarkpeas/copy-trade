const fetch = require('node-fetch');

async function testApiEndpoint() {
  console.log('🧪 TESTING API ENDPOINT\n');

  try {
    console.log('📋 Testing /api/real-time-monitor endpoint...');
    
    const response = await fetch('http://localhost:3001/api/real-time-monitor');
    
    console.log(`📥 Response Status: ${response.status}`);
    console.log(`📥 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API endpoint is working!');
      console.log('📊 Response Data:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.positions && data.positions.length > 0) {
        console.log(`\n🎯 Found ${data.positions.length} open position(s):`);
        data.positions.forEach((pos, index) => {
          console.log(`   ${index + 1}. ${pos.product_symbol || pos.symbol}: ${pos.size} contracts`);
        });
      } else {
        console.log('\nℹ️ No open positions found');
      }
      
      if (data.copy_results && data.copy_results.length > 0) {
        console.log(`\n📈 Recent copy trades: ${data.copy_results.length}`);
        data.copy_results.slice(0, 3).forEach((trade, index) => {
          console.log(`   ${index + 1}. ${trade.symbol} ${trade.side} ${trade.size}: ${trade.status}`);
        });
      }
      
    } else {
      console.log('❌ API endpoint returned error status');
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Error testing API endpoint:', error.message);
  }
}

testApiEndpoint().catch(console.error); 