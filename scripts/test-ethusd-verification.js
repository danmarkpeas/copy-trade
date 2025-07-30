const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testEthusdVerification() {
  console.log('🔍 Testing ETHUSD Position Verification\n');

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

    // Test the delta-api-verify function (which we know works)
    console.log('\n🔍 Testing delta-api-verify function...');
    const verifyResponse = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/delta-api-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        broker_name: 'delta',
        api_key: brokerAccount.api_key,
        api_secret: brokerAccount.api_secret
      })
    });

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('✅ Delta API verification result:', JSON.stringify(verifyData, null, 2));
      
      if (verifyData.valid) {
        console.log('✅ API credentials are valid!');
      } else {
        console.log('❌ API credentials are invalid');
        return;
      }
    } else {
      const errorText = await verifyResponse.text();
      console.log('❌ Delta API verification failed:', errorText);
      return;
    }

    // Now test the real-time monitor with the same credentials
    console.log('\n🔍 Testing real-time monitor with verified credentials...');
    const monitorResponse = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/real-time-trade-monitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        broker_id: newBrokerId
      })
    });

    if (monitorResponse.ok) {
      const monitorData = await monitorResponse.json();
      console.log('✅ Real-time monitor result:', JSON.stringify(monitorData, null, 2));
      
      if (monitorData.total_trades_found > 0) {
        console.log('\n🎉 SUCCESS! ETHUSD position detected!');
        console.log('📊 Total trades found:', monitorData.total_trades_found);
        console.log('📊 Trades copied:', monitorData.trades_copied);
      } else {
        console.log('\n📋 No trades detected');
        console.log('🔍 This means:');
        console.log('   1. ETHUSD position might not be in the expected format');
        console.log('   2. Position might be in a different account');
        console.log('   3. Function might need more debugging');
      }
    } else {
      const errorText = await monitorResponse.text();
      console.log('❌ Real-time monitor failed:', errorText);
    }

    console.log('\n📋 Summary:');
    console.log('   ✅ API credentials: Working');
    console.log('   ✅ Delta API verification: Working');
    console.log('   ❓ Real-time monitor: Need to check logs');
    console.log('   ❓ ETHUSD position: Not detected yet');

    console.log('\n🔍 Next Steps:');
    console.log('1. Check Supabase function logs for detailed error messages');
    console.log('2. Verify ETHUSD position is in the correct account');
    console.log('3. Try opening a different position type');
    console.log('4. Check if position is futures or spot');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testEthusdVerification().catch(console.error); 