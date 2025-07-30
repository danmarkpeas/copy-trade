// Test Delta Exchange Connectivity
// Run this with: node scripts/test-delta-connectivity.js

async function testDeltaConnectivity() {
  console.log('🔍 Testing Delta Exchange connectivity...\n');
  
  // Test 1: Public time endpoint
  console.log('1️⃣ Testing public time endpoint...');
  try {
    const response = await fetch('https://api.delta.exchange/v2/time', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Public endpoint working!');
      console.log('   Server time:', data.result.server_time);
      console.log('   Local time:', Math.floor(Date.now() / 1000));
      console.log('   Difference:', Math.floor(Date.now() / 1000) - data.result.server_time, 'seconds');
    } else {
      console.log('❌ Public endpoint failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Public endpoint error:', error.message);
  }
  
  console.log('\n2️⃣ Testing private endpoint (without auth)...');
  try {
    const response = await fetch('https://api.delta.exchange/v2/positions/margined', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      console.log('✅ Private endpoint accessible (should not happen without auth)');
    } else {
      const errorText = await response.text();
      console.log('✅ Private endpoint correctly requires auth:', response.status);
      console.log('   Error:', errorText.substring(0, 100) + '...');
    }
  } catch (error) {
    console.log('❌ Private endpoint error:', error.message);
  }
  
  console.log('\n3️⃣ Testing network connectivity...');
  try {
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      console.log('✅ General internet connectivity working');
    } else {
      console.log('❌ General internet connectivity failed');
    }
  } catch (error) {
    console.log('❌ General internet connectivity error:', error.message);
  }
}

testDeltaConnectivity().catch(console.error); 