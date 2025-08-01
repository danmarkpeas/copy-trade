const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Delta Exchange API functions
function generateSignature(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

async function makeAuthenticatedRequest(apiKey, apiSecret, method, endpoint, payload = '', params = {}) {
  const timestamp = Date.now().toString();
  const message = timestamp + method + endpoint + payload;
  const signature = generateSignature(apiSecret, message);

  const url = `https://api.delta.exchange/v2${endpoint}`;
  const queryString = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
  const fullUrl = url + queryString;

  const headers = {
    'api-key': apiKey,
    'signature': signature,
    'timestamp': timestamp,
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(fullUrl, {
      method: method,
      headers: headers,
      body: payload ? payload : undefined
    });

    const data = await response.json();
    
    return {
      status: response.status,
      data: data,
      success: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      success: false
    };
  }
}

async function testAnneshanAPI() {
  console.log('🧪 TESTING ANNESHAN FOLLOWER API CREDENTIALS');
  console.log('============================================\n');

  try {
    // Get Anneshan follower from database
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_name', 'Anneshan')
      .limit(1);

    if (error) {
      console.error('❌ Error fetching Anneshan follower:', error);
      return;
    }

    if (!followers || followers.length === 0) {
      console.error('❌ Anneshan follower not found in database');
      return;
    }

    const anneshan = followers[0];
    console.log('👥 Found Anneshan follower:');
    console.log(`   Name: ${anneshan.follower_name}`);
    console.log(`   Status: ${anneshan.account_status}`);
    console.log(`   API Key: ${anneshan.api_key ? `${anneshan.api_key.substring(0, 8)}...` : 'NOT SET'}`);
    console.log(`   API Secret: ${anneshan.api_secret ? '***SET***' : 'NOT SET'}`);
    console.log('');

    if (!anneshan.api_key || !anneshan.api_secret) {
      console.error('❌ API credentials not set for Anneshan');
      return;
    }

    // Test 1: Get account information
    console.log('📊 Test 1: Getting account information...');
    const accountResult = await makeAuthenticatedRequest(
      anneshan.api_key,
      anneshan.api_secret,
      'GET',
      '/account'
    );

    console.log(`   Status: ${accountResult.status}`);
    if (accountResult.success) {
      console.log('   ✅ Account info retrieved successfully');
      console.log(`   Account ID: ${accountResult.data.id}`);
      console.log(`   Email: ${accountResult.data.email}`);
    } else {
      console.log('   ❌ Failed to get account info');
      console.log(`   Error: ${JSON.stringify(accountResult.data)}`);
    }
    console.log('');

    // Test 2: Get wallet balances
    console.log('💰 Test 2: Getting wallet balances...');
    const balancesResult = await makeAuthenticatedRequest(
      anneshan.api_key,
      anneshan.api_secret,
      'GET',
      '/wallet/balances'
    );

    console.log(`   Status: ${balancesResult.status}`);
    if (balancesResult.success) {
      console.log('   ✅ Balances retrieved successfully');
      const balances = balancesResult.data.result || [];
      console.log(`   Total currencies: ${balances.length}`);
      
      // Show USD and USDT balances
      const usdBalance = balances.find(b => b.currency === 'USD');
      const usdtBalance = balances.find(b => b.currency === 'USDT');
      
      if (usdBalance) {
        console.log(`   USD Balance: ${usdBalance.available_balance}`);
      }
      if (usdtBalance) {
        console.log(`   USDT Balance: ${usdtBalance.available_balance}`);
      }
    } else {
      console.log('   ❌ Failed to get balances');
      console.log(`   Error: ${JSON.stringify(balancesResult.data)}`);
    }
    console.log('');

    // Test 3: Get current positions
    console.log('📈 Test 3: Getting current positions...');
    const positionsResult = await makeAuthenticatedRequest(
      anneshan.api_key,
      anneshan.api_secret,
      'GET',
      '/positions'
    );

    console.log(`   Status: ${positionsResult.status}`);
    if (positionsResult.success) {
      console.log('   ✅ Positions retrieved successfully');
      const positions = positionsResult.data.result || [];
      console.log(`   Total positions: ${positions.length}`);
      
      if (positions.length > 0) {
        positions.forEach(pos => {
          console.log(`   - ${pos.symbol}: ${pos.size} (${pos.side})`);
        });
      } else {
        console.log('   No open positions');
      }
    } else {
      console.log('   ❌ Failed to get positions');
      console.log(`   Error: ${JSON.stringify(positionsResult.data)}`);
    }
    console.log('');

    // Test 4: Get order history
    console.log('📋 Test 4: Getting recent orders...');
    const ordersResult = await makeAuthenticatedRequest(
      anneshan.api_key,
      anneshan.api_secret,
      'GET',
      '/orders',
      '',
      { limit: 5 }
    );

    console.log(`   Status: ${ordersResult.status}`);
    if (ordersResult.success) {
      console.log('   ✅ Orders retrieved successfully');
      const orders = ordersResult.data.result || [];
      console.log(`   Recent orders: ${orders.length}`);
      
      if (orders.length > 0) {
        orders.slice(0, 3).forEach(order => {
          console.log(`   - ${order.symbol}: ${order.side} ${order.size} (${order.state})`);
        });
      } else {
        console.log('   No recent orders');
      }
    } else {
      console.log('   ❌ Failed to get orders');
      console.log(`   Error: ${JSON.stringify(ordersResult.data)}`);
    }
    console.log('');

    // Summary
    console.log('🎯 TEST SUMMARY');
    console.log('===============');
    console.log(`✅ API Key: ${anneshan.api_key ? 'SET' : 'NOT SET'}`);
    console.log(`✅ API Secret: ${anneshan.api_secret ? 'SET' : 'NOT SET'}`);
    console.log(`✅ Account Info: ${accountResult.success ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Balances: ${balancesResult.success ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Positions: ${positionsResult.success ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Orders: ${ordersResult.success ? 'WORKING' : 'FAILED'}`);

    if (accountResult.success && balancesResult.success) {
      console.log('\n🎉 Anneshan API credentials are working correctly!');
      console.log('✅ Ready for copy trading operations');
    } else {
      console.log('\n⚠️ Anneshan API credentials have issues');
      console.log('❌ May not be able to execute copy trades');
    }

  } catch (error) {
    console.error('❌ Error testing Anneshan API:', error.message);
  }
}

// Run the test
testAnneshanAPI(); 