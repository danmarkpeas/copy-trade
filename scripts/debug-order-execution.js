const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugOrderExecution() {
  console.log('🔍 DEBUGGING ORDER EXECUTION (INDIA DELTA EXCHANGE)\n');

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

    // 2. Test the exact order that failed
    console.log('\n📋 STEP 2: Testing Failed Order Execution');
    
    // Based on the logs, the failed order was:
    // POLUSD buy 10 contracts (1 * 10 = 10 contracts)
    const productId = 39943; // POLUSD
    const size = 10; // 10 contracts
    const side = 'buy';
    
    console.log(`🔧 Testing order: ${side} ${size} contracts of POLUSD`);
    console.log(`📤 Product ID: ${productId}`);
    console.log(`📤 Size: ${size} contracts`);
    console.log(`📤 Side: ${side}`);
    
    const orderResult = await placeOrderDetailed(
      follower.api_key,
      follower.api_secret,
      productId,
      size,
      side,
      DELTA_API_URL
    );

    console.log(`📥 Order Result:`, JSON.stringify(orderResult, null, 2));

    if (orderResult.success) {
      console.log(`✅ Order execution successful!`);
      console.log(`   Order ID: ${orderResult.order_id}`);
      console.log(`   Status: ${orderResult.status}`);
    } else {
      console.log(`❌ Order execution failed:`);
      console.log(`   Error: ${orderResult.error}`);
      if (orderResult.details) {
        console.log(`   Details:`, JSON.stringify(orderResult.details, null, 2));
      }
    }

    // 3. Test with smaller size
    console.log('\n📋 STEP 3: Testing with Smaller Size');
    
    const smallerSize = 1; // 1 contract
    
    console.log(`🔧 Testing order: ${side} ${smallerSize} contract of POLUSD`);
    
    const orderResult2 = await placeOrderDetailed(
      follower.api_key,
      follower.api_secret,
      productId,
      smallerSize,
      side,
      DELTA_API_URL
    );

    console.log(`📥 Order Result (smaller):`, JSON.stringify(orderResult2, null, 2));

    // 4. Check wallet balance
    console.log('\n📋 STEP 4: Checking Wallet Balance');
    
    const balanceResult = await getWalletBalance(follower.api_key, follower.api_secret, DELTA_API_URL);
    
    if (balanceResult.success) {
      console.log(`✅ Wallet Balance:`, JSON.stringify(balanceResult.data, null, 2));
    } else {
      console.log(`❌ Failed to get wallet balance: ${balanceResult.error}`);
    }

    // 5. Summary
    console.log('\n🎯 SUMMARY:');
    console.log('✅ Order execution debugging completed');
    console.log('✅ Detailed error analysis performed');
    console.log('✅ Wallet balance checked');

    console.log('\n💡 RECOMMENDATIONS:');
    if (orderResult.success) {
      console.log('✅ Order execution is working');
      console.log('🔧 The real-time script error might be a display issue');
    } else {
      console.log('❌ Order execution has issues');
      console.log('🔧 Check the detailed error above');
      console.log('🔧 Verify wallet balance and permissions');
    }

  } catch (error) {
    console.log('❌ Error debugging order execution:', error.message);
  }
}

// Function to place order with detailed logging
async function placeOrderDetailed(apiKey, apiSecret, productId, size, side, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    const orderData = {
      product_id: productId,
      size: size,
      side: side,
      order_type: 'market_order'
    };

    console.log(`   📤 Order Data:`, JSON.stringify(orderData, null, 2));

    const body = JSON.stringify(orderData);
    const message = `POST${timestamp}${path}${body}`;
    const signature = require('crypto').createHmac('sha256', apiSecret).update(message).digest('hex');

    console.log(`   📤 Message: ${message}`);
    console.log(`   📤 Signature: ${signature.substring(0, 20)}...`);

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

    console.log(`   📥 Response Status: ${response.status}`);
    console.log(`   📥 Response Headers:`, Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log(`   📥 Response Data:`, JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      return {
        success: true,
        order_id: data.result?.id,
        status: data.result?.state,
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
      error: error.message,
      type: 'network_error'
    };
  }
}

// Function to get wallet balance
async function getWalletBalance(apiKey, apiSecret, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/wallet/balances';
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

    if (response.ok && data.success) {
      return {
        success: true,
        data: data
      };
    } else {
      return {
        success: false,
        error: data.error?.message || data.error || 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

debugOrderExecution().catch(console.error); 