const { createClient } = require('@supabase/supabase-js');
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

async function testDeltaWithCredentials() {
  console.log('🔍 Testing Delta Exchange API with Database Credentials...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Step 1: Get broker account credentials
    console.log('🔍 Step 1: Getting broker account credentials...');
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

    console.log('✅ Broker account found:');
    console.log('   ID:', brokerAccount.id);
    console.log('   Broker:', brokerAccount.broker_name);
    console.log('   Account:', brokerAccount.account_name);
    console.log('   API Key:', brokerAccount.api_key ? 'Present' : 'Missing');
    console.log('   API Secret:', brokerAccount.api_secret ? 'Present' : 'Missing');

    if (!brokerAccount.api_key || !brokerAccount.api_secret) {
      console.log('❌ API credentials are missing from the database');
      return;
    }

    // Step 2: Test server time
    console.log('\n🔍 Step 2: Testing server time...');
    const serverTime = await getDeltaServerTime();
    console.log('✅ Server time:', new Date(serverTime).toISOString());

    // Step 3: Test positions endpoint
    console.log('\n🔍 Step 3: Testing positions endpoint...');
    const timestamp = Math.floor(serverTime / 1000) + 5;
    const positionsSignature = await createDeltaSignature('GET', '/v2/positions/margined', '', timestamp, brokerAccount.api_secret);
    
    const positionsResponse = await fetch('https://api.delta.exchange/v2/positions/margined', {
      method: 'GET',
      headers: {
        'api-key': brokerAccount.api_key,
        'timestamp': timestamp.toString(),
        'signature': positionsSignature,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Positions response status:', positionsResponse.status);
    
    if (positionsResponse.ok) {
      const positionsData = await positionsResponse.json();
      console.log('✅ Positions API response received');
      
      const openPositions = (positionsData.result || [])
        .filter((pos) => parseFloat(pos.size) > 0);
      
      console.log(`📊 Found ${openPositions.length} open positions:`);
      if (openPositions.length > 0) {
        openPositions.forEach((pos, index) => {
          console.log(`   ${index + 1}. ${pos.product_symbol} - Size: ${pos.size} - Avg Price: ${pos.avg_price}`);
        });
      } else {
        console.log('   No open positions found');
      }
    } else {
      const errorText = await positionsResponse.text();
      console.log('❌ Positions endpoint failed:', errorText);
    }

    // Step 4: Test fills endpoint
    console.log('\n🔍 Step 4: Testing fills endpoint...');
    const fillsSignature = await createDeltaSignature('GET', '/v2/fills', '', timestamp, brokerAccount.api_secret);
    
    const fillsResponse = await fetch('https://api.delta.exchange/v2/fills', {
      method: 'GET',
      headers: {
        'api-key': brokerAccount.api_key,
        'timestamp': timestamp.toString(),
        'signature': fillsSignature,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Fills response status:', fillsResponse.status);
    
    if (fillsResponse.ok) {
      const fillsData = await fillsResponse.json();
      const recentFills = (fillsData.result || [])
        .filter((fill) => {
          const fillTime = new Date(fill.created_at).getTime();
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
          return fillTime > fiveMinutesAgo;
        });
      
      console.log(`📊 Found ${recentFills.length} recent fills (last 5 minutes):`);
      if (recentFills.length > 0) {
        recentFills.forEach((fill, index) => {
          console.log(`   ${index + 1}. ${fill.product_symbol} - ${fill.side} - Size: ${fill.size} - Price: ${fill.price}`);
        });
      } else {
        console.log('   No recent fills found');
      }
    } else {
      const errorText = await fillsResponse.text();
      console.log('❌ Fills endpoint failed:', errorText);
    }

    // Step 5: Test orders endpoint
    console.log('\n🔍 Step 5: Testing orders endpoint...');
    const ordersSignature = await createDeltaSignature('GET', '/v2/orders', '', timestamp, brokerAccount.api_secret);
    
    const ordersResponse = await fetch('https://api.delta.exchange/v2/orders', {
      method: 'GET',
      headers: {
        'api-key': brokerAccount.api_key,
        'timestamp': timestamp.toString(),
        'signature': ordersSignature,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Orders response status:', ordersResponse.status);
    
    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      const openOrders = (ordersData.result || [])
        .filter((order) => order.status === 'open' || order.status === 'pending');
      
      console.log(`📊 Found ${openOrders.length} open orders:`);
      if (openOrders.length > 0) {
        openOrders.forEach((order, index) => {
          console.log(`   ${index + 1}. ${order.product_symbol} - ${order.side} - Size: ${order.size} - Status: ${order.status}`);
        });
      } else {
        console.log('   No open orders found');
      }
    } else {
      const errorText = await ordersResponse.text();
      console.log('❌ Orders endpoint failed:', errorText);
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('   If positions are found: The API is working and you have open positions');
  console.log('   If no positions found: You may not have open positions in Delta Exchange');
  console.log('   If API errors: Check your API credentials and permissions');
  console.log('   If fills/orders found: The API is working correctly');
}

testDeltaWithCredentials().catch(console.error); 