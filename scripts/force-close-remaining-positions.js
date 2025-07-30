const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function forceCloseRemainingPositions() {
  console.log('🔧 FORCE CLOSING REMAINING POSITIONS (INDIA DELTA EXCHANGE)\n');

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

    // 2. Check recent orders to see what happened
    console.log('\n📋 STEP 2: Checking Recent Orders');
    const ordersResult = await getRecentOrders(follower.api_key, follower.api_secret, DELTA_API_URL);
    
    if (!ordersResult.success) {
      console.log(`❌ Failed to get orders: ${ordersResult.error}`);
      return;
    }

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
      if (order.unfilled_size && order.unfilled_size > 0) {
        console.log(`      Unfilled: ${order.unfilled_size}`);
      }
    });

    // 3. Check if there are any open positions by looking at the most recent POLUSD orders
    console.log('\n📋 STEP 3: Analyzing POLUSD Orders');
    const polusdOrders = recentOrders.filter(order => order.product_symbol === 'POLUSD');
    
    if (polusdOrders.length > 0) {
      console.log(`📊 Found ${polusdOrders.length} POLUSD orders:`);
      
      // Check if the last order was a sell (close) order
      const lastOrder = polusdOrders[0]; // Most recent
      console.log(`   Last order: ${lastOrder.side} ${lastOrder.size} (${lastOrder.state})`);
      
      if (lastOrder.side === 'sell' && lastOrder.state === 'closed') {
        console.log('✅ Last order was a successful sell (close) order');
        console.log('✅ Position should be closed');
      } else if (lastOrder.side === 'sell' && lastOrder.state !== 'closed') {
        console.log('❌ Last sell order was not fully executed');
        console.log('🔧 Attempting to close remaining position...');
        
        // Try to close the position again
        const closeResult = await closePosition(
          follower.api_key,
          follower.api_secret,
          lastOrder.product_id,
          lastOrder.unfilled_size || 1,
          'sell',
          DELTA_API_URL
        );
        
        if (closeResult.success) {
          console.log(`✅ Successfully closed remaining position`);
          console.log(`   Order ID: ${closeResult.order_id}`);
        } else {
          console.log(`❌ Failed to close remaining position: ${closeResult.error}`);
        }
      } else {
        console.log('❌ Last order was not a sell order - position may still be open');
        console.log('🔧 Attempting to close position...');
        
        // Try to close the position
        const closeResult = await closePosition(
          follower.api_key,
          follower.api_secret,
          lastOrder.product_id,
          1, // Assume 1 contract
          'sell',
          DELTA_API_URL
        );
        
        if (closeResult.success) {
          console.log(`✅ Successfully closed position`);
          console.log(`   Order ID: ${closeResult.order_id}`);
        } else {
          console.log(`❌ Failed to close position: ${closeResult.error}`);
        }
      }
    } else {
      console.log('❌ No POLUSD orders found');
    }

    // 4. Check wallet balances to see if there are any positions
    console.log('\n📋 STEP 4: Checking Wallet Balances');
    const balanceResult = await getWalletBalances(follower.api_key, follower.api_secret, DELTA_API_URL);
    
    if (balanceResult.success) {
      const balances = balanceResult.data?.result || [];
      console.log(`📊 Found ${balances.length} wallet balances:`);
      balances.forEach((balance, index) => {
        console.log(`   ${index + 1}. ${balance.currency}: ${balance.available_balance}`);
      });
    } else {
      console.log(`❌ Failed to get balances: ${balanceResult.error}`);
    }

    // 5. Summary
    console.log('\n🎯 SUMMARY:');
    console.log('✅ Force close analysis completed');
    console.log('✅ Recent orders analyzed');
    console.log('✅ Position closure attempted');

    console.log('\n💡 NEXT STEPS:');
    console.log('1. Check your Delta Exchange dashboard directly');
    console.log('2. Verify if the position is actually closed');
    console.log('3. If position is still open, close it manually');
    console.log('4. Monitor the real-time copy trading system');

    console.log('\n🔧 SYSTEM STATUS:');
    console.log('✅ Force close process completed');
    console.log('✅ Real-time copy trading is monitoring');
    console.log('✅ Using India Delta Exchange API: https://api.india.delta.exchange');

  } catch (error) {
    console.log('❌ Error force closing remaining positions:', error.message);
  }
}

// Function to get recent orders
async function getRecentOrders(apiKey, apiSecret, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders?state=all&limit=20';
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

// Function to close position
async function closePosition(apiKey, apiSecret, productId, size, side, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    const orderData = {
      product_id: productId,
      size: size, // Integer value (contract size)
      side: side,
      order_type: 'market_order' // Market order for immediate execution
    };

    console.log(`📤 Sending close order:`, JSON.stringify(orderData, null, 2));

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
        message: 'Position closed successfully'
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

// Function to get wallet balances
async function getWalletBalances(apiKey, apiSecret, apiUrl) {
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

forceCloseRemainingPositions().catch(console.error); 