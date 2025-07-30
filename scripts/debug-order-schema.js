const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugOrderSchema() {
  console.log('🔍 DEBUGGING ORDER SCHEMA ERRORS (INDIA DELTA EXCHANGE)\n');

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

    // 2. Test order with detailed error logging
    console.log('\n📋 STEP 2: Testing Order with Detailed Error Logging');

    const testOrder = {
      product_id: 39943,
      size: '0.01',
      side: 'buy',
      order_type: 'market_order'
    };

    console.log('📤 Sending order:', JSON.stringify(testOrder, null, 2));

    const result = await placeOrderWithDetails(follower.api_key, follower.api_secret, testOrder, DELTA_API_URL);
    
    console.log('\n📥 Full Response:');
    console.log(JSON.stringify(result, null, 2));

    // 3. Check existing orders to see the format
    console.log('\n📋 STEP 3: Checking Existing Orders Format');
    const existingOrders = await getExistingOrders(follower.api_key, follower.api_secret, DELTA_API_URL);
    console.log('Existing Orders:', JSON.stringify(existingOrders, null, 2));

    // 4. Check the API documentation or examples
    console.log('\n📋 STEP 4: Checking API Documentation');
    console.log('💡 The India Delta Exchange API might have different requirements:');
    console.log('1. Different field names');
    console.log('2. Different order types');
    console.log('3. Required fields that are missing');
    console.log('4. Different data types (string vs number)');

    // 5. Try different approaches
    console.log('\n📋 STEP 5: Trying Different Approaches');

    // Try with numeric values
    console.log('\n🔍 Test with numeric values:');
    const testOrderNumeric = {
      product_id: 39943,
      size: 0.01,
      side: 'buy',
      order_type: 'market_order'
    };
    const resultNumeric = await placeOrderWithDetails(follower.api_key, follower.api_secret, testOrderNumeric, DELTA_API_URL);
    console.log('Numeric Result:', JSON.stringify(resultNumeric, null, 2));

    // Try with different order type
    console.log('\n🔍 Test with different order type:');
    const testOrderLimit = {
      product_id: 39943,
      size: '0.01',
      side: 'buy',
      order_type: 'limit',
      price: '0.24'
    };
    const resultLimit = await placeOrderWithDetails(follower.api_key, follower.api_secret, testOrderLimit, DELTA_API_URL);
    console.log('Limit Result:', JSON.stringify(resultLimit, null, 2));

    // Try minimal order
    console.log('\n🔍 Test with minimal order:');
    const testOrderMinimal = {
      product_id: 39943,
      size: '0.01',
      side: 'buy'
    };
    const resultMinimal = await placeOrderWithDetails(follower.api_key, follower.api_secret, testOrderMinimal, DELTA_API_URL);
    console.log('Minimal Result:', JSON.stringify(resultMinimal, null, 2));

    console.log('\n🎯 SUMMARY:');
    console.log('✅ Schema debugging completed');
    console.log('✅ Check the detailed error messages above');

  } catch (error) {
    console.log('❌ Error debugging order schema:', error.message);
  }
}

// Function to place order with detailed logging
async function placeOrderWithDetails(apiKey, apiSecret, orderData, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    const body = JSON.stringify(orderData);

    console.log(`\n🔧 Request Details:`);
    console.log(`   URL: ${apiUrl}${path}`);
    console.log(`   Method: POST`);
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Body: ${body}`);

    const message = `POST${timestamp}${path}${body}`;
    const signature = require('crypto').createHmac('sha256', apiSecret).update(message).digest('hex');

    console.log(`   Message: ${message}`);
    console.log(`   Signature: ${signature}`);

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

    console.log(`\n📡 Response Details:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);

    const data = await response.json();

    return {
      success: response.ok && data.success,
      status: response.status,
      statusText: response.statusText,
      data: data,
      error: data.error,
      schema_errors: data.error?.context?.schema_errors || null
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to get existing orders
async function getExistingOrders(apiKey, apiSecret, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders?state=all&limit=5';
    const message = `GET${timestamp}${path}`;
    const signature = require('crypto').createHmac('sha256', apiSecret).update(message).digest('hex');

    const response = await fetch(`${apiUrl}${path}`, {
      method: 'GET',
      headers: {
        'api-key': apiKey,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { error: error.message };
  }
}

debugOrderSchema().catch(console.error); 