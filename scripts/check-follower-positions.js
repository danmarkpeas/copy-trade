const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkFollowerPositions() {
  console.log('🔍 CHECKING FOLLOWER POSITIONS\n');
  
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
    
    // Check POLUSD position specifically
    console.log('\n📋 Checking POLUSD position...');
    const position = await getFollowerPosition(follower, 'POLUSD');
    
    if (position) {
      console.log(`✅ Position found:`);
      console.log(`   Symbol: ${position.product_symbol}`);
      console.log(`   Size: ${position.size}`);
      console.log(`   Side: ${position.size > 0 ? 'BUY' : 'SELL'}`);
      console.log(`   Entry Price: ${position.entry_price}`);
      console.log(`   Mark Price: ${position.mark_price}`);
      console.log(`   Unrealized PnL: ${position.unrealized_pnl}`);
      
      if (position.size !== 0) {
        console.log(`\n🚪 POSITION NEEDS TO BE CLOSED:`);
        console.log(`   Current Size: ${position.size}`);
        console.log(`   Close Side: ${position.size > 0 ? 'SELL' : 'BUY'}`);
        console.log(`   Close Size: ${Math.abs(position.size)}`);
        
        // Test the close order
        console.log(`\n📋 Testing close order...`);
        const closeResult = await placeCloseOrder(follower, 'POLUSD', Math.abs(position.size), position.size > 0 ? 'sell' : 'buy');
        
        if (closeResult.success) {
          console.log(`✅ Close order placed successfully!`);
          console.log(`   Order ID: ${closeResult.order_id}`);
          console.log(`   Status: ${closeResult.status}`);
        } else {
          console.log(`❌ Close order failed: ${closeResult.error}`);
          console.log(`   Details:`, closeResult.details);
        }
      } else {
        console.log(`✅ Position already closed (size = 0)`);
      }
    } else {
      console.log(`❌ No POLUSD position found`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function getFollowerPosition(follower, symbol) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  const productIds = {
    'POLUSD': 39943,
    'ADAUSD': 39944,
    'DOTUSD': 39945
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
      // Handle both array and single object responses
      const positions = Array.isArray(data.result) ? data.result : [data.result];
      return positions.find(pos => pos.product_symbol === symbol) || null;
    } else {
      console.log(`❌ Failed to get positions:`, data);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error getting position:`, error.message);
    return null;
  }
}

async function placeCloseOrder(follower, symbol, size, closeSide) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  const productIds = {
    'POLUSD': 39943,
    'ADAUSD': 39944,
    'DOTUSD': 39945
  };
  
  try {
    const productId = productIds[symbol];
    if (!productId) {
      return { success: false, error: `Unknown product: ${symbol}` };
    }
    
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    const orderData = {
      product_id: productId,
      size: size,
      side: closeSide, // Use the correct side based on position
      order_type: 'market_order',
      time_in_force: 'good_til_cancelled'
    };

    const body = JSON.stringify(orderData);
    const message = `POST${timestamp}${path}${body}`;
    const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

    const response = await fetch(`${DELTA_API_URL}${path}`, {
      method: 'POST',
      headers: {
        'api-key': follower.api_key,
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
        message: 'Close order placed successfully'
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

checkFollowerPositions().catch(console.error); 