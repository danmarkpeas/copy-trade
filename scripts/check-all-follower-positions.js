const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkAllFollowerPositions() {
  console.log('🔍 CHECKING ALL FOLLOWER POSITIONS\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Load follower
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (error || !followers || followers.length === 0) {
      throw new Error('No active followers found');
    }
    
    const follower = followers[0];
    console.log(`✅ Follower: ${follower.follower_name}`);
    
    // Check all positions
    console.log('\n📋 Checking all positions...');
    const allPositions = await getAllFollowerPositions(follower);
    
    if (allPositions && allPositions.length > 0) {
      console.log(`✅ Found ${allPositions.length} position(s):`);
      allPositions.forEach((position, index) => {
        console.log(`\n   📊 Position ${index + 1}:`);
        console.log(`      Symbol: ${position.product_symbol}`);
        console.log(`      Size: ${position.size}`);
        console.log(`      Side: ${position.size > 0 ? 'BUY' : 'SELL'}`);
        console.log(`      Entry Price: ${position.entry_price}`);
        console.log(`      Mark Price: ${position.mark_price}`);
        console.log(`      Unrealized PnL: ${position.unrealized_pnl}`);
        console.log(`      Margin: ${position.margin}`);
        
        if (position.size !== 0) {
          console.log(`      🚪 NEEDS CLOSING: ${position.size > 0 ? 'SELL' : 'BUY'} ${Math.abs(position.size)}`);
        } else {
          console.log(`      ✅ Already closed`);
        }
      });
    } else {
      console.log(`✅ No open positions found - all positions are closed`);
    }
    
    // Also check recent orders to see what was executed
    console.log('\n📋 Checking recent orders...');
    const recentOrders = await getRecentOrders(follower);
    
    if (recentOrders && recentOrders.length > 0) {
      console.log(`✅ Found ${recentOrders.length} recent order(s):`);
      recentOrders.slice(0, 5).forEach((order, index) => {
        console.log(`\n   📋 Order ${index + 1}:`);
        console.log(`      ID: ${order.id}`);
        console.log(`      Symbol: ${order.product_symbol}`);
        console.log(`      Side: ${order.side}`);
        console.log(`      Size: ${order.size}`);
        console.log(`      Status: ${order.state}`);
        console.log(`      Type: ${order.order_type}`);
        console.log(`      Created: ${order.created_at}`);
      });
    } else {
      console.log(`❌ No recent orders found`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function getAllFollowerPositions(follower) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/positions';
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
      // Handle both array and single object responses
      const positions = Array.isArray(data.result) ? data.result : [data.result];
      return positions.filter(pos => pos.size !== 0); // Only return non-zero positions
    } else {
      console.log(`❌ Failed to get positions:`, data);
      return [];
    }
  } catch (error) {
    console.error(`❌ Error getting positions:`, error.message);
    return [];
  }
}

async function getRecentOrders(follower) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
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
      // Handle both array and single object responses
      const orders = Array.isArray(data.result) ? data.result : [data.result];
      return orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Sort by newest first
    } else {
      console.log(`❌ Failed to get orders:`, data);
      return [];
    }
  } catch (error) {
    console.error(`❌ Error getting orders:`, error.message);
    return [];
  }
}

checkAllFollowerPositions().catch(console.error); 