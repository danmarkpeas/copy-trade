const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkAndCloseFollowerPositions() {
  console.log('🔍 CHECKING AND CLOSING FOLLOWER POSITIONS (INDIA DELTA EXCHANGE)\n');

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

    // 2. Check all possible positions
    console.log('\n📋 STEP 2: Checking All Possible Positions');
    
    // Common product IDs to check
    const productIds = [
      { id: 39943, symbol: 'POLUSD' },
      { id: 1, symbol: 'BTCUSD' },
      { id: 2, symbol: 'ETHUSD' },
      { id: 3, symbol: 'SOLUSD' },
      { id: 4, symbol: 'ADAUSD' },
      { id: 5, symbol: 'DOTUSD' },
      { id: 6, symbol: 'DYDXUSD' }
    ];

    let foundPositions = [];

    for (const product of productIds) {
      console.log(`\n🔍 Checking ${product.symbol} (ID: ${product.id})`);
      
      const positionSize = await getFollowerPositionSize(follower, product.symbol, product.id, DELTA_API_URL);
      
      if (positionSize > 0) {
        console.log(`✅ Found ${product.symbol} position: ${positionSize} contracts`);
        foundPositions.push({
          symbol: product.symbol,
          size: positionSize,
          product_id: product.id
        });
      } else {
        console.log(`📊 No ${product.symbol} position found`);
      }
    }

    // 3. Close any found positions
    if (foundPositions.length > 0) {
      console.log(`\n📋 STEP 3: Closing ${foundPositions.length} Position(s)`);
      
      for (const position of foundPositions) {
        console.log(`\n🔧 Closing ${position.symbol} position: ${position.size} contracts`);
        
        // Try both sell and buy to close (we don't know the side)
        const closeSides = ['sell', 'buy'];
        
        for (const side of closeSides) {
          console.log(`   Trying ${side} order...`);
          
          const orderResult = await placeOrder(
            follower.api_key,
            follower.api_secret,
            position.product_id,
            position.size,
            side,
            DELTA_API_URL
          );

          if (orderResult.success) {
            console.log(`   ✅ Successfully closed ${position.symbol} position with ${side} order`);
            console.log(`      Order ID: ${orderResult.order_id}`);
            console.log(`      Status: ${orderResult.status}`);
            break; // Stop trying other sides if this worked
          } else {
            console.log(`   ❌ Failed to close with ${side}: ${orderResult.error}`);
          }
        }
      }
    } else {
      console.log('\n📋 STEP 3: No positions found to close');
    }

    // 4. Check recent orders to see what happened
    console.log('\n📋 STEP 4: Checking Recent Orders');
    const ordersResult = await getRecentOrders(follower.api_key, follower.api_secret, DELTA_API_URL);
    
    if (ordersResult.success) {
      const orders = ordersResult.data?.result || [];
      const recentOrders = orders.slice(0, 10); // Last 10 orders
      
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
        if (order.meta_data && order.meta_data.pnl) {
          console.log(`      P&L: ${order.meta_data.pnl}`);
        }
      });
    } else {
      console.log(`❌ Failed to get orders: ${ordersResult.error}`);
    }

    // 5. Final verification
    console.log('\n📋 STEP 5: Final Position Verification');
    let remainingPositions = 0;
    
    for (const product of productIds) {
      const positionSize = await getFollowerPositionSize(follower, product.symbol, product.id, DELTA_API_URL);
      if (positionSize > 0) {
        console.log(`❌ ${product.symbol} position still open: ${positionSize} contracts`);
        remainingPositions++;
      }
    }

    if (remainingPositions === 0) {
      console.log('✅ All positions have been closed successfully!');
    } else {
      console.log(`⚠️ ${remainingPositions} position(s) still remain open`);
    }

    // 6. Summary
    console.log('\n🎯 SUMMARY:');
    console.log(`✅ Position check completed`);
    console.log(`✅ Found ${foundPositions.length} open position(s)`);
    console.log(`✅ Closed ${foundPositions.length} position(s)`);
    console.log(`✅ ${remainingPositions} position(s) remaining`);

    console.log('\n💡 NEXT STEPS:');
    if (remainingPositions === 0) {
      console.log('✅ All positions closed - system is ready for new trades');
    } else {
      console.log('⚠️ Some positions remain - manual intervention may be needed');
    }

  } catch (error) {
    console.log('❌ Error checking and closing follower positions:', error.message);
  }
}

// Function to get follower position size
async function getFollowerPositionSize(follower, symbol, productId, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = `/v2/positions?product_id=${productId}`;
    const message = `GET${timestamp}${path}`;
    const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

    const response = await fetch(`${apiUrl}${path}`, {
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
      const position = Array.isArray(data.result) ? data.result[0] : data.result;
      if (position && position.size !== undefined) {
        return Math.abs(parseFloat(position.size));
      }
    }
    
    return 0;
  } catch (error) {
    return 0;
  }
}

// Function to place order
async function placeOrder(apiKey, apiSecret, productId, size, side, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    const orderData = {
      product_id: productId,
      size: size,
      side: side,
      order_type: 'market_order'
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

checkAndCloseFollowerPositions().catch(console.error); 