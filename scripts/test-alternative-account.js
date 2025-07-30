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

async function testAlternativeAccount() {
  console.log('🔍 Testing Alternative Broker Account...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test the alternative broker account
    const alternativeBrokerId = 'ff9ce81f-7d9d-471d-9c7d-4615b32b3602';

    // Get broker account credentials
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', alternativeBrokerId)
      .single();

    if (brokerError) {
      console.log('❌ Error getting broker account:', brokerError.message);
      return;
    }

    console.log('✅ Alternative Broker Account Details:');
    console.log('   ID:', brokerAccount.id);
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);
    console.log('   API Key Preview:', brokerAccount.api_key?.substring(0, 10) + '...');
    console.log('   API Secret Preview:', brokerAccount.api_secret?.substring(0, 10) + '...');

    // Get server time
    const serverTime = await getDeltaServerTime();
    const timestamp = Math.floor(serverTime / 1000);

    console.log('🕐 Server time:', new Date(serverTime).toISOString());
    console.log('🕐 Timestamp:', timestamp);

    // Test positions endpoint
    console.log('\n🔍 Testing positions endpoint with alternative account...');
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
        console.log('\n🎉 SUCCESS! Alternative account can see positions!');
      } else {
        console.log('   No open positions found');
      }
    } else {
      const errorText = await positionsResponse.text();
      console.log('❌ Positions endpoint failed:', errorText);
    }

    // Test the real-time monitor with the alternative account
    console.log('\n🔍 Testing real-time monitor with alternative account...');
    const monitorResponse = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/real-time-trade-monitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        broker_id: alternativeBrokerId
      })
    });

    if (monitorResponse.ok) {
      const monitorData = await monitorResponse.json();
      console.log('✅ Monitor response with alternative account:');
      console.log(JSON.stringify(monitorData, null, 2));
      
      if (monitorData.total_trades_found > 0) {
        console.log('\n🎉 SUCCESS! Alternative account detected trades!');
      } else {
        console.log('\n📋 No trades detected with alternative account');
      }
    } else {
      const errorText = await monitorResponse.text();
      console.log('❌ Monitor failed with alternative account:', errorText);
    }

    console.log('\n📋 Analysis:');
    if (positionsResponse.ok) {
      console.log('   ✅ Alternative account has working API credentials');
      console.log('   💡 The issue is with the primary account credentials');
      console.log('   🔧 Solution: Use the alternative account or update primary account credentials');
    } else {
      console.log('   ❌ Both accounts have API credential issues');
      console.log('   💡 The issue is with the API credentials themselves');
      console.log('   🔧 Solution: Update API credentials in Delta Exchange');
    }

    console.log('\n💡 Next Steps:');
    console.log('1. If alternative account works: Switch to using that account');
    console.log('2. If both fail: Update API credentials in Delta Exchange');
    console.log('3. Check API permissions in Delta Exchange dashboard');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testAlternativeAccount().catch(console.error); 