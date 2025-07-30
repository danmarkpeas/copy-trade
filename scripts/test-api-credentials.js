const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testApiCredentials() {
  console.log('🔍 Testing API credentials...\n');
  
  try {
    // Get broker accounts
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true);

    if (brokerError) {
      console.error('❌ Error fetching broker accounts:', brokerError);
      return;
    }

    if (!brokerAccounts || brokerAccounts.length === 0) {
      console.log('⚠️ No active broker accounts found');
      return;
    }

    console.log(`📊 Found ${brokerAccounts.length} broker account(s):\n`);

    for (const broker of brokerAccounts) {
      console.log(`🔑 Broker: ${broker.account_name}`);
      console.log(`   API Key: ${broker.api_key ? broker.api_key.substring(0, 10) + '...' : 'NOT SET'}`);
      console.log(`   API Secret: ${broker.api_secret ? '***SET***' : 'NOT SET'}`);
      console.log(`   User ID: ${broker.user_id}`);
      console.log(`   Status: ${broker.is_active ? 'Active' : 'Inactive'}`);
      console.log(`   Verified: ${broker.is_verified ? 'Yes' : 'No'}\n`);
    }

    // Get followers
    const { data: followers, error: followerError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followerError) {
      console.error('❌ Error fetching followers:', followerError);
      return;
    }

    if (!followers || followers.length === 0) {
      console.log('⚠️ No active followers found');
      return;
    }

    console.log(`👥 Found ${followers.length} follower(s):\n`);

    for (const follower of followers) {
      console.log(`🔑 Follower: ${follower.follower_name}`);
      console.log(`   API Key: ${follower.api_key ? follower.api_key.substring(0, 10) + '...' : 'NOT SET'}`);
      console.log(`   API Secret: ${follower.api_secret ? '***SET***' : 'NOT SET'}`);
      console.log(`   User ID: ${follower.user_id}`);
      console.log(`   Master Broker: ${follower.master_broker_account_id}`);
      console.log(`   Multiplier: ${follower.multiplier || 1.0}`);
      console.log(`   Status: ${follower.account_status}\n`);
    }

    // Test API endpoints
    console.log('🧪 Testing API endpoints...\n');
    
    const axios = require('axios');
    const crypto = require('crypto');

    function generateSignature(secret, message) {
      return crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest('hex');
    }

    async function testApiRequest(config, endpoint) {
      try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const path = `/v2${endpoint}`;
        const signatureData = 'GET' + timestamp + path;
        const signature = generateSignature(config.api_secret, signatureData);

        const headers = {
          'api-key': config.api_key,
          'timestamp': timestamp,
          'signature': signature,
          'User-Agent': 'copy-trader-client',
          'Content-Type': 'application/json'
        };

        const url = `https://api.india.delta.exchange${path}`;
        const response = await axios.get(url, { headers, timeout: 10000 });

        return { success: true, data: response.data };
      } catch (error) {
        return { 
          success: false, 
          error: error.message,
          status: error.response?.status,
          data: error.response?.data
        };
      }
    }

    // Test broker API
    const broker = brokerAccounts[0];
    console.log(`🔍 Testing broker API: ${broker.account_name}`);
    
    const brokerTest = await testApiRequest(broker, '/positions');
    if (brokerTest.success) {
      console.log('✅ Broker API working');
      console.log(`   Positions: ${brokerTest.data.result?.length || 0}`);
    } else {
      console.log('❌ Broker API failed');
      console.log(`   Error: ${brokerTest.error}`);
      console.log(`   Status: ${brokerTest.status}`);
      console.log(`   Response: ${JSON.stringify(brokerTest.data, null, 2)}`);
    }
    console.log('');

    // Test follower APIs
    for (const follower of followers) {
      console.log(`🔍 Testing follower API: ${follower.follower_name}`);
      
      const followerTest = await testApiRequest(follower, '/positions');
      if (followerTest.success) {
        console.log('✅ Follower API working');
        console.log(`   Positions: ${followerTest.data.result?.length || 0}`);
      } else {
        console.log('❌ Follower API failed');
        console.log(`   Error: ${followerTest.error}`);
        console.log(`   Status: ${followerTest.status}`);
        console.log(`   Response: ${JSON.stringify(followerTest.data, null, 2)}`);
      }
      console.log('');
    }

    // Recommendations
    console.log('💡 Recommendations:');
    console.log('1. Check if API keys are valid and have proper permissions');
    console.log('2. Verify API keys are for the correct Delta Exchange environment');
    console.log('3. Ensure API keys have trading permissions');
    console.log('4. Check if the API endpoints are correct for your region');
    console.log('5. Verify the signature generation matches Delta Exchange requirements');

  } catch (error) {
    console.error('❌ Error testing API credentials:', error);
  }
}

testApiCredentials().catch(console.error); 