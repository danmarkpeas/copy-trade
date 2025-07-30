const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixClosePosition() {
  console.log('🔧 FIXING POSITION CLOSING\n');
  
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
    
    // Get the position details
    const position = await getPositionByProductId(follower, 39943);
    
    if (position && position.size !== 0) {
      console.log(`\n📊 Position Details:`);
      console.log(`   Size: ${position.size}`);
      console.log(`   Side: ${position.size > 0 ? 'BUY' : 'SELL'}`);
      console.log(`   Entry Price: ${position.entry_price}`);
      
      // Close the position with correct product ID
      console.log(`\n🚪 Closing position...`);
      const closeResult = await closePositionWithProductId(follower, 39943, position);
      
      if (closeResult.success) {
        console.log(`✅ Position closed successfully!`);
        console.log(`   Order ID: ${closeResult.order_id}`);
        console.log(`   Status: ${closeResult.status}`);
      } else {
        console.log(`❌ Failed to close position: ${closeResult.error}`);
        if (closeResult.details) {
          console.log(`   Details:`, JSON.stringify(closeResult.details, null, 2));
        }
      }
    } else {
      console.log(`✅ No open position found`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function getPositionByProductId(follower, productId) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  
  try {
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
      console.log(`❌ Failed to get position:`, data);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error getting position:`, error.message);
    return null;
  }
}

async function closePositionWithProductId(follower, productId, position) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    // Determine the correct close side based on position direction
    const closeSide = position.size > 0 ? 'sell' : 'buy';
    const closeSize = Math.abs(position.size);
    
    console.log(`   Closing position: ${position.size} -> ${closeSide} ${closeSize} (Product ID: ${productId})`);
    
    const orderData = {
      product_id: productId, // Use the known product ID
      size: closeSize,
      side: closeSide,
      order_type: 'market_order',
      time_in_force: 'gtc' // Fixed: use 'gtc' instead of 'good_til_cancelled'
    };

    console.log(`   Order data:`, JSON.stringify(orderData, null, 2));

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

fixClosePosition().catch(console.error); 