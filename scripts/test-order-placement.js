const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testOrderPlacement() {
  console.log('🧪 TESTING ORDER PLACEMENT (INDIA DELTA EXCHANGE)\n');

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

    // 2. Test different order formats
    console.log('\n📋 STEP 2: Testing Different Order Formats');

    // Test 1: Basic market order
    console.log('\n🔍 Test 1: Basic Market Order');
    const testOrder1 = {
      product_id: 39943, // POLUSD
      size: '0.01',
      side: 'buy',
      order_type: 'market_order'
    };

    const result1 = await placeOrder(follower.api_key, follower.api_secret, testOrder1, DELTA_API_URL);
    console.log('Result 1:', result1);

    // Test 2: Market order without price
    console.log('\n🔍 Test 2: Market Order Without Price');
    const testOrder2 = {
      product_id: 39943,
      size: '0.01',
      side: 'buy',
      order_type: 'market'
    };

    const result2 = await placeOrder(follower.api_key, follower.api_secret, testOrder2, DELTA_API_URL);
    console.log('Result 2:', result2);

    // Test 3: Limit order
    console.log('\n🔍 Test 3: Limit Order');
    const testOrder3 = {
      product_id: 39943,
      size: '0.01',
      side: 'buy',
      order_type: 'limit_order',
      price: '0.24'
    };

    const result3 = await placeOrder(follower.api_key, follower.api_secret, testOrder3, DELTA_API_URL);
    console.log('Result 3:', result3);

    // Test 4: Simple order format
    console.log('\n🔍 Test 4: Simple Order Format');
    const testOrder4 = {
      product_id: 39943,
      size: '0.01',
      side: 'buy'
    };

    const result4 = await placeOrder(follower.api_key, follower.api_secret, testOrder4, DELTA_API_URL);
    console.log('Result 4:', result4);

    // 3. Get product info to understand the schema
    console.log('\n📋 STEP 3: Getting Product Information');
    const productInfo = await getProductInfo(39943, DELTA_API_URL);
    console.log('Product Info:', productInfo);

    // 4. Summary
    console.log('\n🎯 SUMMARY:');
    console.log('✅ Order placement testing completed');
    console.log('✅ Check the results above to see which format works');

    console.log('\n💡 NEXT STEPS:');
    console.log('1. Check which order format was successful');
    console.log('2. Update the order placement function with the correct format');
    console.log('3. Run the real order execution script again');

  } catch (error) {
    console.log('❌ Error testing order placement:', error.message);
  }
}

// Function to place order
async function placeOrder(apiKey, apiSecret, orderData, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
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
        message: 'Order placed successfully',
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
      error: error.message
    };
  }
}

// Function to get product info
async function getProductInfo(productId, apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/v2/products/${productId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { error: error.message };
  }
}

testOrderPlacement().catch(console.error); 