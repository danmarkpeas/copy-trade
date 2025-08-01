const axios = require('axios');

async function testFollowerTradeExecution() {
  console.log('🧪 TESTING FOLLOWER TRADE EXECUTION');
  console.log('=' .repeat(60));
  
  try {
    // 1. Test backend connection
    console.log('1. Testing backend connection...');
    const backendResponse = await axios.get('http://localhost:3001', { timeout: 5000 });
    console.log('✅ Backend is running');
    
    // 2. Test copy trading status
    console.log('\n2. Testing copy trading status...');
    const statusResponse = await axios.get('http://localhost:3001/api/status', { timeout: 5000 });
    const status = statusResponse.data.data;
    
    console.log(`✅ Copy Trading Status:`);
    console.log(`   - Master Traders: ${status.masterTraders}`);
    console.log(`   - Followers: ${status.followers}`);
    console.log(`   - Copy Relationships: ${status.copyRelationships}`);
    console.log(`   - Total Trades: ${status.totalTrades}`);
    
    // 3. Test real-time monitoring
    console.log('\n3. Testing real-time monitoring...');
    const monitorResponse = await axios.post('http://localhost:3001/api/real-time-monitor', {
      broker_id: 'f9593e9d-b50d-447c-80e3-a79464be7dff'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    const monitorData = monitorResponse.data;
    console.log(`✅ Real-Time Monitoring:`);
    console.log(`   - Total Trades Found: ${monitorData.total_trades_found}`);
    console.log(`   - Active Followers: ${monitorData.active_followers}`);
    console.log(`   - Trades Copied: ${monitorData.trades_copied}`);
    
    // 4. Check if followers are properly configured
    console.log('\n4. Checking follower configuration...');
    if (status.followers > 0) {
      console.log('✅ Followers are configured in the system');
      console.log(`   - ${status.followers} followers active`);
      console.log(`   - ${status.copyRelationships} copy relationships established`);
    } else {
      console.log('❌ No followers configured');
    }
    
    // 5. Test trade history
    console.log('\n5. Testing trade history...');
    const historyResponse = await axios.get('http://localhost:3001/api/trade-history', { timeout: 5000 });
    const history = historyResponse.data.data;
    
    console.log(`✅ Trade History:`);
    console.log(`   - Total Records: ${history.length}`);
    
    if (history.length > 0) {
      const recentTrade = history[0];
      console.log(`   - Most Recent Trade:`);
      console.log(`     * Master: ${recentTrade.masterId}`);
      console.log(`     * Follower: ${recentTrade.followerId}`);
      console.log(`     * Symbol: ${recentTrade.masterTrade.symbol}`);
      console.log(`     * Side: ${recentTrade.masterTrade.side}`);
      console.log(`     * Size: ${recentTrade.masterTrade.size}`);
      console.log(`     * Success: ${recentTrade.result.success}`);
    }
    
    // 6. Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    const issues = [];
    
    if (status.followers === 0) {
      issues.push('❌ No followers configured');
    }
    
    if (status.copyRelationships === 0) {
      issues.push('❌ No copy relationships established');
    }
    
    if (monitorData.trades_copied === 0 && monitorData.total_trades_found > 0) {
      issues.push('❌ Trades detected but not copied to followers');
    }
    
    if (issues.length === 0) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('🎉 Follower trade execution is working correctly!');
      console.log('');
      console.log('📈 SYSTEM STATUS:');
      console.log(`   - Master Traders: ${status.masterTraders} ✅`);
      console.log(`   - Followers: ${status.followers} ✅`);
      console.log(`   - Copy Relationships: ${status.copyRelationships} ✅`);
      console.log(`   - Trades Detected: ${monitorData.total_trades_found} ✅`);
      console.log(`   - Trades Copied: ${monitorData.trades_copied} ✅`);
    } else {
      console.log('⚠️  ISSUES DETECTED:');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('');
      console.log('🔧 RECOMMENDATIONS:');
      console.log('   1. Check if followers have valid API credentials');
      console.log('   2. Verify copy relationships are established');
      console.log('   3. Check if master trader is actively trading');
      console.log('   4. Review server logs for error messages');
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
testFollowerTradeExecution().catch(console.error); 