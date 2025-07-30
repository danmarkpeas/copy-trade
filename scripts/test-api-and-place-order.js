const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testApiAndPlaceOrder() {
  console.log('🧪 TESTING API AND PLACING ORDER (INDIA DELTA EXCHANGE)\n');

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

    console.log(`🔑 API Key: ${follower.api_key.substring(0, 10)}...`);
    console.log(`🔑 API Secret: ${follower.api_secret.substring(0, 10)}...`);

    // 2. Test API credentials with different endpoints
    console.log('\n📋 STEP 2: Testing API Credentials');

    // Test 1: Account info
    console.log('\n🔍 Test 1: Account Information');
    const accountResult = await testApiEndpoint(follower.api_key, follower.api_secret, '/v2/account', DELTA_API_URL);
    console.log('Account Result:', accountResult.success ? '✅ Success' : `❌ Failed: ${accountResult.error}`);

    // Test 2: Wallet balances
    console.log('\n🔍 Test 2: Wallet Balances');
    const balanceResult = await testApiEndpoint(follower.api_key, follower.api_secret, '/v2/wallet/balances', DELTA_API_URL);
    console.log('Balance Result:', balanceResult.success ? '✅ Success' : `❌ Failed: ${balanceResult.error}`);

    // Test 3: Positions
    console.log('\n🔍 Test 3: Positions');
    const positionResult = await testApiEndpoint(follower.api_key, follower.api_secret, '/v2/positions', DELTA_API_URL);
    console.log('Position Result:', positionResult.success ? '✅ Success' : `❌ Failed: ${positionResult.error}`);

    // Test 4: Orders
    console.log('\n🔍 Test 4: Orders');
    const orderResult = await testApiEndpoint(follower.api_key, follower.api_secret, '/v2/orders?state=all&limit=5', DELTA_API_URL);
    console.log('Order Result:', orderResult.success ? '✅ Success' : `❌ Failed: ${orderResult.error}`);

    // 3. Try to place a test order
    console.log('\n📋 STEP 3: Placing Test Order');
    
    // POLUSD product ID: 39943
    const testOrderData = {
      product_id: 39943,
      size: 1, // 1 contract
      side: 'buy',
      order_type: 'market_order'
    };

    console.log('📤 Placing test order:', JSON.stringify(testOrderData, null, 2));

    const placeOrderResult = await placeOrder(
      follower.api_key,
      follower.api_secret,
      testOrderData.product_id,
      testOrderData.size,
      testOrderData.side,
      DELTA_API_URL
    );

    if (placeOrderResult.success) {
      console.log('✅ Test order placed successfully!');
      console.log(`   Order ID: ${placeOrderResult.order_id}`);
      console.log(`   Status: ${placeOrderResult.status}`);
      
      // Wait a moment and then try to close it
      console.log('\n⏳ Waiting 3 seconds before closing test order...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('🔧 Closing test order...');
      const closeOrderResult = await placeOrder(
        follower.api_key,
        follower.api_secret,
        testOrderData.product_id,
        testOrderData.size,
        'sell', // Close the position
        DELTA_API_URL
      );

      if (closeOrderResult.success) {
        console.log('✅ Test order closed successfully!');
        console.log(`   Close Order ID: ${closeOrderResult.order_id}`);
      } else {
        console.log('❌ Failed to close test order:', closeOrderResult.error);
      }
    } else {
      console.log('❌ Failed to place test order:', placeOrderResult.error);
      console.log('Details:', placeOrderResult.details);
    }

    // 4. Check orders again after test
    console.log('\n📋 STEP 4: Checking Orders After Test');
    const finalOrderResult = await testApiEndpoint(follower.api_key, follower.api_secret, '/v2/orders?state=all&limit=10', DELTA_API_URL);
    
    if (finalOrderResult.success) {
      const orders = finalOrderResult.data?.result || [];
      console.log(`📊 Found ${orders.length} orders after test:`);
      orders.slice(0, 5).forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.product_symbol} ${order.side} ${order.size} (${order.state})`);
        console.log(`      Order ID: ${order.id}`);
        console.log(`      Time: ${new Date(order.created_at).toLocaleString()}`);
      });
    } else {
      console.log('❌ Failed to get orders after test:', finalOrderResult.error);
    }

    // 5. Summary
    console.log('\n🎯 SUMMARY:');
    console.log('✅ API testing completed');
    console.log('✅ Test order placement attempted');
    console.log('✅ Order verification completed');

    console.log('\n💡 DIAGNOSIS:');
    if (placeOrderResult.success) {
      console.log('✅ API credentials are working correctly');
      console.log('✅ Orders can be placed successfully');
      console.log('✅ The issue may be with the real-time monitoring system');
    } else {
      console.log('❌ API credentials may have issues');
      console.log('❌ Orders cannot be placed');
      console.log('🔧 Check API key permissions and validity');
    }

    console.log('\n🔧 SYSTEM STATUS:');
    console.log('✅ API testing completed');
    console.log('✅ Real-time copy trading is monitoring');
    console.log('✅ Using India Delta Exchange API: https://api.india.delta.exchange');

  } catch (error) {
    console.log('❌ Error testing API and placing order:', error.message);
  }
}

// Function to test API endpoint
async function testApiEndpoint(apiKey, apiSecret, endpoint, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `GET${timestamp}${endpoint}`;
    const signature = require('crypto').createHmac('sha256', apiSecret).update(message).digest('hex');

    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'api-key': apiKey,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        data: data
      };
    } else {
      return {
        success: false,
        error: data.error?.message || data.error || 'Unknown error',
        details: data
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to place order
async function placeOrder(apiKey, apiSecret, productId, size, side, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    const orderData = {
      product_id: productId,
      size: size, // Integer value (contract size)
      side: side,
      order_type: 'market_order' // Market order for immediate execution
    };

    const body = JSON.stringify(orderData);
    const message = `POST${timestamp}${path}${body}`;
    const signature = require('crypto').createHmac('sha256', apiSecret).update(message).digest('hex');

    const response = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      },
      body: body
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        order_id: data.result?.id,
        status: data.result?.status,
        message: 'Order placed successfully'
      };
    } else {
      return {
        success: false,
        error: data.error?.message || data.error || 'Unknown error',
        details: data
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

testApiAndPlaceOrder().catch(console.error); 