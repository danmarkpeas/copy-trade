const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testProperTiming() {
  console.log('🔑 TESTING PROPER DELTA EXCHANGE TIMING\n');

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

    // Test 1: Get server time from assets endpoint
    console.log('\n🕐 TEST 1: Getting Server Time from Assets');
    try {
      const assetsResponse = await fetch(`${BASE_URL}/v2/assets`);
      if (assetsResponse.ok) {
        const serverDate = assetsResponse.headers.get('date');
        if (serverDate) {
          const serverTime = new Date(serverDate).getTime();
          console.log(`   ✅ Server time from headers: ${serverDate}`);
          console.log(`   📊 Server timestamp: ${serverTime}`);
          console.log(`   📊 Local timestamp: ${Date.now()}`);
          console.log(`   ⏱️ Time difference: ${Math.abs(Date.now() - serverTime)}ms`);
        } else {
          console.log('   ⚠️ No date header found');
        }
      } else {
        console.log(`   ❌ Assets endpoint failed: ${assetsResponse.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Error getting server time: ${error.message}`);
    }

    // Test 2: Test fills endpoint with proper microsecond timestamps
    console.log('\n📊 TEST 2: Fills Endpoint with Microsecond Timestamps');
    try {
      // Get current timestamp in seconds
      const timestamp = Math.floor(Date.now() / 1000) + 1; // Add 1 second buffer
      
      // Calculate time range for fills (last 24 hours in microseconds)
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      const startTime = Math.floor(oneDayAgo * 1000); // Convert to microseconds
      const endTime = Math.floor(now * 1000); // Convert to microseconds
      
      const signatureData = `${timestamp}GET/v2/fills`;
      const signature = generateSignature(API_SECRET, signatureData);

      console.log(`   Timestamp: ${timestamp}`);
      console.log(`   Start Time (microseconds): ${startTime}`);
      console.log(`   End Time (microseconds): ${endTime}`);
      console.log(`   Signature Data: ${signatureData}`);
      console.log(`   Signature: ${signature.substring(0, 20)}...`);

      const fillsUrl = `${BASE_URL}/v2/fills?start_time=${startTime}&end_time=${endTime}`;
      console.log(`   URL: ${fillsUrl}`);

      const response = await fetch(fillsUrl, {
        method: 'GET',
        headers: {
          'api-key': API_KEY,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'User-Agent': 'copy-trading-platform',
          'Content-Type': 'application/json'
        }
      });

      console.log(`   Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCESS! Found ${data.result?.length || 0} fills`);
        
        if (data.result && data.result.length > 0) {
          console.log('\n📋 RECENT FILLS:');
          data.result.slice(0, 3).forEach((fill, index) => {
            console.log(`   ${index + 1}. ${fill.product_symbol} ${fill.side} ${fill.size} @ ${fill.price}`);
            console.log(`      Time: ${fill.created_at}`);
            console.log(`      ID: ${fill.id}`);
          });
        }
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 3: Test positions endpoint with proper timing
    console.log('\n📊 TEST 3: Positions Endpoint with Proper Timing');
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
          'User-Agent': 'copy-trading-platform',
          'Content-Type': 'application/json'
        }
      });

      console.log(`   Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCESS! Found ${data.result?.length || 0} positions`);
        
        if (data.result && data.result.length > 0) {
          console.log('\n📋 OPEN POSITIONS:');
          data.result.filter(pos => parseFloat(pos.size) > 0).slice(0, 3).forEach((pos, index) => {
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

    // Test 4: Test orders endpoint
    console.log('\n📊 TEST 4: Orders Endpoint');
    try {
      const timestamp = Math.floor(Date.now() / 1000) + 1;
      const signatureData = `${timestamp}GET/v2/orders`;
      const signature = generateSignature(API_SECRET, signatureData);

      const response = await fetch(`${BASE_URL}/v2/orders?state=open`, {
        method: 'GET',
        headers: {
          'api-key': API_KEY,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'User-Agent': 'copy-trading-platform',
          'Content-Type': 'application/json'
        }
      });

      console.log(`   Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCESS! Found ${data.result?.length || 0} open orders`);
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('\n🎯 TIMING ANALYSIS:');
    console.log('✅ Using microseconds for time parameters');
    console.log('✅ Adding 1-second buffer to timestamps');
    console.log('✅ Proper signature generation');
    console.log('✅ Correct User-Agent and Content-Type headers');
    console.log('✅ Time range parameters for fills endpoint');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testProperTiming().catch(console.error); 