require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

async function fixPositionClosure() {
  console.log('🔧 FIXING POSITION CLOSURE ISSUE\n');
  
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // 1. Get active followers
    console.log('📋 1. GETTING ACTIVE FOLLOWERS');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');
    
    if (followersError || !followers || followers.length === 0) {
      throw new Error('No active followers found');
    }
    
    const follower = followers[0];
    console.log(`   ✅ Found follower: ${follower.follower_name}`);
    
    // 2. Get follower's current positions
    console.log('\n📊 2. CHECKING FOLLOWER POSITIONS');
    const positions = await getFollowerPositions(follower);
    
    if (positions && positions.length > 0) {
      console.log(`   📋 Found ${positions.length} open position(s):`);
      positions.forEach(pos => {
        console.log(`      📊 ${pos.product_symbol}: ${pos.size} contracts @ ${pos.entry_price}`);
      });
      
      // 3. Close each position
      console.log('\n🚪 3. CLOSING FOLLOWER POSITIONS');
      for (const position of positions) {
        console.log(`   🔧 Closing ${position.product_symbol} position...`);
        
        const result = await closeFollowerPosition(follower, position);
        if (result.success) {
          console.log(`   ✅ Successfully closed ${position.product_symbol} position`);
        } else {
          console.log(`   ❌ Failed to close ${position.product_symbol}: ${result.error}`);
        }
      }
    } else {
      console.log('   ✅ No open positions found');
    }
    
    // 4. Verify positions are closed
    console.log('\n🔍 4. VERIFYING POSITIONS CLOSED');
    const finalPositions = await getFollowerPositions(follower);
    
    if (finalPositions && finalPositions.length > 0) {
      console.log(`   ⚠️  Still have ${finalPositions.length} open position(s):`);
      finalPositions.forEach(pos => {
        console.log(`      📊 ${pos.product_symbol}: ${pos.size} contracts`);
      });
    } else {
      console.log('   ✅ All positions successfully closed');
    }
    
    console.log('\n✅ Position closure fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing position closure:', error.message);
  }
}

async function getFollowerPositions(follower) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/positions';
    const prehashString = `GET${timestamp}${path}`;
    const signature = generateSignature(prehashString, follower.api_secret);

    const response = await fetch(`https://api.india.delta.exchange${path}`, {
      method: 'GET',
      headers: {
        'api-key': follower.api_key,
        'timestamp': timestamp.toString(),
        'signature': signature
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.result) {
        const positions = Array.isArray(data.result) ? data.result : [data.result];
        return positions.filter(pos => Math.abs(parseFloat(pos.size)) > 0);
      }
    }
    return [];
  } catch (error) {
    console.error('Error getting positions:', error.message);
    return [];
  }
}

async function closeFollowerPosition(follower, position) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    // Determine the side to close the position
    const closeSide = parseFloat(position.size) > 0 ? 'sell' : 'buy';
    const closeSize = Math.abs(parseFloat(position.size));
    
    const orderData = {
      product_id: position.product_id,
      size: closeSize,
      side: closeSide,
      order_type: 'market_order',
      time_in_force: 'gtc'
    };

    const message = `POST${timestamp}${path}${JSON.stringify(orderData)}`;
    const signature = generateSignature(message, follower.api_secret);

    const response = await fetch(`https://api.india.delta.exchange${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': follower.api_key,
        'timestamp': timestamp.toString(),
        'signature': signature
      },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      return {
        success: true,
        orderId: data.result.id,
        message: `Closed ${position.product_symbol} position`
      };
    } else {
      return {
        success: false,
        error: data.error?.code || data.message || 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function generateSignature(message, secret) {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

// Run the fix
fixPositionClosure().catch(console.error); 