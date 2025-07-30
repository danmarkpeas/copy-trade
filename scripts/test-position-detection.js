const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testPositionDetection() {
  console.log('🔍 Testing Position Detection with Detailed Logging\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const newBrokerId = '332f4927-8f66-46a3-bb4f-252a8c5373e3';

    console.log('🔍 Testing real-time monitor with detailed request...');

    // Test the real-time monitor with more detailed request
    const monitorResponse = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/real-time-trade-monitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        broker_id: newBrokerId,
        debug_mode: true,
        include_logs: true
      })
    });

    console.log('📊 Response Status:', monitorResponse.status);
    console.log('📊 Response Headers:', Object.fromEntries(monitorResponse.headers.entries()));

    if (monitorResponse.ok) {
      const monitorData = await monitorResponse.json();
      console.log('\n✅ Monitor Response:');
      console.log(JSON.stringify(monitorData, null, 2));
      
      if (monitorData.total_trades_found > 0) {
        console.log('\n🎉 SUCCESS! Positions detected!');
        console.log('📊 Total trades found:', monitorData.total_trades_found);
        console.log('📊 Trades copied:', monitorData.trades_copied);
      } else {
        console.log('\n📋 No positions detected');
        console.log('🔍 Possible issues:');
        console.log('   1. ETHUSD position might be in a different account');
        console.log('   2. Position might be closed or pending');
        console.log('   3. Function might have API authentication issues');
        console.log('   4. Position might be in a different format');
      }
    } else {
      const errorText = await monitorResponse.text();
      console.log('❌ Monitor failed:', errorText);
    }

    // Check if there are any recent activities
    console.log('\n📊 Checking for any recent activities...');
    
    // Check recent copy trades
    const { data: recentTrades, error: tradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (tradesError) {
      console.log('❌ Error getting recent trades:', tradesError.message);
    } else {
      console.log(`✅ Found ${recentTrades?.length || 0} recent copy trades`);
    }

    // Check broker account status
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', newBrokerId)
      .single();

    if (brokerError) {
      console.log('❌ Error getting broker account:', brokerError.message);
    } else {
      console.log('\n✅ Broker Account Status:');
      console.log('   ID:', brokerAccount.id);
      console.log('   Name:', brokerAccount.account_name);
      console.log('   Profile ID:', brokerAccount.account_uid);
      console.log('   Status:', brokerAccount.account_status);
      console.log('   Verified:', brokerAccount.is_verified);
      console.log('   Active:', brokerAccount.is_active);
      console.log('   Created:', brokerAccount.created_at);
    }

    console.log('\n🔍 Debugging Steps:');
    console.log('1. Check Supabase function logs for detailed error messages');
    console.log('2. Verify ETHUSD position is in Profile ID: 54678948');
    console.log('3. Check if position is futures (margined) or spot (cash)');
    console.log('4. Try opening a different position type (BTCUSD, SOLUSDT)');
    console.log('5. Check if position is still open and active');

    console.log('\n💡 Expected Behavior:');
    console.log('   ✅ Should detect futures positions (margined)');
    console.log('   ✅ Should detect spot positions (cash)');
    console.log('   ✅ Should detect recent fills (all types)');
    console.log('   ✅ Should detect open orders (all types)');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testPositionDetection().catch(console.error); 