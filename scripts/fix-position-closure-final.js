require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

async function fixPositionClosureFinal() {
  console.log('🔧 FINAL POSITION CLOSURE FIX\n');
  
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
    
    // 2. Get follower's current positions with detailed logging
    console.log('\n📊 2. CHECKING FOLLOWER POSITIONS (DETAILED)');
    const positions = await getFollowerPositionsDetailed(follower);
    
    if (positions && positions.length > 0) {
      console.log(`   📋 Found ${positions.length} open position(s):`);
      positions.forEach((pos, index) => {
        console.log(`      📊 Position ${index + 1}:`);
        console.log(`         Symbol: ${pos.product_symbol}`);
        console.log(`         Size: ${pos.size} contracts`);
        console.log(`         Entry Price: ${pos.entry_price}`);
        console.log(`         Product ID: ${pos.product_id || 'MISSING'}`);
        console.log(`         Raw position data:`, JSON.stringify(pos, null, 2));
      });
      
      // 3. Close each position with proper product_id handling
      console.log('\n🚪 3. CLOSING FOLLOWER POSITIONS (WITH FIX)');
      for (const position of positions) {
        console.log(`   🔧 Closing ${position.product_symbol} position...`);
        
        // If position doesn't have product_id, get it from the symbol
        if (!position.product_id) {
          console.log(`   ⚠️  Position missing product_id, fetching from symbol...`);
          const productId = await getProductIdFromSymbol(position.product_symbol);
          if (productId) {
            position.product_id = productId;
            console.log(`   ✅ Found product_id: ${productId} for ${position.product_symbol}`);
          } else {
            console.log(`   ❌ Could not find product_id for ${position.product_symbol}`);
            continue;
          }
        }
        
        const closeResult = await closeFollowerPosition(follower, position);
        if (closeResult.success) {
          console.log(`   ✅ Successfully closed ${position.product_symbol} position`);
          console.log(`      Order ID: ${closeResult.orderId}`);
        } else {
          console.log(`   ❌ Failed to close ${position.product_symbol}: ${closeResult.error}`);
          
          // Try with reduced size if insufficient margin
          if (closeResult.error && closeResult.error.includes('insufficient_margin')) {
            console.log(`   🔧 Retrying with reduced size...`);
            const reducedPosition = { ...position, size: 1 * (position.size > 0 ? 1 : -1) };
            const retryResult = await closeFollowerPosition(follower, reducedPosition);
            
            if (retryResult.success) {
              console.log(`   ✅ Successfully closed with reduced size`);
            } else {
              console.log(`   ❌ Reduced size also failed: ${retryResult.error}`);
            }
          }
        }
      }
    } else {
      console.log('   ✅ No open positions found');
    }
    
    // 4. Verify positions are closed
    console.log('\n🔍 4. VERIFYING POSITIONS CLOSED');
    const finalPositions = await getFollowerPositionsDetailed(follower);
    
    if (finalPositions && finalPositions.length > 0) {
      console.log(`   ⚠️  Still have ${finalPositions.length} open position(s):`);
      finalPositions.forEach(pos => {
        console.log(`      📊 ${pos.product_symbol}: ${pos.size} contracts`);
      });
    } else {
      console.log('   ✅ All positions successfully closed');
    }
    
    console.log('\n✅ Final position closure fix completed!');
    
  } catch (error) {
    console.error('❌ Error in final position closure fix:', error.message);
  }
}

async function getFollowerPositionsDetailed(follower) {
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
      console.log(`   📡 API Response:`, JSON.stringify(data, null, 2));
      
      if (data.success && data.result) {
        const positions = Array.isArray(data.result) ? data.result : [data.result];
        return positions.filter(pos => Math.abs(parseFloat(pos.size)) > 0);
      }
    } else {
      console.log(`   ❌ API Error: ${response.status} - ${response.statusText}`);
    }
    return [];
  } catch (error) {
    console.error('Error getting positions:', error.message);
    return [];
  }
}

async function getProductIdFromSymbol(symbol) {
  try {
    const response = await fetch('https://api.india.delta.exchange/v2/products');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.result) {
        const product = data.result.find(p => p.symbol === symbol && p.state === 'live');
        return product ? product.id : null;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting product ID:', error.message);
    return null;
  }
}

async function closeFollowerPosition(follower, position) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    const closeSide = parseFloat(position.size) > 0 ? 'sell' : 'buy';
    const closeSize = Math.abs(parseFloat(position.size));
    
    const orderData = {
      product_id: position.product_id,
      size: closeSize,
      side: closeSide,
      order_type: 'market_order',
      time_in_force: 'gtc'
    };

    console.log(`   📤 Order data:`, JSON.stringify(orderData, null, 2));

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
    console.log(`   📥 Response:`, JSON.stringify(data, null, 2));
    
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

// Run the final fix
fixPositionClosureFinal().catch(console.error); 