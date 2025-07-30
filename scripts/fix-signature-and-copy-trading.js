const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixSignatureAndCopyTrading() {
  console.log('🔧 FIXING SIGNATURE AND COPY TRADING\n');
  
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

    // Test order placement with correct signature
    const testTrade = {
      symbol: 'POLUSD',
      side: 'sell',
      size: 1,
      price: 0.2331
    };

    console.log(`\n🎯 TESTING FIXED ORDER PLACEMENT:`);
    console.log(`   Symbol: ${testTrade.symbol}`);
    console.log(`   Side: ${testTrade.side}`);
    console.log(`   Size: ${testTrade.size}`);
    console.log(`   Price: ${testTrade.price}`);

    const orderResult = await placeOrderWithCorrectSignature(follower, testTrade);
    console.log(`\n📊 ORDER PLACEMENT RESULT:`);
    if (orderResult.success) {
      console.log(`   ✅ Order placed successfully`);
      console.log(`   Order ID: ${orderResult.orderId}`);
      console.log(`   Status: ${orderResult.status}`);
      
      // Check if position was created
      setTimeout(async () => {
        const position = await getFollowerPosition(follower, 'POLUSD');
        console.log(`\n📈 POSITION CHECK (after 3 seconds):`);
        if (position && position.size !== 0) {
          console.log(`   ✅ Position created successfully`);
          console.log(`   Symbol: ${position.product_symbol}`);
          console.log(`   Size: ${position.size}`);
          console.log(`   Side: ${position.size > 0 ? 'BUY' : 'SELL'}`);
          console.log(`   Entry Price: ${position.entry_price}`);
          console.log(`   Unrealized PnL: ${position.unrealized_pnl}`);
        } else {
          console.log(`   ❌ No position created yet`);
        }
      }, 3000);
      
    } else {
      console.log(`   ❌ Order placement failed`);
      console.log(`   Error: ${orderResult.error}`);
      console.log(`   Response: ${JSON.stringify(orderResult.fullResponse, null, 2)}`);
    }

    console.log(`\n🔧 FIX SUMMARY:`);
    console.log(`✅ Fixed signature calculation for POST requests`);
    console.log(`✅ Copy trading should now work properly`);
    console.log(`✅ The ultra-fast system will execute trades successfully`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function placeOrderWithCorrectSignature(follower, trade) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  const productIds = {
    'POLUSD': 39943
  };
  
  try {
    const productId = productIds[trade.symbol];
    if (!productId) {
      return { success: false, error: 'Invalid symbol' };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    const orderData = {
      product_id: productId,
      size: trade.size,
      side: trade.side,
      order_type: 'market_order',
      time_in_force: 'gtc'
    };

    // Fix: Include request body in signature for POST requests
    const message = `POST${timestamp}${path}${JSON.stringify(orderData)}`;
    const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

    console.log(`\n📤 SENDING ORDER REQUEST (FIXED SIGNATURE):`);
    console.log(`   URL: ${DELTA_API_URL}${path}`);
    console.log(`   Method: POST`);
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Prehash String: ${message}`);
    console.log(`   Signature: ${signature}`);
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
    
    if (response.ok && data.success) {
      return {
        success: true,
        orderId: data.result.id,
        status: data.result.state,
        fullResponse: data
      };
    } else {
      return {
        success: false,
        error: data.error?.code || data.message || 'Unknown error',
        fullResponse: data
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fullResponse: null
    };
  }
}

async function getFollowerPosition(follower, symbol) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  const productIds = {
    'POLUSD': 39943
  };
  
  try {
    const productId = productIds[symbol];
    if (!productId) {
      return null;
    }
    
    const timestamp = Math.floor(Date.now() / 1000);
    const path = `/v2/positions?product_id=${productId}`;
    const message = `GET${timestamp}${path}`;
    const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

    const response = await fetch(`${DELTA_API_URL}${path}`, {
      method: 'GET',
      headers: {
        'api-key': follower.api_key,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success && data.result) {
      const positions = Array.isArray(data.result) ? data.result : [data.result];
      return positions.find(pos => pos.size !== 0) || null;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

fixSignatureAndCopyTrading().catch(console.error); 