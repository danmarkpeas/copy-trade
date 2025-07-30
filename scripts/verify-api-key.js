const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function verifyApiKey() {
  console.log('🔑 VERIFYING API KEY\n');

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
    const BASE_URL = 'https://api.delta.exchange'; // Note: using main domain, not india subdomain

    function generateSignature(secret, message) {
      return crypto.createHmac('sha256', secret).update(message).digest('hex');
    }

    // Test different signature formats
    const testCases = [
      {
        name: 'Format 1: method + timestamp + path',
        signatureData: `GET${Math.floor(Date.now() / 1000)}/v2/products`,
        description: 'Your provided format'
      },
      {
        name: 'Format 2: timestamp + method + path',
        signatureData: `${Math.floor(Date.now() / 1000)}GET/v2/products`,
        description: 'Most common Delta format'
      },
      {
        name: 'Format 3: method + path + timestamp',
        signatureData: `GET/v2/products${Math.floor(Date.now() / 1000)}`,
        description: 'Alternative format'
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);
      
      try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const method = 'GET';
        const path = '/v2/products';
        const signature = generateSignature(API_SECRET, testCase.signatureData);

        console.log(`   Timestamp: ${timestamp}`);
        console.log(`   Signature Data: ${testCase.signatureData}`);
        console.log(`   Signature: ${signature.substring(0, 20)}...`);

        const response = await fetch(`${BASE_URL}${path}`, {
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
          console.log(`   🎉 Working signature format: ${testCase.name}`);
          return; // Exit on success
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Failed: ${errorText}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // Test with Delta server time
    console.log('\n🕐 TESTING WITH DELTA SERVER TIME...');
    try {
      const timeResponse = await fetch('https://api.delta.exchange/v2/time');
      if (timeResponse.ok) {
        const timeData = await timeResponse.json();
        const deltaTime = timeData.result.server_time;
        console.log(`   Delta server time: ${deltaTime}`);
        console.log(`   Local time: ${Math.floor(Date.now() / 1000)}`);
        console.log(`   Time difference: ${Math.floor(Date.now() / 1000) - deltaTime} seconds`);

        // Test with Delta server time using Format 2 (most common)
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
          return;
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

    // Test fills endpoint (requires authentication)
    console.log('\n📊 TESTING FILLS ENDPOINT...');
    try {
      const timestamp = Math.floor(Date.now() / 1000) + 1;
      const signatureData = `${timestamp}GET/v2/fills`;
      const signature = generateSignature(API_SECRET, signatureData);

      const response = await fetch(`${BASE_URL}/v2/fills`, {
        method: 'GET',
        headers: {
          'api-key': API_KEY,
          'timestamp': timestamp.toString(),
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
    } catch (error) {
      console.log(`   ❌ Error testing fills: ${error.message}`);
    }

    console.log('\n🚨 TROUBLESHOOTING:');
    console.log('1. 🔑 Check if API key is activated in Delta Exchange');
    console.log('2. ⏰ Wait 5-10 minutes after activation');
    console.log('3. 🔍 Verify API key permissions (Read, Trade)');
    console.log('4. 🌐 Check if using correct Delta Exchange domain');
    console.log('5. 📧 Contact Delta Exchange support if issues persist');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

verifyApiKey().catch(console.error); 