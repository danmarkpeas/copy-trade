const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testFillsDirect() {
  console.log('🔑 TESTING FILLS ENDPOINT DIRECTLY\n');

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

    const API_KEY = brokerAccount.api_key;
    const API_SECRET = brokerAccount.api_secret;
    const BASE_URL = 'https://api.delta.exchange';

    function generateSignature(secret, message) {
      return crypto.createHmac('sha256', secret).update(message).digest('hex');
    }

    // Test fills endpoint with local time
    console.log('\n📊 TESTING FILLS ENDPOINT:');
    try {
      const timestamp = Math.floor(Date.now() / 1000) + 1; // Add 1 second buffer
      const signatureData = `${timestamp}GET/v2/fills`; // Format 2: timestamp + method + path
      const signature = generateSignature(API_SECRET, signatureData);

      console.log(`   Timestamp: ${timestamp}`);
      console.log(`   Signature Data: ${signatureData}`);
      console.log(`   Signature: ${signature.substring(0, 20)}...`);

      const response = await fetch(`${BASE_URL}/v2/fills`, {
        method: 'GET',
        headers: {
          'api-key': API_KEY,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'User-Agent': 'test-client'
        }
      });

      console.log(`   Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCESS! Found ${data.result?.length || 0} fills`);
        
        if (data.result && data.result.length > 0) {
          console.log('\n📋 RECENT FILLS:');
          data.result.slice(0, 5).forEach((fill, index) => {
            console.log(`   ${index + 1}. ${fill.product_symbol} ${fill.side} ${fill.size} @ ${fill.price}`);
            console.log(`      Time: ${fill.created_at}`);
          });
        }
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test positions endpoint
    console.log('\n📊 TESTING POSITIONS ENDPOINT:');
    try {
      const timestamp = Math.floor(Date.now() / 1000) + 1;
      const signatureData = `${timestamp}GET/v2/positions/margined`;
      const signature = generateSignature(API_SECRET, signatureData);

      const response = await fetch(`${BASE_URL}/v2/positions/margined`, {
        method: 'GET',
        headers: {
          'api-key': API_KEY,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'User-Agent': 'test-client'
        }
      });

      console.log(`   Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCESS! Found ${data.result?.length || 0} positions`);
        
        if (data.result && data.result.length > 0) {
          console.log('\n📋 OPEN POSITIONS:');
          data.result.filter(pos => parseFloat(pos.size) > 0).slice(0, 5).forEach((pos, index) => {
            console.log(`   ${index + 1}. ${pos.product_symbol} ${pos.size} @ ${pos.avg_price}`);
          });
        }
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testFillsDirect().catch(console.error); 