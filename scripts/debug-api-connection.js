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

async function debugApiConnection() {
  console.log('🔍 Debugging API Connection...\n');

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

    console.log('✅ Broker Account Details:');
    console.log('   ID:', brokerAccount.id);
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);
    console.log('   API Key Preview:', brokerAccount.api_key?.substring(0, 10) + '...');
    console.log('   API Secret Preview:', brokerAccount.api_secret?.substring(0, 10) + '...');

    // Test 1: Public API (no authentication needed)
    console.log('\n🔍 Test 1: Public API (Products)...');
    const productsResponse = await fetch('https://api.delta.exchange/v2/products');
    
    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      const ethProducts = (productsData.result || [])
        .filter((product) => product.symbol.includes('ETH'))
        .slice(0, 5);
      
      console.log(`✅ Found ${ethProducts.length} ETH products:`);
      ethProducts.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.symbol} - Type: ${product.contract_type} - Status: ${product.status}`);
      });
    } else {
      console.log('❌ Products API failed:', productsResponse.status);
    }

    // Test 2: Server time
    console.log('\n🔍 Test 2: Server Time...');
    const serverTime = await getDeltaServerTime();
    const timestamp = Math.floor(serverTime / 1000);
    console.log('✅ Server time:', new Date(serverTime).toISOString());
    console.log('✅ Timestamp:', timestamp);

    // Test 3: Authenticated API with different timestamp approaches
    console.log('\n🔍 Test 3: Authenticated API Tests...');
    
    const timestampApproaches = [
      { name: 'Server time (no buffer)', value: timestamp },
      { name: 'Server time + 2s', value: timestamp + 2 },
      { name: 'Current time', value: Math.floor(Date.now() / 1000) }
    ];

    for (const approach of timestampApproaches) {
      console.log(`\n   Testing: ${approach.name} (${approach.value})`);
      
      const positionsSignature = await createDeltaSignature('GET', '/v2/positions/margined', '', approach.value, brokerAccount.api_secret);
      
      const positionsResponse = await fetch('https://api.delta.exchange/v2/positions/margined', {
        method: 'GET',
        headers: {
          'api-key': brokerAccount.api_key,
          'timestamp': approach.value.toString(),
          'signature': positionsSignature,
          'Content-Type': 'application/json'
        }
      });

      console.log(`   Status: ${positionsResponse.status}`);
      
      if (positionsResponse.ok) {
        const positionsData = await positionsResponse.json();
        const openPositions = (positionsData.result || [])
          .filter((pos) => parseFloat(pos.size) > 0);
        
        console.log(`   ✅ Found ${openPositions.length} open positions`);
        if (openPositions.length > 0) {
          openPositions.forEach((pos, index) => {
            console.log(`      ${index + 1}. ${pos.product_symbol} - Size: ${pos.size} - Avg Price: ${pos.avg_price}`);
          });
        }
      } else {
        const errorText = await positionsResponse.text();
        console.log(`   ❌ Error: ${errorText}`);
      }
    }

    // Test 4: Check if the real-time monitor is using a different approach
    console.log('\n🔍 Test 4: Real-Time Monitor Test...');
    const monitorResponse = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/real-time-trade-monitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        broker_id: brokerId
      })
    });

    if (monitorResponse.ok) {
      const monitorData = await monitorResponse.json();
      console.log('✅ Monitor works (no API errors)');
      console.log('📊 Monitor result:', JSON.stringify(monitorData, null, 2));
    } else {
      const errorText = await monitorResponse.text();
      console.log('❌ Monitor failed:', errorText);
    }

    console.log('\n📋 Analysis:');
    console.log('   If any timestamp approach works: API credentials are valid');
    console.log('   If all fail with invalid_api_key: Credentials issue');
    console.log('   If all fail with expired_signature: Timing issue');
    console.log('   If monitor works but direct calls fail: Different implementation');

    console.log('\n💡 Next Steps:');
    console.log('1. Check if any timestamp approach works');
    console.log('2. If none work, verify API credentials in Delta Exchange');
    console.log('3. If monitor works but direct calls fail, the issue is in our test script');
    console.log('4. Try opening a position in a different symbol (BTC-PERP)');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

debugApiConnection().catch(console.error); 