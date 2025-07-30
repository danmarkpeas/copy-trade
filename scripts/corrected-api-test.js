const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testApiKeyCorrected() {
  console.log('🔑 TESTING API KEY (CORRECTED FORMAT)\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the most recent broker account
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    const brokerAccount = brokerAccounts[0];
    console.log('📋 BROKER ACCOUNT:');
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);
    console.log('   API Key:', brokerAccount.api_key);
    console.log('   API Secret Length:', brokerAccount.api_secret?.length || 0);

    const API_KEY = brokerAccount.api_key;
    const API_SECRET = brokerAccount.api_secret;
    const BASE_URL = 'https://api.delta.exchange'; // Using main domain like your working script

    function generateSignature(secret, message) {
      return crypto.createHmac('sha256', secret).update(message).digest('hex');
    }

    // Test 1: Products endpoint with local time (Format 2: timestamp + method + path)
    console.log('\n🧪 TEST 1: Products with local time');
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signatureData = `${timestamp}GET/v2/products`; // Format 2 like your working script
      const signature = generateSignature(API_SECRET, signatureData);

      console.log(`   Timestamp: ${timestamp}`);
      console.log(`   Signature Data: ${signatureData}`);
      console.log(`   Signature: ${signature.substring(0, 20)}...`);

      const response = await fetch(`${BASE_URL}/v2/products`, {
        method: 'GET',
        headers: {
          'api-key': API_KEY,
          'timestamp': timestamp,
          'signature': signature,
          'User-Agent': 'test-client'
        }
      });

      console.log(`   Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCESS! Found ${data.result?.length || 0} products`);
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 2: Get Delta server time and test with it
    console.log('\n🕐 TEST 2: Products with Delta server time');
    try {
      const timeResponse = await fetch('https://api.delta.exchange/v2/time');
      if (timeResponse.ok) {
        const timeData = await timeResponse.json();
        const deltaTime = timeData.result.server_time;
        console.log(`   Delta server time: ${deltaTime}`);
        console.log(`   Local time: ${Math.floor(Date.now() / 1000)}`);
        console.log(`   Time difference: ${Math.floor(Date.now() / 1000) - deltaTime} seconds`);

        // Test with Delta server time using Format 2 (timestamp + method + path)
        const signatureData = `${deltaTime}GET/v2/products`;
        const signature = generateSignature(API_SECRET, signatureData);

        const response = await fetch(`${BASE_URL}/v2/products`, {
          method: 'GET',
          headers: {
            'api-key': API_KEY,
            'timestamp': deltaTime.toString(),
            'signature': signature,
            'User-Agent': 'test-client'
          }
        });

        console.log(`   Response Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ SUCCESS with Delta server time! Found ${data.result?.length || 0} products`);
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Failed with Delta time: ${errorText}`);
        }
      } else {
        console.log('   ❌ Could not get Delta server time');
      }
    } catch (error) {
      console.log(`   ❌ Error getting Delta time: ${error.message}`);
    }

    // Test 3: Fills endpoint (requires authentication) with Delta server time
    console.log('\n📊 TEST 3: Fills endpoint with Delta server time');
    try {
      const timeResponse = await fetch('https://api.delta.exchange/v2/time');
      if (timeResponse.ok) {
        const timeData = await timeResponse.json();
        const deltaTime = timeData.result.server_time;
        
        const signatureData = `${deltaTime}GET/v2/fills`; // Format 2: timestamp + method + path
        const signature = generateSignature(API_SECRET, signatureData);

        const response = await fetch(`${BASE_URL}/v2/fills`, {
          method: 'GET',
          headers: {
            'api-key': API_KEY,
            'timestamp': deltaTime.toString(),
            'signature': signature,
            'User-Agent': 'test-client'
          }
        });

        console.log(`   Fills Response Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Fills endpoint working! Found ${data.result?.length || 0} fills`);
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Fills endpoint failed: ${errorText}`);
        }
      } else {
        console.log('   ❌ Could not get Delta server time for fills test');
      }
    } catch (error) {
      console.log(`   ❌ Error testing fills: ${error.message}`);
    }

    // Test 4: Call the real-time-trade-monitor Edge Function
    console.log('\n🔄 TEST 4: Calling real-time-trade-monitor Edge Function');
    try {
      const { data: edgeFunctionResult, error: edgeError } = await supabase.functions.invoke('real-time-trade-monitor', {
        body: { broker_id: brokerAccount.id }
      });

      if (edgeError) {
        console.log(`   ❌ Edge Function Error: ${edgeError.message}`);
      } else {
        console.log(`   ✅ Edge Function Result:`, edgeFunctionResult);
      }
    } catch (error) {
      console.log(`   ❌ Error calling Edge Function: ${error.message}`);
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testApiKeyCorrected().catch(console.error); 