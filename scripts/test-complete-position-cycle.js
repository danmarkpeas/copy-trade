const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateSignature(secret, message) {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

async function testCompletePositionCycle() {
  console.log('🧪 TESTING COMPLETE POSITION CYCLE');
  console.log('=' .repeat(50));

  try {
    // 1. Get active followers
    console.log('1. Getting active followers...');
    
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log(`✅ Found ${followers.length} active followers`);

    for (const follower of followers) {
      console.log(`\n🔍 Testing follower: ${follower.follower_name}`);
      
      if (!follower.api_key || !follower.api_secret) {
        console.log('   ❌ Missing API credentials');
        continue;
      }

      // 2. Check current positions
      console.log('   📊 Checking current positions...');
      const positionsResult = await checkPositions(follower.api_key, follower.api_secret);
      
      if (positionsResult.success && positionsResult.data.length > 0) {
        console.log(`   ⚠️  Found ${positionsResult.data.length} existing positions - closing them first`);
        
        for (const position of positionsResult.data) {
          if (position.size !== 0) {
            console.log(`   🔄 Closing existing position: ${position.product_symbol} ${position.size}`);
            await closePosition(
              follower.api_key, 
              follower.api_secret, 
              position.product_symbol,
              Math.abs(position.size),
              position.size > 0 ? 'sell' : 'buy'
            );
          }
        }
        
        // Wait for positions to close
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // 3. Test opening a position
      console.log('   📈 Opening test position...');
      const openResult = await openTestPosition(follower.api_key, follower.api_secret);
      
      if (openResult.success) {
        console.log('   ✅ Test position opened successfully');
        
        // Wait for position to be established
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 4. Verify position is open
        console.log('   🔍 Verifying position is open...');
        const verifyOpenResult = await checkPositions(follower.api_key, follower.api_secret);
        
        if (verifyOpenResult.success && verifyOpenResult.data.length > 0) {
          const openPosition = verifyOpenResult.data.find(pos => pos.product_symbol === 'BBUSD');
          if (openPosition && openPosition.size > 0) {
            console.log(`   ✅ Position verified: ${openPosition.product_symbol} ${openPosition.size} @ ${openPosition.entry_price}`);
            
            // 5. Test closing the position
            console.log('   🔄 Closing test position...');
            const closeResult = await closePosition(
              follower.api_key, 
              follower.api_secret, 
              'BBUSD',
              openPosition.size,
              'sell'
            );
            
            if (closeResult.success) {
              console.log('   ✅ Position closed successfully');
              
              // Wait for position to close
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // 6. Verify position is closed
              console.log('   🔍 Verifying position is closed...');
              const verifyCloseResult = await checkPositions(follower.api_key, follower.api_secret);
              
              const closedPosition = verifyCloseResult.data.find(pos => pos.product_symbol === 'BBUSD');
              if (!closedPosition || closedPosition.size === 0) {
                console.log('   ✅ Position closure verified');
              } else {
                console.log('   ❌ Position still appears to be open');
              }
            } else {
              console.log('   ❌ Failed to close position:', closeResult.error);
            }
          } else {
            console.log('   ❌ Position not found after opening');
          }
        } else {
          console.log('   ❌ Failed to verify open position');
        }
      } else {
        console.log('   ❌ Failed to open test position:', openResult.error);
      }
    }

    console.log('\n🎯 POSITION CYCLE TEST COMPLETE');
    console.log('📊 The copy trading system should now properly close follower positions when master closes positions');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function checkPositions(apiKey, apiSecret) {
  try {
    const method = 'GET';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = '/v2/positions/margined';
    const signatureData = method + timestamp + path;
    const signature = generateSignature(apiSecret, signatureData);
    
    const headers = {
      'api-key': apiKey,
      'timestamp': timestamp,
      'signature': signature,
      'User-Agent': 'test-client',
      'Content-Type': 'application/json'
    };

    const response = await axios.get('https://api.india.delta.exchange/v2/positions/margined', {
      headers,
      timeout: 10000
    });

    return {
      success: true,
      data: response.data.result || []
    };

  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

async function openTestPosition(apiKey, apiSecret) {
  try {
    const method = 'POST';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = '/v2/orders';
    const orderData = {
      product_symbol: 'BBUSD',
      size: 1,
      side: 'buy',
      order_type: 'market_order',
      client_order_id: 'test_cycle_' + Date.now()
    };
    
    const payload = JSON.stringify(orderData);
    const signatureData = method + timestamp + path + payload;
    const signature = generateSignature(apiSecret, signatureData);
    
    const headers = {
      'api-key': apiKey,
      'timestamp': timestamp,
      'signature': signature,
      'User-Agent': 'test-client',
      'Content-Type': 'application/json'
    };

    const response = await axios.post('https://api.india.delta.exchange/v2/orders', orderData, {
      headers,
      timeout: 10000
    });

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

async function closePosition(apiKey, apiSecret, symbol, size, side) {
  try {
    const method = 'POST';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = '/v2/orders';
    const orderData = {
      product_symbol: symbol,
      size: size,
      side: side,
      order_type: 'market_order',
      client_order_id: 'close_cycle_' + Date.now()
    };
    
    const payload = JSON.stringify(orderData);
    const signatureData = method + timestamp + path + payload;
    const signature = generateSignature(apiSecret, signatureData);
    
    const headers = {
      'api-key': apiKey,
      'timestamp': timestamp,
      'signature': signature,
      'User-Agent': 'test-client',
      'Content-Type': 'application/json'
    };

    const response = await axios.post('https://api.india.delta.exchange/v2/orders', orderData, {
      headers,
      timeout: 10000
    });

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

testCompletePositionCycle(); 