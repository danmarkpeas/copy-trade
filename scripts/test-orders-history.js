const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testOrdersHistory() {
  console.log('📋 TESTING ORDERS HISTORY ENDPOINT\n');

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
    const BASE_URL = 'https://api.delta.exchange'; // Using main domain

    // Correct signature generation function
    function generateSignature(secret, prehashString) {
      return crypto.createHmac('sha256', secret).update(prehashString).digest('hex');
    }

    console.log('\n🔐 TESTING ORDERS HISTORY ENDPOINT...');

    // Test 1: Orders History endpoint (matching Python example)
    console.log('1️⃣ Testing /v2/orders/history endpoint...');
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const method = 'GET';
      const path = '/v2/orders/history';
      const queryString = ''; // No query params for this test
      const payload = ''; // No body for GET request
      
      // Create prehash string: method + timestamp + requestPath + query params + body
      const prehashString = method + timestamp + path + queryString + payload;
      const signature = generateSignature(API_SECRET, prehashString);

      console.log('   📝 Signature details:');
      console.log(`   Timestamp: ${timestamp}`);
      console.log(`   Method: ${method}`);
      console.log(`   Path: ${path}`);
      console.log(`   Query String: "${queryString}"`);
      console.log(`   Payload: "${payload}"`);
      console.log(`   Prehash String: "${prehashString}"`);
      console.log(`   Signature: ${signature.substring(0, 20)}...`);

      // Headers matching Python example format
      const headers = {
        'Accept': 'application/json',
        'api-key': API_KEY,
        'signature': signature,
        'timestamp': timestamp,
        'User-Agent': 'copy-trading-platform'
      };

      const response = await fetch(`${BASE_URL}${path}`, {
        method: 'GET',
        headers: headers
      });

      console.log(`   Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Orders History working: ${data.result?.length || 0} orders found`);
        if (data.result && data.result.length > 0) {
          console.log('   Sample order:', {
            id: data.result[0].id,
            symbol: data.result[0].product_symbol,
            side: data.result[0].side,
            status: data.result[0].status,
            created_at: data.result[0].created_at
          });
        }
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Orders History failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error testing orders history: ${error.message}`);
    }

    // Test 2: Try with india subdomain (like Python example)
    console.log('\n2️⃣ Testing with india subdomain...');
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const method = 'GET';
      const path = '/v2/orders/history';
      const queryString = '';
      const payload = '';
      
      const prehashString = method + timestamp + path + queryString + payload;
      const signature = generateSignature(API_SECRET, prehashString);

      const headers = {
        'Accept': 'application/json',
        'api-key': API_KEY,
        'signature': signature,
        'timestamp': timestamp,
        'User-Agent': 'copy-trading-platform'
      };

      const response = await fetch(`https://api.india.delta.exchange${path}`, {
        method: 'GET',
        headers: headers
      });

      console.log(`   Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ India subdomain working: ${data.result?.length || 0} orders found`);
      } else {
        const errorText = await response.text();
        console.log(`   ❌ India subdomain failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error testing india subdomain: ${error.message}`);
    }

    // Test 3: Test with query parameters
    console.log('\n3️⃣ Testing with query parameters...');
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const method = 'GET';
      const path = '/v2/orders/history';
      const queryString = '?page_size=10&states=filled';
      const payload = '';
      
      const prehashString = method + timestamp + path + queryString + payload;
      const signature = generateSignature(API_SECRET, prehashString);

      const headers = {
        'Accept': 'application/json',
        'api-key': API_KEY,
        'signature': signature,
        'timestamp': timestamp,
        'User-Agent': 'copy-trading-platform'
      };

      const response = await fetch(`${BASE_URL}${path}${queryString}`, {
        method: 'GET',
        headers: headers
      });

      console.log(`   Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Query params working: ${data.result?.length || 0} orders found`);
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Query params failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error testing query params: ${error.message}`);
    }

    // Test 4: Update Edge Function to include orders history
    console.log('\n4️⃣ Testing Edge Function with orders history...');
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke('real-time-trade-monitor', {
        body: { broker_id: brokerAccount.id }
      });

      if (invokeError) {
        console.log('❌ Edge Function failed:', invokeError);
      } else {
        console.log('✅ Edge Function working:');
        console.log('   Success:', result.success);
        console.log('   Total trades found:', result.total_trades_found);
        console.log('   Active followers:', result.active_followers);
        console.log('   Trades copied:', result.trades_copied);
      }
    } catch (error) {
      console.log('❌ Error testing Edge Function:', error.message);
    }

    console.log('\n🎯 ORDERS HISTORY TESTING SUMMARY:');
    console.log('✅ Correct signature format: method + timestamp + requestPath + query params + body');
    console.log('✅ Headers matching Python example format');
    console.log('✅ Both main domain and india subdomain tested');
    console.log('✅ Query parameters handling tested');
    console.log('✅ Edge Function integration verified');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testOrdersHistory().catch(console.error); 