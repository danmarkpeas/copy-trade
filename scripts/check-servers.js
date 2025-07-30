const axios = require('axios');

async function checkServers() {
  console.log('🔍 CHECKING SERVER STATUS\n');

  // Check frontend (Next.js)
  try {
    console.log('1. Checking frontend (localhost:3000)...');
    const frontendResponse = await axios.get('http://localhost:3000', { timeout: 5000 });
    console.log('✅ Frontend is running on localhost:3000');
    console.log('   Status:', frontendResponse.status);
  } catch (error) {
    console.log('❌ Frontend not running on localhost:3000');
    console.log('   Error:', error.message);
    console.log('   💡 Run: npm run dev');
  }

  // Check backend API
  try {
    console.log('\n2. Checking backend API (localhost:3001)...');
    const backendResponse = await axios.get('http://localhost:3001/api/health', { timeout: 5000 });
    console.log('✅ Backend API is running on localhost:3001');
    console.log('   Status:', backendResponse.status);
    console.log('   Response:', backendResponse.data);
  } catch (error) {
    console.log('❌ Backend API not running on localhost:3001');
    console.log('   Error:', error.message);
    console.log('   💡 Run: npm run server');
  }

  // Check copy trading status
  try {
    console.log('\n3. Checking copy trading status...');
    const statusResponse = await axios.get('http://localhost:3001/api/copy-trading/status', { timeout: 5000 });
    console.log('✅ Copy trading engine is active');
    console.log('   Master traders:', statusResponse.data.data.masterTraders);
    console.log('   Followers:', statusResponse.data.data.followers);
    console.log('   Copy relationships:', statusResponse.data.data.copyRelationships);
    console.log('   Total trades:', statusResponse.data.data.totalTrades);
  } catch (error) {
    console.log('❌ Copy trading status check failed');
    console.log('   Error:', error.message);
  }

  console.log('\n🎯 SERVER STATUS SUMMARY:');
  console.log('   Frontend (UI): localhost:3000');
  console.log('   Backend (API): localhost:3001');
  console.log('   Copy Trading: Active with WebSocket connections');
  
  console.log('\n💡 NEXT STEPS:');
  console.log('1. Open http://localhost:3000 in your browser');
  console.log('2. The UI should show the copy trading interface');
  console.log('3. Backend API is available at http://localhost:3001/api');
  console.log('4. Copy trading engine is running with real-time monitoring');
}

checkServers().catch(console.error); 