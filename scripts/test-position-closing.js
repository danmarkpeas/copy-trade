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

async function testPositionClosing() {
  console.log('🔍 TESTING POSITION CLOSING FUNCTIONALITY');
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
        console.log(`   ✅ Found ${positionsResult.data.length} open positions`);
        
        for (const position of positionsResult.data) {
          console.log(`   📈 Position: ${position.product_symbol} ${position.size} @ ${position.entry_price}`);
          
          // 3. Test closing the position
          console.log('   🔄 Testing position closure...');
          const closeResult = await closePosition(
            follower.api_key, 
            follower.api_secret, 
            position.product_symbol,
            position.size,
            position.side === 'long' ? 'sell' : 'buy'
          );
          
          if (closeResult.success) {
            console.log('   ✅ Position closed successfully');
          } else {
            console.log('   ❌ Failed to close position:', closeResult.error);
          }
        }
      } else {
        console.log('   ℹ️  No open positions found');
        
        // 4. Test opening a small position to then close it
        console.log('   🧪 Opening test position for closure test...');
        const openResult = await openTestPosition(follower.api_key, follower.api_secret);
        
        if (openResult.success) {
          console.log('   ✅ Test position opened');
          
          // Wait a moment then close it
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log('   🔄 Closing test position...');
          const closeResult = await closePosition(
            follower.api_key, 
            follower.api_secret, 
            'BBUSD',
            1,
            'sell'
          );
          
          if (closeResult.success) {
            console.log('   ✅ Test position closed successfully');
          } else {
            console.log('   ❌ Failed to close test position:', closeResult.error);
          }
        } else {
          console.log('   ❌ Failed to open test position:', openResult.error);
        }
      }
    }

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
    console.log('   ❌ Error checking positions:', error.response?.data || error.message);
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
      client_order_id: 'test_close_' + Date.now()
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
      client_order_id: 'close_' + Date.now()
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

    console.log(`   📝 Closing order data:`, JSON.stringify(orderData, null, 2));

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

testPositionClosing(); 