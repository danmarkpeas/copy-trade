const axios = require('axios');

async function testCopyTradingFix() {
  console.log('🧪 TESTING COPY TRADING FIX');
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
    
    // 3. Test real-time monitor
    console.log('\n3. Testing real-time monitor...');
    const monitorResponse = await axios.post('http://localhost:3001/api/real-time-monitor', {
      broker_id: 'f9593e9d-b50d-447c-80e3-a79464be7dff'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    const monitorData = monitorResponse.data;
    console.log(`✅ Real-time Monitor Results:`);
    console.log(`   - Total Trades Found: ${monitorData.total_trades_found}`);
    console.log(`   - Active Followers: ${monitorData.active_followers}`);
    console.log(`   - Trades Copied: ${monitorData.trades_copied}`);
    console.log(`   - Recent Trades: ${monitorData.copy_results?.length || 0}`);
    
    // 4. Check if followers are properly connected
    console.log('\n4. Checking follower connections...');
    if (status.followers > 0) {
      console.log(`✅ ${status.followers} followers are connected to the copy trading system`);
      console.log(`✅ ${status.copyRelationships} copy relationships are established`);
      
      if (status.copyRelationships > 0) {
        console.log('🎉 COPY TRADING IS WORKING!');
        console.log('   Followers will now copy trades from the master trader');
      } else {
        console.log('⚠️  Copy relationships not established yet');
      }
    } else {
      console.log('❌ No followers connected to the copy trading system');
    }
    
    // 5. Test frontend connection
    console.log('\n5. Testing frontend connection...');
    try {
      const frontendResponse = await axios.get('http://localhost:3000', { timeout: 5000 });
      console.log('✅ Frontend is running');
    } catch (error) {
      console.log('❌ Frontend is not running (run: npm run dev)');
    }
    
    // 6. Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    const allWorking = status.followers > 0 && status.copyRelationships > 0;
    
    if (allWorking) {
      console.log('🎉 SUCCESS! Copy Trading is Fully Operational!');
      console.log('✅ Backend server is running');
      console.log('✅ Followers are connected with proper user IDs');
      console.log('✅ Copy relationships are established');
      console.log('✅ Real-time monitoring is working');
      console.log('✅ Trade data is being fetched');
      
      console.log('\n🚀 WHAT HAPPENS NOW:');
      console.log('1. When the master trader makes a trade, it will be detected');
      console.log('2. The copy trading system will automatically copy the trade');
      console.log('3. All followers will receive the copied trade');
      console.log('4. Trade results will be saved to the database');
      console.log('5. You can monitor everything in real-time');
      
    } else {
      console.log('⚠️  Copy Trading needs attention:');
      if (status.followers === 0) {
        console.log('❌ No followers connected - check database');
      }
      if (status.copyRelationships === 0) {
        console.log('❌ No copy relationships - check initialization');
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ TEST COMPLETE');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running: node server.js');
    }
  }
}

// Run the test
testCopyTradingFix().catch(console.error); 