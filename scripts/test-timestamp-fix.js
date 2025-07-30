const crypto = require('crypto');
require('dotenv').config();

async function createDeltaSignature(method, path, body, timestamp, secret) {
  const message = method + path + body + timestamp;
  const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return signature;
}

async function getDeltaServerTime() {
  try {
    const response = await fetch('https://api.delta.exchange/v2/time');
    if (response.ok) {
      const data = await response.json();
      return data.server_time * 1000; // Convert to milliseconds
    }
  } catch (error) {
    console.log('⚠️ Could not get Delta server time:', error);
  }
  return Date.now();
}

async function testTimestampFix() {
  console.log('🔍 Testing Timestamp Fix for Delta Exchange API...\n');

  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get broker account credentials
    const brokerId = 'f1bff339-23e2-4763-9aad-a3a02d18cf22';
    
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', brokerId)
      .single();

    if (brokerError) {
      console.log('❌ Error getting broker account:', brokerError.message);
      return;
    }

    console.log('✅ Using broker account:', brokerAccount.account_name);

    // Test different timestamp approaches
    console.log('\n🔍 Testing different timestamp approaches...');

    // Approach 1: Server time without buffer
    console.log('\n📊 Approach 1: Server time without buffer');
    const serverTime = await getDeltaServerTime();
    const timestamp1 = Math.floor(serverTime / 1000);
    console.log('   Server time:', new Date(serverTime).toISOString());
    console.log('   Timestamp:', timestamp1);

    const signature1 = await createDeltaSignature('GET', '/v2/positions/margined', '', timestamp1, brokerAccount.api_secret);
    
    const response1 = await fetch('https://api.delta.exchange/v2/positions/margined', {
      method: 'GET',
      headers: {
        'api-key': brokerAccount.api_key,
        'timestamp': timestamp1.toString(),
        'signature': signature1,
        'Content-Type': 'application/json'
      }
    });

    console.log('   Response status:', response1.status);
    if (response1.ok) {
      const data1 = await response1.json();
      const positions = (data1.result || []).filter((pos) => parseFloat(pos.size) > 0);
      console.log('   ✅ Success! Found', positions.length, 'open positions');
      if (positions.length > 0) {
        positions.forEach((pos, index) => {
          console.log(`      ${index + 1}. ${pos.product_symbol} - Size: ${pos.size} - Avg Price: ${pos.avg_price}`);
        });
      }
    } else {
      const error1 = await response1.text();
      console.log('   ❌ Failed:', error1);
    }

    // Approach 2: Server time with small buffer
    console.log('\n📊 Approach 2: Server time with 2 second buffer');
    const timestamp2 = Math.floor(serverTime / 1000) + 2;
    console.log('   Timestamp:', timestamp2);

    const signature2 = await createDeltaSignature('GET', '/v2/positions/margined', '', timestamp2, brokerAccount.api_secret);
    
    const response2 = await fetch('https://api.delta.exchange/v2/positions/margined', {
      method: 'GET',
      headers: {
        'api-key': brokerAccount.api_key,
        'timestamp': timestamp2.toString(),
        'signature': signature2,
        'Content-Type': 'application/json'
      }
    });

    console.log('   Response status:', response2.status);
    if (response2.ok) {
      const data2 = await response2.json();
      const positions = (data2.result || []).filter((pos) => parseFloat(pos.size) > 0);
      console.log('   ✅ Success! Found', positions.length, 'open positions');
    } else {
      const error2 = await response2.text();
      console.log('   ❌ Failed:', error2);
    }

    // Approach 3: Current time
    console.log('\n📊 Approach 3: Current time');
    const timestamp3 = Math.floor(Date.now() / 1000);
    console.log('   Current time:', new Date().toISOString());
    console.log('   Timestamp:', timestamp3);

    const signature3 = await createDeltaSignature('GET', '/v2/positions/margined', '', timestamp3, brokerAccount.api_secret);
    
    const response3 = await fetch('https://api.delta.exchange/v2/positions/margined', {
      method: 'GET',
      headers: {
        'api-key': brokerAccount.api_key,
        'timestamp': timestamp3.toString(),
        'signature': signature3,
        'Content-Type': 'application/json'
      }
    });

    console.log('   Response status:', response3.status);
    if (response3.ok) {
      const data3 = await response3.json();
      const positions = (data3.result || []).filter((pos) => parseFloat(pos.size) > 0);
      console.log('   ✅ Success! Found', positions.length, 'open positions');
    } else {
      const error3 = await response3.text();
      console.log('   ❌ Failed:', error3);
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('   If any approach works: We found the right timestamp method');
  console.log('   If all fail: There might be other API issues');
  console.log('   If positions found: The API is working correctly');
}

testTimestampFix().catch(console.error); 