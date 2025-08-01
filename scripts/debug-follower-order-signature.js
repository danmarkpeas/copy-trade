const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugFollowerOrderSignature() {
  console.log('🔍 DEBUGGING FOLLOWER ORDER SIGNATURE');
  console.log('=' .repeat(60));

  try {
    // 1. Get follower credentials
    console.log('1. Getting follower credentials...');
    
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    const follower = followers[0];
    console.log(`✅ Testing follower: ${follower.follower_name}`);

    // 2. Test order signature generation
    console.log('\n2. Testing order signature generation...');
    
    const method = 'POST';
    const endpoint = '/orders';
    const path = `/v2${endpoint}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // Test order data
    const orderData = {
      product_symbol: 'BBUSD',
      size: 1,
      side: 'buy',
      order_type: 'market_order',
      client_order_id: 'test_order_123'
    };
    
    const payload = JSON.stringify(orderData);
    const queryString = '';
    
    // Create signature data: method + timestamp + requestPath + queryParams + body
    const signatureData = method + timestamp + path + queryString + payload;
    const signature = crypto
      .createHmac('sha256', follower.api_secret)
      .update(signatureData)
      .digest('hex');

    console.log('   📝 Method:', method);
    console.log('   📝 Endpoint:', endpoint);
    console.log('   📝 Path:', path);
    console.log('   📝 Timestamp:', timestamp);
    console.log('   📝 Payload:', payload);
    console.log('   📝 Query string:', queryString);
    console.log('   📝 Signature data:', signatureData);
    console.log('   🔐 Generated signature:', signature);

    // 3. Test API call with detailed error
    console.log('\n3. Testing API call...');
    
    const headers = {
      'api-key': follower.api_key,
      'timestamp': timestamp,
      'signature': signature,
      'User-Agent': 'nodejs-follower-service',
      'Content-Type': 'application/json'
    };

    console.log('   📤 Request headers:', JSON.stringify(headers, null, 2));
    console.log('   📤 Request body:', payload);

    try {
      const response = await axios.post('https://api.india.delta.exchange/v2/orders', orderData, {
        headers,
        timeout: 10000
      });

      console.log('   ✅ API call successful');
      console.log('   📄 Response:', JSON.stringify(response.data, null, 2));

    } catch (error) {
      console.log('   ❌ API call failed');
      console.log('   📄 Status:', error.response?.status);
      console.log('   📄 Status text:', error.response?.statusText);
      console.log('   📄 Error data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.data?.error?.code === 'Signature Mismatch') {
        console.log('\n   🔍 SIGNATURE MISMATCH DETAILS:');
        console.log('   📝 Expected signature data:', error.response?.data?.error?.context?.signature_data);
        console.log('   📝 Our signature data:', signatureData);
        console.log('   🔐 Our signature:', signature);
        
        // Try to match the expected signature
        const expectedSignatureData = error.response?.data?.error?.context?.signature_data;
        if (expectedSignatureData) {
          const expectedSignature = crypto
            .createHmac('sha256', follower.api_secret)
            .update(expectedSignatureData)
            .digest('hex');
          console.log('   🔐 Expected signature:', expectedSignature);
        }
      }
    }

    console.log('\n✅ Debug completed');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugFollowerOrderSignature(); 