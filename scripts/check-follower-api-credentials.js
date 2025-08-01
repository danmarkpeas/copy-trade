const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateSignature(message) {
  return crypto
    .createHmac('sha256', process.env.DELTA_API_SECRET)
    .update(message)
    .digest('hex');
}

function getAuthHeaders(method, path, queryString = '', payload = '') {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signatureData = method + timestamp + path + queryString + payload;
  const signature = generateSignature(signatureData);

  return {
    'api-key': process.env.DELTA_API_KEY,
    'timestamp': timestamp,
    'signature': signature,
    'User-Agent': 'copy-trading-bot',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

async function checkFollowerApiCredentials() {
  console.log('🔐 CHECKING FOLLOWER API CREDENTIALS');
  console.log('=' .repeat(60));

  try {
    // 1. Get active followers
    console.log('1. Getting active followers...');
    
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }

    console.log(`✅ Found ${followers.length} active followers`);

    // 2. Test each follower's API credentials
    for (const follower of followers) {
      console.log(`\n2. Testing follower: ${follower.follower_name}`);
      console.log(`   API Key: ${follower.api_key ? '✅ Present' : '❌ Missing'}`);
      console.log(`   API Secret: ${follower.api_secret ? '✅ Present' : '❌ Missing'}`);

      if (!follower.api_key || !follower.api_secret) {
        console.log('   ❌ Missing API credentials');
        continue;
      }

      // Test API credentials by trying to get positions
      try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signatureData = 'GET' + timestamp + '/positions/margined';
        const signature = crypto
          .createHmac('sha256', follower.api_secret)
          .update(signatureData)
          .digest('hex');

        const headers = {
          'api-key': follower.api_key,
          'timestamp': timestamp,
          'signature': signature,
          'User-Agent': 'copy-trading-bot',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };

        console.log('   🔍 Testing API connection...');
        
        const response = await axios.get('https://api.india.delta.exchange/v2/positions/margined', {
          headers,
          timeout: 10000
        });

        if (response.data.success) {
          console.log('   ✅ API credentials are valid');
          console.log(`   📊 Positions found: ${response.data.result?.length || 0}`);
        } else {
          console.log('   ❌ API response indicates failure');
          console.log('   📄 Response:', response.data);
        }

      } catch (error) {
        console.log('   ❌ API credentials test failed');
        console.log(`   📄 Error: ${error.response?.data?.error || error.message}`);
        
        if (error.response?.status === 401) {
          console.log('   🔍 401 Unauthorized - Signature mismatch or invalid credentials');
        } else if (error.response?.status === 403) {
          console.log('   🔍 403 Forbidden - API key not authorized');
        }
      }
    }

    // 3. Check master broker credentials for comparison
    console.log('\n3. Checking master broker credentials...');
    
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    for (const broker of brokerAccounts) {
      console.log(`\n   Testing broker: ${broker.account_name}`);
      console.log(`   API Key: ${broker.api_key ? '✅ Present' : '❌ Missing'}`);
      console.log(`   API Secret: ${broker.api_secret ? '✅ Present' : '❌ Missing'}`);

      if (!broker.api_key || !broker.api_secret) {
        console.log('   ❌ Missing API credentials');
        continue;
      }

      // Test API credentials
      try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signatureData = 'GET' + timestamp + '/positions/margined';
        const signature = crypto
          .createHmac('sha256', broker.api_secret)
          .update(signatureData)
          .digest('hex');

        const headers = {
          'api-key': broker.api_key,
          'timestamp': timestamp,
          'signature': signature,
          'User-Agent': 'copy-trading-bot',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };

        console.log('   🔍 Testing API connection...');
        
        const response = await axios.get('https://api.india.delta.exchange/v2/positions/margined', {
          headers,
          timeout: 10000
        });

        if (response.data.success) {
          console.log('   ✅ API credentials are valid');
          console.log(`   📊 Positions found: ${response.data.result?.length || 0}`);
        } else {
          console.log('   ❌ API response indicates failure');
          console.log('   📄 Response:', response.data);
        }

      } catch (error) {
        console.log('   ❌ API credentials test failed');
        console.log(`   📄 Error: ${error.response?.data?.error || error.message}`);
      }
    }

    console.log('\n✅ API credentials check completed');

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkFollowerApiCredentials(); 