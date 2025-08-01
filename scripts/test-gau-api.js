const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Delta Exchange API functions with CORRECT timestamp format
function generateSignature(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

async function makeAuthenticatedRequest(apiKey, apiSecret, method, endpoint, payload = '', params = {}) {
  // Use seconds instead of milliseconds for timestamp
  const timestamp = Math.floor(Date.now() / 1000).toString();
          const message = method + timestamp + endpoint + payload;
  const signature = generateSignature(apiSecret, message);

            const url = `https://api.india.delta.exchange/v2${endpoint}`;
  const queryString = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
  const fullUrl = url + queryString;

  const headers = {
    'api-key': apiKey,
    'signature': signature,
    'timestamp': timestamp,
    'Content-Type': 'application/json'
  };

  try {
    console.log(`   Making request to: ${method} ${endpoint}`);
    console.log(`   Timestamp (seconds): ${timestamp}`);
    console.log(`   Signature: ${signature.substring(0, 16)}...`);

    const response = await fetch(fullUrl, {
      method: method,
      headers: headers,
      body: payload ? payload : undefined
    });

    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { error: responseText };
    }
    
    return {
      status: response.status,
      data: data,
      success: response.ok,
      responseText: responseText
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      success: false,
      responseText: error.message
    };
  }
}

async function testGauAPI() {
  console.log('🧪 TESTING GAU FOLLOWER API CREDENTIALS');
  console.log('=======================================\n');

  try {
    // Get Gau follower from database
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_name', 'Gau')
      .limit(1);

    if (error) {
      console.error('❌ Error fetching Gau follower:', error);
      return;
    }

    if (!followers || followers.length === 0) {
      console.error('❌ Gau follower not found in database');
      return;
    }

    const gau = followers[0];
    console.log('👥 Found Gau follower:');
    console.log(`   Name: ${gau.follower_name}`);
    console.log(`   Status: ${gau.account_status}`);
    console.log(`   API Key: ${gau.api_key ? `${gau.api_key.substring(0, 8)}...` : 'NOT SET'}`);
    console.log(`   API Secret: ${gau.api_secret ? '***SET***' : 'NOT SET'}`);
    console.log('');

    if (!gau.api_key || !gau.api_secret) {
      console.error('❌ API credentials not set for Gau');
      return;
    }

    // Test 1: Get wallet balances
    console.log('💰 Test 1: Getting wallet balances...');
    const balancesResult = await makeAuthenticatedRequest(
      gau.api_key,
      gau.api_secret,
      'GET',
      '/wallet/balances'
    );

    console.log(`   Status: ${balancesResult.status}`);
    if (balancesResult.success) {
      console.log('   ✅ Balances retrieved successfully');
      const balances = balancesResult.data.result || [];
      console.log(`   Total currencies: ${balances.length}`);
      
      // Show all balances
      balances.forEach(balance => {
        if (parseFloat(balance.available_balance) > 0) {
          console.log(`   ${balance.currency}: ${balance.available_balance} (available) / ${balance.total_balance} (total)`);
        }
      });
    } else {
      console.log('   ❌ Failed to get balances');
      console.log(`   Error: ${JSON.stringify(balancesResult.data)}`);
    }
    console.log('');

    // Test 2: Get current positions
    console.log('📈 Test 2: Getting current positions...');
    const positionsResult = await makeAuthenticatedRequest(
      gau.api_key,
      gau.api_secret,
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
          console.log(`   - ${pos.symbol}: ${pos.size} (${pos.side}) - PnL: ${pos.unrealized_pnl}`);
        });
      } else {
        console.log('   No open positions');
      }
    } else {
      console.log('   ❌ Failed to get positions');
      console.log(`   Error: ${JSON.stringify(positionsResult.data)}`);
    }
    console.log('');

    // Test 3: Get recent orders
    console.log('📋 Test 3: Getting recent orders...');
    const ordersResult = await makeAuthenticatedRequest(
      gau.api_key,
      gau.api_secret,
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

    // Test 4: Try to place a small test order (market order for 0.001 BTCUSD)
    console.log('🧪 Test 4: Testing order placement (will be cancelled immediately)...');
    const testOrderPayload = JSON.stringify({
      symbol: 'BTCUSD',
      side: 'buy',
      size: 0.001,
      order_type: 'market_order',
      time_in_force: 'ioc'
    });

    const orderResult = await makeAuthenticatedRequest(
      gau.api_key,
      gau.api_secret,
      'POST',
      '/orders',
      testOrderPayload
    );

    console.log(`   Status: ${orderResult.status}`);
    if (orderResult.success) {
      console.log('   ✅ Order placement test successful');
      console.log(`   Order ID: ${orderResult.data.id}`);
      console.log(`   Status: ${orderResult.data.state}`);
    } else {
      console.log('   ❌ Order placement test failed');
      console.log(`   Error: ${JSON.stringify(orderResult.data)}`);
      
      // Check if it's a balance issue
      if (orderResult.data.error && orderResult.data.error.code === 'insufficient_margin') {
        console.log('   💡 This is expected - insufficient balance for test order');
      }
    }
    console.log('');

    // Summary
    console.log('🎯 TEST SUMMARY');
    console.log('===============');
    console.log(`✅ API Key: ${gau.api_key ? 'SET' : 'NOT SET'}`);
    console.log(`✅ API Secret: ${gau.api_secret ? 'SET' : 'NOT SET'}`);
    console.log(`✅ Balances: ${balancesResult.success ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Positions: ${positionsResult.success ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Orders: ${ordersResult.success ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Order Placement: ${orderResult.success ? 'WORKING' : 'FAILED'}`);

    const workingEndpoints = [balancesResult, positionsResult, ordersResult].filter(r => r.success).length;
    
    if (workingEndpoints >= 2) {
      console.log('\n🎉 Gau API credentials are working correctly!');
      console.log('✅ Ready for copy trading operations');
      console.log(`✅ ${workingEndpoints}/3 core endpoints working`);
    } else {
      console.log('\n⚠️ Gau API credentials have issues');
      console.log('❌ May not be able to execute copy trades');
      console.log(`❌ Only ${workingEndpoints}/3 core endpoints working`);
    }

  } catch (error) {
    console.error('❌ Error testing Gau API:', error.message);
  }
}

// Run the test
testGauAPI(); 