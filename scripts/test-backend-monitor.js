const axios = require('axios');

async function testBackendMonitor() {
  console.log('🧪 TESTING BACKEND REAL-TIME MONITOR\n');

  try {
    const response = await axios.post('http://localhost:3001/api/real-time-monitor', {
      broker_id: 'f9593e9d-b50d-447c-80e3-a79464be7dff'
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Backend monitor response:');
    console.log('   Status:', response.status);
    console.log('   Success:', response.data.success);
    console.log('   Total trades found:', response.data.total_trades_found);
    console.log('   Active followers:', response.data.active_followers);
    console.log('   Trades copied:', response.data.trades_copied);
    console.log('   Positions:', response.data.positions?.length || 0);
    
    if (response.data.positions && response.data.positions.length > 0) {
      console.log('\n📊 Current Positions:');
      response.data.positions.forEach((pos, index) => {
        console.log(`   ${index + 1}. ${pos.product_symbol} ${pos.size} @ ${pos.avg_price}`);
      });
    }

    if (response.data.copy_results && response.data.copy_results.length > 0) {
      console.log('\n📈 Recent Copy Trades:');
      response.data.copy_results.forEach((trade, index) => {
        console.log(`   ${index + 1}. ${trade.symbol} ${trade.side} ${trade.size} (${trade.status})`);
      });
    }

  } catch (error) {
    console.log('❌ Backend monitor test failed:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data);
    } else {
      console.log('   Error:', error.message);
    }
  }
}

testBackendMonitor().catch(console.error); 