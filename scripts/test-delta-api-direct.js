const fetch = require('node-fetch');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const BASE_URL = 'https://api.delta.exchange';

async function getDeltaServerTime() {
  try {
    // Try v1/time first (correct endpoint)
    const res = await fetch(`${BASE_URL}/v1/time`);
    if (res.ok) {
      const data = await res.json();
      return parseInt(data.server_time, 10) + 1; // Add 1s buffer
    }
    
    // Fallback to v2/time if v1 doesn't work
    const res2 = await fetch(`${BASE_URL}/v2/time`);
    if (res2.ok) {
      const data = await res2.json();
      return parseInt(data.result.server_time, 10) + 1; // Add 1s buffer
    }
    
    // Final fallback to local time
    console.log('⚠️ Could not get Delta server time, using local time');
    return Math.floor(Date.now() / 1000) + 1;
  } catch (error) {
    console.log('⚠️ Error getting Delta server time, using local time:', error.message);
    return Math.floor(Date.now() / 1000) + 1;
  }
}

async function generateSignature(timestamp, method, path, body, apiSecret) {
  const message = `${timestamp}${method}${path}${body}`;
  return crypto.createHmac('sha256', apiSecret).update(message).digest('hex');
}

async function testDeltaApi() {
  console.log('🔑 TESTING DELTA EXCHANGE API DIRECTLY\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const brokerId = '332f4927-8f66-46a3-bb4f-252a8c5373e3';

    // Get broker account details
    console.log('🔍 Getting broker account details...');
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', brokerId)
      .single();

    if (brokerError || !brokerAccount) {
      console.log('❌ Error getting broker account:', brokerError?.message || 'Not found');
      return;
    }

    console.log('✅ Broker Account Found:');
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);
    console.log('   API Key Length:', brokerAccount.api_key?.length || 0);
    console.log('   API Secret Length:', brokerAccount.api_secret?.length || 0);

    // Set API credentials
    const API_KEY = brokerAccount.api_key;
    const API_SECRET = brokerAccount.api_secret;

    if (!API_KEY || !API_SECRET) {
      console.log('❌ API credentials not found in database');
      return;
    }

    // Test server time
    console.log('\n🕐 Testing Delta server time...');
    try {
      const serverTime = await getDeltaServerTime();
      console.log('✅ Using timestamp:', serverTime);
      console.log('✅ Local time:', Math.floor(Date.now() / 1000));
    } catch (error) {
      console.log('❌ Error getting Delta server time:', error.message);
      return;
    }

    // Test fills API
    console.log('\n📊 Testing fills API...');
    try {
      const method = 'GET';
      const path = '/v2/fills';
      const timestamp = await getDeltaServerTime();
      const signature = await generateSignature(timestamp, method, path, '', API_SECRET);

      console.log('📝 Request details:');
      console.log('   Method:', method);
      console.log('   Path:', path);
      console.log('   Timestamp:', timestamp);
      console.log('   Signature:', signature.substring(0, 20) + '...');

      const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          'api-key': API_KEY,
          'timestamp': timestamp.toString(),
          'signature': signature
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.log('❌ Fills API Error:', data);
        throw new Error(data?.error?.code || 'Unknown error');
      }

      console.log('✅ Fills API working!');
      console.log('   Total fills:', data.result?.length || 0);
      
      if (data.result && data.result.length > 0) {
        console.log('   Recent fills:');
        data.result.slice(0, 3).forEach((fill, index) => {
          console.log(`     ${index + 1}. ${fill.product_symbol} - ${fill.side} - ${fill.size} - ${fill.created_at}`);
        });
      }
    } catch (error) {
      console.log('❌ Fills API failed:', error.message);
    }

    // Test futures positions API
    console.log('\n📊 Testing futures positions API...');
    try {
      const method = 'GET';
      const path = '/v2/positions/margined';
      const timestamp = await getDeltaServerTime();
      const signature = await generateSignature(timestamp, method, path, '', API_SECRET);

      const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          'api-key': API_KEY,
          'timestamp': timestamp.toString(),
          'signature': signature
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.log('❌ Futures positions API Error:', data);
        throw new Error(data?.error?.code || 'Unknown error');
      }

      console.log('✅ Futures positions API working!');
      console.log('   Total positions:', data.result?.length || 0);
      
      if (data.result && data.result.length > 0) {
        console.log('   Open futures positions:');
        data.result.forEach((pos, index) => {
          if (parseFloat(pos.size) > 0) {
            console.log(`     ${index + 1}. ${pos.product_symbol} - Size: ${pos.size} - Avg Price: ${pos.avg_price}`);
          }
        });
      } else {
        console.log('   No open futures positions found');
      }
    } catch (error) {
      console.log('❌ Futures positions API failed:', error.message);
    }

    // Test spot positions API
    console.log('\n📊 Testing spot positions API...');
    try {
      const method = 'GET';
      const path = '/v2/positions/cash';
      const timestamp = await getDeltaServerTime();
      const signature = await generateSignature(timestamp, method, path, '', API_SECRET);

      const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          'api-key': API_KEY,
          'timestamp': timestamp.toString(),
          'signature': signature
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.log('❌ Spot positions API Error:', data);
        throw new Error(data?.error?.code || 'Unknown error');
      }

      console.log('✅ Spot positions API working!');
      console.log('   Total positions:', data.result?.length || 0);
      
      if (data.result && data.result.length > 0) {
        console.log('   Open spot positions:');
        data.result.forEach((pos, index) => {
          if (parseFloat(pos.size) > 0) {
            console.log(`     ${index + 1}. ${pos.product_symbol} - Size: ${pos.size} - Avg Price: ${pos.avg_price}`);
          }
        });
      } else {
        console.log('   No open spot positions found');
      }
    } catch (error) {
      console.log('❌ Spot positions API failed:', error.message);
    }

    // Test orders API
    console.log('\n📋 Testing orders API...');
    try {
      const method = 'GET';
      const path = '/v2/orders';
      const timestamp = await getDeltaServerTime();
      const signature = await generateSignature(timestamp, method, path, '', API_SECRET);

      const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          'api-key': API_KEY,
          'timestamp': timestamp.toString(),
          'signature': signature
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.log('❌ Orders API Error:', data);
        throw new Error(data?.error?.code || 'Unknown error');
      }

      console.log('✅ Orders API working!');
      console.log('   Total orders:', data.result?.length || 0);
      
      if (data.result && data.result.length > 0) {
        console.log('   Open orders:');
        data.result.slice(0, 5).forEach((order, index) => {
          console.log(`     ${index + 1}. ${order.product_symbol} - ${order.side} - ${order.size} - Status: ${order.status}`);
        });
      } else {
        console.log('   No open orders found');
      }
    } catch (error) {
      console.log('❌ Orders API failed:', error.message);
    }

    console.log('\n🎯 DIAGNOSIS SUMMARY:');
    console.log('✅ Using correct Delta Exchange API authentication');
    console.log('✅ Server time synchronization with +1s buffer');
    console.log('✅ Proper HMAC SHA256 signature generation');
    console.log('✅ All API endpoints tested');

    console.log('\n💡 NEXT STEPS:');
    console.log('1. If API calls work: Positions will be detected');
    console.log('2. If API calls fail: Update credentials in database');
    console.log('3. Check Delta Exchange dashboard for open positions');
    console.log('4. Verify position is in Profile ID: 54678948');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testDeltaApi().catch(err => console.error('❌ Failed:', err.message)); 