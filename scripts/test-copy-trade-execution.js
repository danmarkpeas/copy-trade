const axios = require('axios');

async function testCopyTradeExecution() {
  console.log('🧪 TESTING COPY TRADE EXECUTION');
  console.log('=' .repeat(60));
  
  try {
    // 1. Test backend connection
    console.log('1. Testing backend connection...');
    const backendResponse = await axios.get('http://localhost:3001', { timeout: 5000 });
    console.log('✅ Backend is running');
    
    // 2. Get copy trading status
    console.log('\n2. Getting copy trading status...');
    const statusResponse = await axios.get('http://localhost:3001/api/status', { timeout: 5000 });
    const status = statusResponse.data.data;
    
    console.log(`✅ Copy Trading Status:`);
    console.log(`   - Master Traders: ${status.masterTraders}`);
    console.log(`   - Followers: ${status.followers}`);
    console.log(`   - Copy Relationships: ${status.copyRelationships}`);
    console.log(`   - Total Trades: ${status.totalTrades}`);
    
    // 3. Trigger real-time monitoring to see trade execution
    console.log('\n3. Triggering real-time monitoring...');
    const monitorResponse = await axios.post('http://localhost:3001/api/real-time-monitor', {
      broker_id: 'f9593e9d-b50d-447c-80e3-a79464be7dff'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });
    
    const monitorData = monitorResponse.data;
    console.log(`✅ Real-Time Monitoring Results:`);
    console.log(`   - Total Trades Found: ${monitorData.total_trades_found}`);
    console.log(`   - Active Followers: ${monitorData.active_followers}`);
    console.log(`   - Trades Copied: ${monitorData.trades_copied}`);
    
    // 4. Check recent trades
    if (monitorData.copy_results && monitorData.copy_results.length > 0) {
      console.log('\n4. Recent trades found:');
      const recentTrades = monitorData.copy_results.slice(0, 3);
      recentTrades.forEach((trade, index) => {
        console.log(`   ${index + 1}. ${trade.symbol} ${trade.side} ${trade.size} @ ${trade.price}`);
        console.log(`      Status: ${trade.status}`);
        console.log(`      Time: ${new Date(trade.timestamp).toLocaleString()}`);
      });
    }
    
    // 5. Test trade history
    console.log('\n5. Checking trade history...');
    const historyResponse = await axios.get('http://localhost:3001/api/trade-history', { timeout: 5000 });
    const history = historyResponse.data.data;
    
    console.log(`✅ Trade History:`);
    console.log(`   - Total Records: ${history.length}`);
    
    if (history.length > 0) {
      console.log('\n   Recent copy trades:');
      const recentCopyTrades = history.slice(0, 3);
      recentCopyTrades.forEach((trade, index) => {
        console.log(`   ${index + 1}. Master: ${trade.masterId} → Follower: ${trade.followerId}`);
        console.log(`      Symbol: ${trade.masterTrade.symbol}`);
        console.log(`      Side: ${trade.masterTrade.side}`);
        console.log(`      Size: ${trade.masterTrade.size}`);
        console.log(`      Success: ${trade.result.success}`);
        if (!trade.result.success) {
          console.log(`      Error: ${trade.result.error || 'Unknown error'}`);
        }
      });
    }
    
    // 6. Summary and analysis
    console.log('\n' + '=' .repeat(60));
    console.log('📊 ANALYSIS');
    console.log('=' .repeat(60));
    
    if (status.followers === 3 && status.copyRelationships === 3) {
      console.log('✅ Follower Configuration: PERFECT');
      console.log('   - All 3 followers are properly configured');
      console.log('   - All copy relationships are established');
    } else {
      console.log('❌ Follower Configuration: ISSUE');
      console.log(`   - Expected: 3 followers, 3 relationships`);
      console.log(`   - Actual: ${status.followers} followers, ${status.copyRelationships} relationships`);
    }
    
    if (monitorData.total_trades_found > 0) {
      console.log('✅ Trade Detection: WORKING');
      console.log(`   - Found ${monitorData.total_trades_found} recent trades`);
    } else {
      console.log('❌ Trade Detection: ISSUE');
      console.log('   - No recent trades found');
    }
    
    if (history.length > 0) {
      const successfulTrades = history.filter(t => t.result.success).length;
      const failedTrades = history.filter(t => !t.result.success).length;
      
      console.log('✅ Copy Trade Execution: ATTEMPTED');
      console.log(`   - Total attempts: ${history.length}`);
      console.log(`   - Successful: ${successfulTrades}`);
      console.log(`   - Failed: ${failedTrades}`);
      
      if (failedTrades > 0) {
        console.log('\n🔧 FAILURE ANALYSIS:');
        console.log('   Common reasons for copy trade failures:');
        console.log('   1. Invalid API credentials for followers');
        console.log('   2. Insufficient balance in follower accounts');
        console.log('   3. API rate limiting or IP restrictions');
        console.log('   4. Invalid order parameters (size, price, etc.)');
        console.log('   5. Market conditions (insufficient liquidity)');
      }
    } else {
      console.log('❌ Copy Trade Execution: NOT ATTEMPTED');
      console.log('   - No copy trades have been attempted yet');
      console.log('   - This could mean:');
      console.log('     * No new trades detected since server restart');
      console.log('     * Copy relationships not properly established');
      console.log('     * WebSocket connection issues');
    }
    
    // 7. Recommendations
    console.log('\n' + '=' .repeat(60));
    console.log('🔧 RECOMMENDATIONS');
    console.log('=' .repeat(60));
    
    if (history.length === 0) {
      console.log('1. Wait for new master trades to trigger copy execution');
      console.log('2. Check server logs for WebSocket connection status');
      console.log('3. Verify master trader is actively trading');
    } else if (history.filter(t => !t.result.success).length > 0) {
      console.log('1. Check follower API credentials validity');
      console.log('2. Verify follower account balances');
      console.log('3. Check IP whitelisting for follower API keys');
      console.log('4. Review order parameters and market conditions');
    } else {
      console.log('🎉 SUCCESS: Copy trading is working correctly!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 SOLUTION: Backend server is not running');
      console.log('   Run: node server.js');
    } else if (error.response?.status === 404) {
      console.log('\n🔧 SOLUTION: API endpoint not found');
      console.log('   Check if server.js is properly configured');
    } else {
      console.log('\n🔧 SOLUTION: Check server logs for detailed error information');
    }
  }
}

// Run the test
testCopyTradeExecution().catch(console.error); 