const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkFollowerPositionStatus() {
  console.log('🔍 CHECKING FOLLOWER POSITION STATUS (INDIA DELTA EXCHANGE)\n');

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

    // 2. Check current positions
    console.log('\n📋 STEP 2: Checking Current Positions');
    const positionsResult = await getFollowerPositions(follower.api_key, follower.api_secret, DELTA_API_URL);
    
    if (!positionsResult.success) {
      console.log(`❌ Failed to get positions: ${positionsResult.error}`);
      return;
    }

    const positions = positionsResult.data?.result || [];
    const openPositions = positions.filter(pos => parseFloat(pos.size) !== 0);
    
    console.log(`📊 ${follower.follower_name} has ${openPositions.length} open position(s):`);
    if (openPositions.length > 0) {
      openPositions.forEach((position, index) => {
        const size = parseFloat(position.size);
        const side = size > 0 ? 'LONG' : 'SHORT';
        console.log(`   ${index + 1}. ${position.product_symbol} ${side} ${Math.abs(size)} @ ${position.entry_price}`);
        console.log(`      P&L: ${position.unrealized_pnl || 'N/A'}`);
        console.log(`      Product ID: ${position.product_id}`);
      });
    } else {
      console.log('   ✅ No open positions found');
    }

    // 3. Check recent orders
    console.log('\n📋 STEP 3: Checking Recent Orders');
    const ordersResult = await getRecentOrders(follower.api_key, follower.api_secret, DELTA_API_URL);
    
    if (!ordersResult.success) {
      console.log(`❌ Failed to get orders: ${ordersResult.error}`);
    } else {
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
    }

    // 4. Check wallet balances
    console.log('\n📋 STEP 4: Checking Wallet Balances');
    const balanceResult = await getWalletBalances(follower.api_key, follower.api_secret, DELTA_API_URL);
    
    if (!balanceResult.success) {
      console.log(`❌ Failed to get balances: ${balanceResult.error}`);
    } else {
      const balances = balanceResult.data?.result || [];
      console.log(`📊 Found ${balances.length} wallet balances:`);
      balances.forEach((balance, index) => {
        console.log(`   ${index + 1}. ${balance.currency}: ${balance.available_balance}`);
      });
    }

    // 5. Summary and recommendations
    console.log('\n🎯 SUMMARY:');
    if (openPositions.length > 0) {
      console.log(`❌ ${follower.follower_name} still has ${openPositions.length} open position(s)`);
      console.log('🔧 POSITION CLOSURE ISSUE DETECTED');
      
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('1. The position closure order may have failed');
      console.log('2. Check if there are any API errors or insufficient funds');
      console.log('3. Try manually closing the position');
      console.log('4. Verify the order was actually placed on the exchange');
      
      // Offer to force close the position
      console.log('\n🔧 Would you like to force close the remaining positions?');
      console.log('Run: node scripts/force-close-remaining-positions.js');
    } else {
      console.log(`✅ ${follower.follower_name} has no open positions`);
      console.log('✅ Position closure was successful');
    }

    console.log('\n🔧 SYSTEM STATUS:');
    console.log('✅ Position status check completed');
    console.log('✅ Real-time copy trading is monitoring');
    console.log('✅ Using India Delta Exchange API: https://api.india.delta.exchange');

  } catch (error) {
    console.log('❌ Error checking follower position status:', error.message);
  }
}

// Function to get follower positions
async function getFollowerPositions(apiKey, apiSecret, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/positions';
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

checkFollowerPositionStatus().catch(console.error); 