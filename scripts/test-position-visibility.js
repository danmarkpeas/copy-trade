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

async function testPositionVisibility() {
  console.log('🔍 Testing Position Visibility with Profile ID 54678948...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const brokerId = 'f1bff339-23e2-4763-9aad-a3a02d18cf22';
    const profileId = '54678948';

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
    console.log('✅ Profile ID:', profileId);

    // Get server time
    const serverTime = await getDeltaServerTime();
    const timestamp = Math.floor(serverTime / 1000);

    console.log('🕐 Server time:', new Date(serverTime).toISOString());
    console.log('🕐 Timestamp:', timestamp);

    // Test positions endpoint with profile ID
    console.log('\n🔍 Testing positions endpoint...');
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
      const openPositions = (positionsData.result || [])
        .filter((pos) => parseFloat(pos.size) > 0);
      
      console.log(`📊 Found ${openPositions.length} open positions:`);
      if (openPositions.length > 0) {
        openPositions.forEach((pos, index) => {
          console.log(`   ${index + 1}. ${pos.product_symbol} - Size: ${pos.size} - Avg Price: ${pos.avg_price} - Side: ${parseFloat(pos.size) > 0 ? 'Long' : 'Short'}`);
        });
        console.log('\n🎉 SUCCESS! Your position is visible to the API!');
      } else {
        console.log('   No open positions found');
        console.log('\n💡 This could mean:');
        console.log('   1. The position was closed');
        console.log('   2. The position is in a different format (spot vs futures)');
        console.log('   3. The position is in a different account/profile');
      }
    } else {
      const errorText = await positionsResponse.text();
      console.log('❌ Positions endpoint failed:', errorText);
    }

    // Test fills endpoint (recent trades)
    console.log('\n🔍 Testing fills endpoint (recent trades)...');
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
          const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
          return fillTime > thirtyMinutesAgo;
        });
      
      console.log(`📊 Found ${recentFills.length} recent fills (last 30 minutes):`);
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

    // Test the real-time monitor
    console.log('\n🔍 Testing real-time monitor...');
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
      console.log('✅ Monitor response:', JSON.stringify(monitorData, null, 2));
      
      if (monitorData.total_trades_found > 0) {
        console.log('\n🎉 SUCCESS! The monitor detected your trades!');
      } else {
        console.log('\n📋 Monitor found no trades');
      }
    } else {
      const errorText = await monitorResponse.text();
      console.log('❌ Monitor failed:', errorText);
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('   If positions found: The API can see your position');
  console.log('   If no positions: Check if the position is still open');
  console.log('   If API errors: Check API permissions for this profile');
}

testPositionVisibility().catch(console.error); 