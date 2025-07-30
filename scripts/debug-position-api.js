require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

async function debugPositionAPI() {
  console.log('🔍 DEBUGGING POSITION API\n');
  
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // 1. Get follower credentials
    console.log('📋 1. GETTING FOLLOWER CREDENTIALS');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');
    
    if (followersError || !followers || followers.length === 0) {
      throw new Error('No active followers found');
    }
    
    const follower = followers[0];
    console.log(`   ✅ Using follower: ${follower.follower_name}`);
    
    // 2. Test different API endpoints
    console.log('\n🔍 2. TESTING DIFFERENT API ENDPOINTS');
    
    // Test 1: /v2/positions
    console.log('   📡 Testing /v2/positions...');
    await testPositionEndpoint(follower, '/v2/positions');
    
    // Test 2: /v2/positions/ (with trailing slash)
    console.log('\n   📡 Testing /v2/positions/...');
    await testPositionEndpoint(follower, '/v2/positions/');
    
    // Test 3: /v2/positions with different headers
    console.log('\n   📡 Testing /v2/positions with minimal headers...');
    await testPositionEndpointMinimal(follower, '/v2/positions');
    
    // Test 4: Check if we need to use a different base URL
    console.log('\n   📡 Testing with different base URL...');
    await testPositionEndpoint(follower, '/v2/positions', 'https://api.delta.exchange');
    
    // 3. Test balance API to verify credentials work
    console.log('\n💰 3. TESTING BALANCE API (to verify credentials)');
    await testBalanceAPI(follower);
    
    // 4. Test products API to see the structure
    console.log('\n📦 4. TESTING PRODUCTS API');
    await testProductsAPI();
    
  } catch (error) {
    console.error('❌ Error debugging position API:', error.message);
  }
}

async function testPositionEndpoint(follower, path, baseUrl = 'https://api.india.delta.exchange') {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `GET${timestamp}${path}`;
    const signature = generateSignature(message, follower.api_secret);

    console.log(`      📤 Request: ${baseUrl}${path}`);
    console.log(`      📤 Headers: api-key, timestamp, signature, Content-Type`);

    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'api-key': follower.api_key,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    console.log(`      📥 Response Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`      ✅ Success! Found ${data.result ? (Array.isArray(data.result) ? data.result.length : 1) : 0} positions`);
      if (data.result && Array.isArray(data.result) && data.result.length > 0) {
        console.log(`      📊 Sample position:`, JSON.stringify(data.result[0], null, 2));
      }
    } else {
      const errorText = await response.text();
      console.log(`      ❌ Error response: ${errorText}`);
    }
  } catch (error) {
    console.log(`      ❌ Exception: ${error.message}`);
  }
}

async function testPositionEndpointMinimal(follower, path) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `GET${timestamp}${path}`;
    const signature = generateSignature(message, follower.api_secret);

    console.log(`      📤 Request: https://api.india.delta.exchange${path}`);
    console.log(`      📤 Headers: api-key, timestamp, signature (no Content-Type)`);

    const response = await fetch(`https://api.india.delta.exchange${path}`, {
      method: 'GET',
      headers: {
        'api-key': follower.api_key,
        'timestamp': timestamp.toString(),
        'signature': signature
      }
    });

    console.log(`      📥 Response Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`      ✅ Success! Found ${data.result ? (Array.isArray(data.result) ? data.result.length : 1) : 0} positions`);
    } else {
      const errorText = await response.text();
      console.log(`      ❌ Error response: ${errorText}`);
    }
  } catch (error) {
    console.log(`      ❌ Exception: ${error.message}`);
  }
}

async function testBalanceAPI(follower) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/wallet/balances';
    const message = `GET${timestamp}${path}`;
    const signature = generateSignature(message, follower.api_secret);

    const response = await fetch(`https://api.india.delta.exchange${path}`, {
      method: 'GET',
      headers: {
        'api-key': follower.api_key,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   📥 Balance API Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Balance API works! Found ${data.result ? data.result.length : 0} balances`);
      if (data.result) {
        const usdBalance = data.result.find(b => b.asset_symbol === 'USD');
        console.log(`   💰 USD Balance: ${usdBalance ? usdBalance.available_balance : 'Not found'}`);
      }
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Balance API Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`   ❌ Balance API Exception: ${error.message}`);
  }
}

async function testProductsAPI() {
  try {
    const response = await fetch('https://api.india.delta.exchange/v2/products');
    
    console.log(`   📥 Products API Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Products API works! Found ${data.result ? data.result.length : 0} products`);
      if (data.result && data.result.length > 0) {
        const sampleProduct = data.result[0];
        console.log(`   📦 Sample product:`, JSON.stringify(sampleProduct, null, 2));
      }
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Products API Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`   ❌ Products API Exception: ${error.message}`);
  }
}

function generateSignature(message, secret) {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

// Run the debug
debugPositionAPI().catch(console.error); 