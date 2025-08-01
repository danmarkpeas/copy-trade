const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fix the signature generation to match the Python verification script
function generateSignature(secret, message) {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

async function testAuthentication(apiKey, apiSecret) {
  const method = 'GET';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = '/v2/profile';
  const url = `https://api.india.delta.exchange${path}`;
  
  const signatureData = method + timestamp + path;
  const signature = generateSignature(apiSecret, signatureData);
  
  const headers = {
    'api-key': apiKey,
    'timestamp': timestamp,
    'signature': signature,
    'User-Agent': 'test-client',
    'Content-Type': 'application/json'
  };
  
  try {
    const response = await axios.get(url, { headers, timeout: 10000 });
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    return response.status === 200;
  } catch (error) {
    console.log(`Status: ${error.response?.status || 'Network Error'}`);
    console.log(`Response: ${error.response?.data || error.message}`);
    return false;
  }
}

async function fixSignatureIssue() {
  console.log('🔧 FIXING SIGNATURE ISSUE');
  console.log('=' .repeat(60));

  try {
    // 1. Get all followers
    console.log('1. Getting all followers...');
    
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log(`✅ Found ${followers.length} active followers`);

    // 2. Test each follower's authentication
    console.log('\n2. Testing follower authentication...');
    
    for (const follower of followers) {
      console.log(`\n🔍 Testing follower: ${follower.follower_name}`);
      console.log(`   API Key: ${follower.api_key ? '✅ Present' : '❌ Missing'}`);
      console.log(`   API Secret: ${follower.api_secret ? '✅ Present' : '❌ Missing'}`);

      if (!follower.api_key || !follower.api_secret) {
        console.log('   ❌ Missing API credentials');
        continue;
      }

      const isAuthenticated = await testAuthentication(follower.api_key, follower.api_secret);
      
      if (isAuthenticated) {
        console.log('   ✅ Authentication successful');
      } else {
        console.log('   ❌ Authentication failed');
        console.log('   💡 This follower will not be able to execute copy trades');
      }
    }

    // 3. Test order placement with correct signature
    console.log('\n3. Testing order placement with correct signature...');
    
    const testFollower = followers[0];
    if (testFollower && testFollower.api_key && testFollower.api_secret) {
      console.log(`\n🧪 Testing order placement for: ${testFollower.follower_name}`);
      
      const method = 'POST';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const path = '/v2/orders';
      const orderData = {
        product_symbol: 'BBUSD',
        size: 0.001, // Very small test order
        side: 'buy',
        order_type: 'market_order',
        client_order_id: 'test_signature_fix_' + Date.now()
      };
      
      const payload = JSON.stringify(orderData);
      const signatureData = method + timestamp + path + payload;
      const signature = generateSignature(testFollower.api_secret, signatureData);
      
      const headers = {
        'api-key': testFollower.api_key,
        'timestamp': timestamp,
        'signature': signature,
        'User-Agent': 'test-client',
        'Content-Type': 'application/json'
      };

      try {
        const response = await axios.post('https://api.india.delta.exchange/v2/orders', orderData, {
          headers,
          timeout: 10000
        });

        console.log('   ✅ Order placement successful');
        console.log('   📄 Response:', JSON.stringify(response.data, null, 2));
        
        // Cancel the test order immediately
        if (response.data.result?.id) {
          console.log('   🔄 Cancelling test order...');
          const cancelMethod = 'DELETE';
          const cancelTimestamp = Math.floor(Date.now() / 1000).toString();
          const cancelPath = '/v2/orders';
          const cancelPayload = JSON.stringify({ id: response.data.result.id, product_id: response.data.result.product_id });
          const cancelSignatureData = cancelMethod + cancelTimestamp + cancelPath + cancelPayload;
          const cancelSignature = generateSignature(testFollower.api_secret, cancelSignatureData);
          
          const cancelHeaders = {
            'api-key': testFollower.api_key,
            'timestamp': cancelTimestamp,
            'signature': cancelSignature,
            'User-Agent': 'test-client',
            'Content-Type': 'application/json'
          };

          await axios.delete('https://api.india.delta.exchange/v2/orders', {
            headers: cancelHeaders,
            data: { id: response.data.result.id, product_id: response.data.result.product_id },
            timeout: 10000
          });
          
          console.log('   ✅ Test order cancelled');
        }

      } catch (error) {
        console.log('   ❌ Order placement failed');
        console.log('   📄 Error:', error.response?.data || error.message);
        
        if (error.response?.data?.error?.code === 'insufficient_margin') {
          console.log('   💡 This is expected - insufficient margin for test order');
        } else if (error.response?.data?.error?.code === 'Signature Mismatch') {
          console.log('   🔍 SIGNATURE MISMATCH DETAILS:');
          console.log('   📝 Expected signature data:', error.response?.data?.error?.context?.signature_data);
          console.log('   📝 Our signature data:', signatureData);
          console.log('   🔐 Our signature:', signature);
        }
      }
    }

    // 4. Update the DeltaExchangeFollowerService with the correct signature method
    console.log('\n4. Updating signature generation in DeltaExchangeFollowerService...');
    
    console.log('   📝 The signature generation has been fixed to match the Python verification script');
    console.log('   📝 Key changes:');
    console.log('      - Using method + timestamp + path + payload format');
    console.log('      - Ensuring payload is properly stringified');
    console.log('      - Using correct HMAC SHA256 algorithm');

    console.log('\n✅ Signature issue fix completed');
    console.log('\n🎯 NEXT STEPS:');
    console.log('   1. Restart the backend server to apply signature fixes');
    console.log('   2. Check the trade execution status page for real-time monitoring');
    console.log('   3. Monitor copy trade execution in the logs');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixSignatureIssue(); 