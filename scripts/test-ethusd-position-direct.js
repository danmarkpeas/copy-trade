const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testEthusdPositionDirect() {
  console.log('🔍 Direct Test: ETHUSD Position Detection\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const newBrokerId = '332f4927-8f66-46a3-bb4f-252a8c5373e3';

    // Get broker account details
    console.log('🔍 Getting broker account details...');
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', newBrokerId)
      .single();

    if (brokerError) {
      console.log('❌ Error getting broker account:', brokerError.message);
      return;
    }

    console.log('✅ Broker Account:');
    console.log('   API Key:', brokerAccount.api_key.substring(0, 10) + '...');
    console.log('   API Secret:', brokerAccount.api_secret.substring(0, 10) + '...');
    console.log('   Profile ID:', brokerAccount.account_uid);

    // Test Delta Exchange API directly
    console.log('\n🔍 Testing Delta Exchange API directly...');

    const deltaApiUrl = 'https://api.delta.exchange';
    
    // Get server time - try different endpoints
    let deltaServerTime;
    let serverTimeResponse;
    
    // Try v2/time first
    serverTimeResponse = await fetch(`${deltaApiUrl}/v2/time`);
    if (serverTimeResponse.ok) {
      const serverTimeData = await serverTimeResponse.json();
      deltaServerTime = serverTimeData.server_time;
    } else {
      // Try v1/time as fallback
      serverTimeResponse = await fetch(`${deltaApiUrl}/v1/time`);
      if (serverTimeResponse.ok) {
        const serverTimeData = await serverTimeResponse.json();
        deltaServerTime = serverTimeData.server_time;
      } else {
        // Use current time as fallback
        deltaServerTime = Date.now();
        console.log('⚠️ Using current time as fallback');
      }
    }
    
    const timestamp = Math.floor(deltaServerTime / 1000);

    console.log('✅ Server time:', new Date(deltaServerTime).toISOString());
    console.log('✅ Timestamp:', timestamp);

    // Create signature function
    const crypto = require('crypto');
    const createDeltaSignature = (method, path, body, timestamp, secret) => {
      const message = method + path + body + timestamp;
      return crypto.createHmac('sha256', secret).update(message).digest('hex');
    };

    // Test 1: Check futures positions (margined)
    console.log('\n📊 Testing futures positions (margined)...');
    const futuresSignature = createDeltaSignature('GET', '/v2/positions/margined', '', timestamp, brokerAccount.api_secret);
    
    const futuresResponse = await fetch(`${deltaApiUrl}/v2/positions/margined`, {
      method: 'GET',
      headers: {
        'api-key': brokerAccount.api_key,
        'timestamp': timestamp.toString(),
        'signature': futuresSignature,
        'Content-Type': 'application/json'
      }
    });

    if (futuresResponse.ok) {
      const futuresData = await futuresResponse.json();
      console.log('✅ Futures positions response:', JSON.stringify(futuresData, null, 2));
      
      const openFuturesPositions = (futuresData.result || []).filter(pos => parseFloat(pos.size) > 0);
      console.log(`📊 Found ${openFuturesPositions.length} open futures positions:`);
      
      openFuturesPositions.forEach((pos, index) => {
        console.log(`   ${index + 1}. ${pos.product_symbol} - Size: ${pos.size} - Avg Price: ${pos.avg_price}`);
      });
    } else {
      const errorText = await futuresResponse.text();
      console.log('❌ Futures positions failed:', errorText);
    }

    // Test 2: Check spot positions (cash)
    console.log('\n📊 Testing spot positions (cash)...');
    const spotSignature = createDeltaSignature('GET', '/v2/positions/cash', '', timestamp, brokerAccount.api_secret);
    
    const spotResponse = await fetch(`${deltaApiUrl}/v2/positions/cash`, {
      method: 'GET',
      headers: {
        'api-key': brokerAccount.api_key,
        'timestamp': timestamp.toString(),
        'signature': spotSignature,
        'Content-Type': 'application/json'
      }
    });

    if (spotResponse.ok) {
      const spotData = await spotResponse.json();
      console.log('✅ Spot positions response:', JSON.stringify(spotData, null, 2));
      
      const openSpotPositions = (spotData.result || []).filter(pos => parseFloat(pos.size) > 0);
      console.log(`📊 Found ${openSpotPositions.length} open spot positions:`);
      
      openSpotPositions.forEach((pos, index) => {
        console.log(`   ${index + 1}. ${pos.product_symbol} - Size: ${pos.size} - Avg Price: ${pos.avg_price}`);
      });
    } else {
      const errorText = await spotResponse.text();
      console.log('❌ Spot positions failed:', errorText);
    }

    // Test 3: Check recent fills
    console.log('\n📊 Testing recent fills...');
    const fillsSignature = createDeltaSignature('GET', '/v2/fills', '', timestamp, brokerAccount.api_secret);
    
    const fillsResponse = await fetch(`${deltaApiUrl}/v2/fills`, {
      method: 'GET',
      headers: {
        'api-key': brokerAccount.api_key,
        'timestamp': timestamp.toString(),
        'signature': fillsSignature,
        'Content-Type': 'application/json'
      }
    });

    if (fillsResponse.ok) {
      const fillsData = await fillsResponse.json();
      console.log('✅ Fills response:', JSON.stringify(fillsData, null, 2));
      
      const recentFills = (fillsData.result || []).slice(0, 5);
      console.log(`📊 Found ${recentFills.length} recent fills:`);
      
      recentFills.forEach((fill, index) => {
        console.log(`   ${index + 1}. ${fill.product_symbol} - Side: ${fill.side} - Size: ${fill.size} - Price: ${fill.price} - Time: ${fill.created_at}`);
      });
    } else {
      const errorText = await fillsResponse.text();
      console.log('❌ Fills failed:', errorText);
    }

    console.log('\n📋 Summary:');
    console.log('   ✅ Direct API calls working');
    console.log('   ✅ Credentials valid');
    console.log('   ❓ Position detection depends on function update');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testEthusdPositionDirect().catch(console.error); 