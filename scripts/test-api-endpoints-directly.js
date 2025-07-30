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

async function testApiEndpointsDirectly() {
  console.log('🔍 Testing Delta Exchange API Endpoints Directly...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const brokerId = 'f1bff339-23e2-4763-9aad-a3a02d18cf22';

    // Get broker account credentials
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
    console.log('✅ Profile ID:', brokerAccount.account_uid);

    // Get server time
    const serverTime = await getDeltaServerTime();
    const timestamp = Math.floor(serverTime / 1000);

    console.log('🕐 Server time:', new Date(serverTime).toISOString());
    console.log('🕐 Timestamp:', timestamp);

    // Test 1: Check fills (completed trades) - last 5 minutes
    console.log('\n🔍 Test 1: Checking fills (last 5 minutes)...');
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
      console.log('📊 Raw fills data:', JSON.stringify(fillsData, null, 2));
      
      const recentFills = (fillsData.result || [])
        .filter((fill) => {
          const fillTime = new Date(fill.created_at).getTime();
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
          return fillTime > fiveMinutesAgo;
        });
      
      console.log(`📊 Found ${recentFills.length} fills in last 5 minutes:`);
      if (recentFills.length > 0) {
        recentFills.forEach((fill, index) => {
          console.log(`   ${index + 1}. ${fill.product_symbol} - ${fill.side} - Size: ${fill.size} - Price: ${fill.price} - Time: ${fill.created_at}`);
        });
      } else {
        console.log('   No recent fills found');
      }
    } else {
      const errorText = await fillsResponse.text();
      console.log('❌ Fills endpoint failed:', errorText);
    }

    // Test 2: Check positions (open positions)
    console.log('\n🔍 Test 2: Checking positions (open positions)...');
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
      console.log('📊 Raw positions data:', JSON.stringify(positionsData, null, 2));
      
      const openPositions = (positionsData.result || [])
        .filter((pos) => parseFloat(pos.size) > 0);
      
      console.log(`📊 Found ${openPositions.length} open positions:`);
      if (openPositions.length > 0) {
        openPositions.forEach((pos, index) => {
          console.log(`   ${index + 1}. ${pos.product_symbol} - Size: ${pos.size} - Avg Price: ${pos.avg_price} - Side: ${parseFloat(pos.size) > 0 ? 'Long' : 'Short'}`);
        });
      } else {
        console.log('   No open positions found');
        
        // Check all positions (including zero/negative)
        const allPositions = positionsData.result || [];
        console.log(`📊 Total positions (including zero): ${allPositions.length}`);
        if (allPositions.length > 0) {
          allPositions.forEach((pos, index) => {
            console.log(`   ${index + 1}. ${pos.product_symbol} - Size: ${pos.size} - Avg Price: ${pos.avg_price}`);
          });
        }
      }
    } else {
      const errorText = await positionsResponse.text();
      console.log('❌ Positions endpoint failed:', errorText);
    }

    // Test 3: Check orders (open orders)
    console.log('\n🔍 Test 3: Checking orders (open orders)...');
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
      console.log('📊 Raw orders data:', JSON.stringify(ordersData, null, 2));
      
      const openOrders = (ordersData.result || [])
        .filter((order) => order.status === 'open' || order.status === 'pending');
      
      console.log(`📊 Found ${openOrders.length} open orders:`);
      if (openOrders.length > 0) {
        openOrders.forEach((order, index) => {
          console.log(`   ${index + 1}. ${order.product_symbol} - ${order.side} - Size: ${order.size} - Status: ${order.status} - Type: ${order.order_type}`);
        });
      } else {
        console.log('   No open orders found');
      }
    } else {
      const errorText = await ordersResponse.text();
      console.log('❌ Orders endpoint failed:', errorText);
    }

    console.log('\n📋 Analysis:');
    console.log('   If fills found: Recent trades detected');
    console.log('   If positions found: Open positions detected');
    console.log('   If orders found: Pending orders detected');
    console.log('   If all empty: No trading activity in this account');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testApiEndpointsDirectly().catch(console.error); 