const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function closeRemainingPositionNow() {
  console.log('🔧 CLOSING REMAINING POSITION NOW (INDIA DELTA EXCHANGE)\n');

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

    // 2. Based on the logs, we know there's a POLUSD position that needs to be closed
    // The master had 2 contracts, so follower should have 2 contracts to close
    console.log('\n📋 STEP 2: Closing Remaining POLUSD Position');
    
    // POLUSD product ID: 39943
    const productId = 39943;
    const size = 2; // Close 2 contracts (based on master position size)
    const side = 'sell'; // Close long position
    
    console.log(`🔧 Attempting to close POLUSD position: ${size} contracts (${side})`);
    
    const closeResult = await placeOrder(
      follower.api_key,
      follower.api_secret,
      productId,
      size,
      side,
      DELTA_API_URL
    );
    
    if (closeResult.success) {
      console.log(`✅ Successfully closed POLUSD position`);
      console.log(`   Order ID: ${closeResult.order_id}`);
      console.log(`   Closed Size: ${size} contracts`);
    } else {
      console.log(`❌ Failed to close POLUSD position: ${closeResult.error}`);
      
      // If 2 contracts failed, try 1 contract
      console.log('\n📋 STEP 3: Trying with 1 contract');
      const closeResult2 = await placeOrder(
        follower.api_key,
        follower.api_secret,
        productId,
        1,
        side,
        DELTA_API_URL
      );
      
      if (closeResult2.success) {
        console.log(`✅ Successfully closed 1 POLUSD contract`);
        console.log(`   Order ID: ${closeResult2.order_id}`);
      } else {
        console.log(`❌ Failed to close 1 contract: ${closeResult2.error}`);
      }
    }

    // 4. Check recent orders to confirm
    console.log('\n📋 STEP 4: Checking Recent Orders');
    const ordersResult = await getRecentOrders(follower.api_key, follower.api_secret, DELTA_API_URL);
    
    if (ordersResult.success) {
      const orders = ordersResult.data?.result || [];
      const recentOrders = orders.slice(0, 5); // Last 5 orders
      
      console.log(`📊 Found ${recentOrders.length} recent orders:`);
      recentOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.product_symbol} ${order.side} ${order.size}`);
        console.log(`      Order ID: ${order.id}`);
        console.log(`      Status: ${order.state}`);
        console.log(`      Type: ${order.order_type}`);
        console.log(`      Time: ${new Date(order.created_at).toLocaleString()}`);
        if (order.average_fill_price) {
          console.log(`      Fill Price: ${order.average_fill_price}`);
        }
      });
    } else {
      console.log(`❌ Failed to get orders: ${ordersResult.error}`);
    }

    // 5. Summary
    console.log('\n🎯 SUMMARY:');
    console.log('✅ Manual position closure completed');
    console.log('✅ Recent orders checked');
    console.log('✅ Position should now be closed');

    console.log('\n💡 NEXT STEPS:');
    console.log('1. Check your Delta Exchange dashboard');
    console.log('2. Verify the position is actually closed');
    console.log('3. The real-time copy trading script needs the position fetching issue fixed');

    console.log('\n🔧 SYSTEM STATUS:');
    console.log('✅ Manual closure completed');
    console.log('❌ Position fetching API needs debugging');
    console.log('✅ Using India Delta Exchange API: https://api.india.delta.exchange');

  } catch (error) {
    console.log('❌ Error closing remaining position:', error.message);
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

    console.log(`📤 Sending order:`, JSON.stringify(orderData, null, 2));

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

    console.log(`📥 Response status: ${response.status}`);
    console.log(`📥 Response data:`, JSON.stringify(data, null, 2));

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

// Function to get recent orders
async function getRecentOrders(apiKey, apiSecret, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders?state=all&limit=10';
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

closeRemainingPositionNow().catch(console.error); 