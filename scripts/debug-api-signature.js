const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugApiSignature() {
  console.log('🔍 DEBUGGING API SIGNATURE');
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

    // 2. Test signature generation
    console.log('\n2. Testing signature generation...');
    
    const method = 'GET';
    const path = '/v2/positions/margined';
    const queryString = '';
    const payload = '';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    const signatureData = method + timestamp + path + queryString + payload;
    const signature = crypto
      .createHmac('sha256', follower.api_secret)
      .update(signatureData)
      .digest('hex');

    console.log('   📝 Signature data:', signatureData);
    console.log('   🔑 API Key:', follower.api_key);
    console.log('   🕐 Timestamp:', timestamp);
    console.log('   🔐 Generated signature:', signature);

    // 3. Test API call with detailed error
    console.log('\n3. Testing API call...');
    
    const headers = {
      'api-key': follower.api_key,
      'timestamp': timestamp,
      'signature': signature,
      'User-Agent': 'copy-trading-bot',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    console.log('   📤 Request headers:', JSON.stringify(headers, null, 2));

    try {
      const response = await axios.get('https://api.india.delta.exchange/v2/positions/margined', {
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
      }
    }

    // 4. Test with environment variables for comparison
    console.log('\n4. Testing with environment variables...');
    
    if (process.env.DELTA_API_KEY && process.env.DELTA_API_SECRET) {
      console.log('   🔑 Using environment variables for comparison');
      
      const envSignatureData = method + timestamp + path + queryString + payload;
      const envSignature = crypto
        .createHmac('sha256', process.env.DELTA_API_SECRET)
        .update(envSignatureData)
        .digest('hex');

      const envHeaders = {
        'api-key': process.env.DELTA_API_KEY,
        'timestamp': timestamp,
        'signature': envSignature,
        'User-Agent': 'copy-trading-bot',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      try {
        const envResponse = await axios.get('https://api.india.delta.exchange/v2/positions/margined', {
          headers: envHeaders,
          timeout: 10000
        });

        console.log('   ✅ Environment variables API call successful');
        console.log('   📄 Response:', JSON.stringify(envResponse.data, null, 2));

      } catch (envError) {
        console.log('   ❌ Environment variables API call failed');
        console.log('   📄 Error:', JSON.stringify(envError.response?.data, null, 2));
      }
    } else {
      console.log('   ⚠️ Environment variables not found');
    }

    console.log('\n✅ Debug completed');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugApiSignature(); 