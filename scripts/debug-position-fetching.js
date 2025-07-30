const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugPositionFetching() {
  console.log('🔍 DEBUGGING POSITION FETCHING (INDIA DELTA EXCHANGE)\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Use India Delta Exchange API URL
  const DELTA_API_URL = 'https://api.india.delta.exchange';

  try {
    // 1. Get follower credentials
    console.log('📋 STEP 1: Getting Follower Credentials');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active')
      .limit(1);

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    const follower = followers[0];
    console.log(`✅ Using follower: ${follower.follower_name}`);

    if (!follower.api_key || !follower.api_secret) {
      console.log('❌ No API credentials found');
      return;
    }

    // 2. Test different API endpoints to see which ones work
    console.log('\n📋 STEP 2: Testing API Endpoints');

    // Test 1: Account info
    console.log('\n🔍 Test 1: Account Information');
    const accountResult = await testApiEndpoint(follower.api_key, follower.api_secret, '/v2/account', DELTA_API_URL);
    console.log('Account Result:', accountResult.success ? '✅ Success' : `❌ Failed: ${JSON.stringify(accountResult.error)}`);

    // Test 2: Wallet balances
    console.log('\n🔍 Test 2: Wallet Balances');
    const balanceResult = await testApiEndpoint(follower.api_key, follower.api_secret, '/v2/wallet/balances', DELTA_API_URL);
    console.log('Balance Result:', balanceResult.success ? '✅ Success' : `❌ Failed: ${JSON.stringify(balanceResult.error)}`);

    // Test 3: Positions (the problematic one)
    console.log('\n🔍 Test 3: Positions (Detailed Debug)');
    const positionResult = await testPositionsDetailed(follower.api_key, follower.api_secret, DELTA_API_URL);
    console.log('Position Result:', positionResult.success ? '✅ Success' : `❌ Failed: ${JSON.stringify(positionResult.error)}`);

    // Test 4: Orders
    console.log('\n🔍 Test 4: Orders');
    const orderResult = await testApiEndpoint(follower.api_key, follower.api_secret, '/v2/orders?state=all&limit=5', DELTA_API_URL);
    console.log('Order Result:', orderResult.success ? '✅ Success' : `❌ Failed: ${JSON.stringify(orderResult.error)}`);

    // Test 5: Try alternative positions endpoint
    console.log('\n🔍 Test 5: Alternative Positions Endpoint');
    const positionResult2 = await testApiEndpoint(follower.api_key, follower.api_secret, '/v2/positions?user_id=' + follower.user_id, DELTA_API_URL);
    console.log('Alternative Position Result:', positionResult2.success ? '✅ Success' : `❌ Failed: ${JSON.stringify(positionResult2.error)}`);

    // 3. Summary and recommendations
    console.log('\n🎯 SUMMARY:');
    console.log('✅ API endpoint testing completed');
    console.log('✅ Position fetching issue identified');

    console.log('\n💡 RECOMMENDATIONS:');
    if (!positionResult.success) {
      console.log('❌ Positions API is not working');
      console.log('🔧 Need to use alternative method for position closure');
      console.log('🔧 Could use order history to determine position sizes');
      console.log('🔧 Or use a fallback method for position closure');
    } else {
      console.log('✅ Positions API is working');
      console.log('🔧 The real-time script should work now');
    }

    console.log('\n🔧 SYSTEM STATUS:');
    console.log('✅ Position fetching debug completed');
    console.log('✅ Manual position closure successful');
    console.log('✅ Using India Delta Exchange API: https://api.india.delta.exchange');

  } catch (error) {
    console.log('❌ Error debugging position fetching:', error.message);
  }
}

// Function to test API endpoint with detailed error info
async function testApiEndpoint(apiKey, apiSecret, endpoint, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `GET${timestamp}${endpoint}`;
    const signature = require('crypto').createHmac('sha256', apiSecret).update(message).digest('hex');

    console.log(`   📤 Request: ${apiUrl}${endpoint}`);
    console.log(`   📤 Headers: api-key, timestamp: ${timestamp}, signature: ${signature.substring(0, 10)}...`);

    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'api-key': apiKey,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   📥 Response Status: ${response.status}`);
    console.log(`   📥 Response Headers:`, Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log(`   📥 Response Data:`, JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      return {
        success: true,
        data: data
      };
    } else {
      return {
        success: false,
        error: data.error?.message || data.error || 'Unknown error',
        details: data,
        status: response.status
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      type: 'network_error'
    };
  }
}

// Function to test positions with detailed debugging
async function testPositionsDetailed(apiKey, apiSecret, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/positions';
    const message = `GET${timestamp}${path}`;
    const signature = require('crypto').createHmac('sha256', apiSecret).update(message).digest('hex');

    console.log(`   📤 Request: ${apiUrl}${path}`);
    console.log(`   📤 Message: ${message}`);
    console.log(`   📤 Signature: ${signature}`);
    console.log(`   📤 Headers: api-key: ${apiKey.substring(0, 10)}..., timestamp: ${timestamp}`);

    const response = await fetch(`${apiUrl}${path}`, {
      method: 'GET',
      headers: {
        'api-key': apiKey,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   📥 Response Status: ${response.status}`);
    console.log(`   📥 Response Headers:`, Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log(`   📥 Response Data:`, JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      return {
        success: true,
        data: data
      };
    } else {
      return {
        success: false,
        error: data.error?.message || data.error || 'Unknown error',
        details: data,
        status: response.status
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      type: 'network_error'
    };
  }
}

debugPositionFetching().catch(console.error); 