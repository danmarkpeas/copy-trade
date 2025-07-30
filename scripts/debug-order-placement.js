const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugOrderPlacement() {
  console.log('🔍 DEBUGGING ORDER PLACEMENT FAILURE\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get active followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.error('❌ No active followers found');
      return;
    }

    const follower = followers[0];
    console.log(`👤 Testing follower: ${follower.follower_name}`);

    // Test order placement with detailed error logging
    const testTrade = {
      symbol: 'POLUSD',
      side: 'sell',
      size: 1,
      price: 0.2331
    };

    console.log(`\n🎯 TESTING ORDER PLACEMENT:`);
    console.log(`   Symbol: ${testTrade.symbol}`);
    console.log(`   Side: ${testTrade.side}`);
    console.log(`   Size: ${testTrade.size}`);
    console.log(`   Price: ${testTrade.price}`);

    const orderResult = await placeOrderWithDebug(follower, testTrade);
    console.log(`\n📊 ORDER PLACEMENT RESULT:`);
    console.log(`   Success: ${orderResult.success}`);
    console.log(`   Error: ${orderResult.error}`);
    console.log(`   Response Status: ${orderResult.responseStatus}`);
    console.log(`   Full Response: ${JSON.stringify(orderResult.fullResponse, null, 2)}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function placeOrderWithDebug(follower, trade) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  const productIds = {
    'POLUSD': 39943
  };
  
  try {
    const productId = productIds[trade.symbol];
    if (!productId) {
      return { 
        success: false, 
        error: 'Invalid symbol',
        responseStatus: 'N/A',
        fullResponse: null
      };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    const message = `POST${timestamp}${path}`;
    const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

    const orderData = {
      product_id: productId,
      size: trade.size,
      side: trade.side,
      order_type: 'market_order',
      time_in_force: 'gtc'
    };

    console.log(`\n📤 SENDING ORDER REQUEST:`);
    console.log(`   URL: ${DELTA_API_URL}${path}`);
    console.log(`   Method: POST`);
    console.log(`   Headers: api-key, timestamp, signature`);
    console.log(`   Body: ${JSON.stringify(orderData, null, 2)}`);

    const response = await fetch(`${DELTA_API_URL}${path}`, {
      method: 'POST',
      headers: {
        'api-key': follower.api_key,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();
    
    console.log(`\n📥 RECEIVED RESPONSE:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);
    console.log(`   Body: ${JSON.stringify(data, null, 2)}`);
    
    if (response.ok && data.success) {
      return {
        success: true,
        orderId: data.result.id,
        status: data.result.state,
        error: null,
        responseStatus: response.status,
        fullResponse: data
      };
    } else {
      return {
        success: false,
        error: data.message || data.error || 'Unknown error',
        responseStatus: response.status,
        fullResponse: data
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseStatus: 'N/A',
      fullResponse: null
    };
  }
}

debugOrderPlacement().catch(console.error); 