const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function manualCloseAllPositions() {
  console.log('🚪 MANUALLY CLOSING ALL FOLLOWER POSITIONS\n');
  
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
    
    // Check for POLUSD position specifically (since we know it was opened)
    console.log('\n📋 Checking for POLUSD position...');
    
    // Try different approaches to get the position
    const position = await getPositionByProductId(follower, 39943); // POLUSD product ID
    
    if (position && position.size !== 0) {
      console.log(`✅ Found open position:`);
      console.log(`   Symbol: ${position.product_symbol}`);
      console.log(`   Size: ${position.size}`);
      console.log(`   Side: ${position.size > 0 ? 'BUY' : 'SELL'}`);
      console.log(`   Entry Price: ${position.entry_price}`);
      console.log(`   Unrealized PnL: ${position.unrealized_pnl}`);
      
      // Close the position
      console.log(`\n🚪 Closing position...`);
      const closeResult = await closePosition(follower, position);
      
      if (closeResult.success) {
        console.log(`✅ Position closed successfully!`);
        console.log(`   Order ID: ${closeResult.order_id}`);
        console.log(`   Status: ${closeResult.status}`);
      } else {
        console.log(`❌ Failed to close position: ${closeResult.error}`);
        console.log(`   Details:`, closeResult.details);
      }
    } else {
      console.log(`✅ No open POLUSD position found`);
      
      // Check if there are any other open positions
      console.log(`\n📋 Checking for any other open positions...`);
      const allPositions = await getAllPositions(follower);
      
      if (allPositions && allPositions.length > 0) {
        console.log(`Found ${allPositions.length} other position(s):`);
        for (const pos of allPositions) {
          if (pos.size !== 0) {
            console.log(`\n🚪 Closing ${pos.product_symbol} position...`);
            const closeResult = await closePosition(follower, pos);
            
            if (closeResult.success) {
              console.log(`✅ ${pos.product_symbol} position closed!`);
            } else {
              console.log(`❌ Failed to close ${pos.product_symbol}: ${closeResult.error}`);
            }
          }
        }
      } else {
        console.log(`✅ All positions are already closed`);
      }
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
      console.log(`❌ Failed to get position for product ${productId}:`, data);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error getting position:`, error.message);
    return null;
  }
}

async function getAllPositions(follower) {
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
      const positions = Array.isArray(data.result) ? data.result : [data.result];
      return positions.filter(pos => pos.size !== 0);
    } else {
      console.log(`❌ Failed to get all positions:`, data);
      return [];
    }
  } catch (error) {
    console.error(`❌ Error getting all positions:`, error.message);
    return [];
  }
}

async function closePosition(follower, position) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    // Determine the correct close side based on position direction
    const closeSide = position.size > 0 ? 'sell' : 'buy';
    const closeSize = Math.abs(position.size);
    
    console.log(`   Closing ${position.product_symbol}: ${position.size} -> ${closeSide} ${closeSize}`);
    
    const orderData = {
      product_id: position.product_id,
      size: closeSize,
      side: closeSide,
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

manualCloseAllPositions().catch(console.error); 