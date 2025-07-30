const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testUpdatedMonitor() {
  console.log('🔍 Testing Updated Real-Time Monitor (All Trading Symbols)...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const newBrokerId = '332f4927-8f66-46a3-bb4f-252a8c5373e3';

    console.log('✅ Testing updated real-time monitor...');
    console.log('📊 This should now detect:');
    console.log('   - Futures positions (margined)');
    console.log('   - Spot positions (cash)');
    console.log('   - Recent fills (all types)');
    console.log('   - Open orders (all types)');

    // Test the real-time monitor
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
      console.log('\n✅ Monitor Response:');
      console.log(JSON.stringify(monitorData, null, 2));
      
      if (monitorData.total_trades_found > 0) {
        console.log('\n🎉 SUCCESS! Trades detected!');
        console.log('📊 Total trades found:', monitorData.total_trades_found);
        console.log('📊 Trades copied:', monitorData.trades_copied);
        
        if (monitorData.copy_results && monitorData.copy_results.length > 0) {
          console.log('\n📋 Copy Results:');
          monitorData.copy_results.forEach((result, index) => {
            console.log(`   ${index + 1}. Trade ID: ${result.trade_id} - Follower: ${result.follower_id} - Success: ${result.success}`);
          });
        }
      } else {
        console.log('\n📋 No trades detected yet');
        console.log('💡 This could mean:');
        console.log('   1. No positions are currently open');
        console.log('   2. No recent fills in the last 5 minutes');
        console.log('   3. No open orders');
        console.log('   4. Function needs to be redeployed');
      }
    } else {
      const errorText = await monitorResponse.text();
      console.log('❌ Monitor failed:', errorText);
    }

    // Check recent copy trades
    console.log('\n📊 Checking recent copy trades...');
    const { data: recentTrades, error: tradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .eq('master_broker_id', newBrokerId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (tradesError) {
      console.log('❌ Error getting recent trades:', tradesError.message);
    } else {
      console.log(`✅ Found ${recentTrades?.length || 0} recent copy trades:`);
      if (recentTrades && recentTrades.length > 0) {
        recentTrades.forEach((trade, index) => {
          console.log(`   ${index + 1}. ${trade.original_symbol} - ${trade.original_side} - Size: ${trade.original_size} - Status: ${trade.status} - Time: ${trade.created_at}`);
        });
      } else {
        console.log('   No recent copy trades found');
      }
    }

    // Get broker account details
    console.log('\n🔍 Broker Account Details:');
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', newBrokerId)
      .single();

    if (brokerError) {
      console.log('❌ Error getting broker account:', brokerError.message);
    } else {
      console.log('✅ Broker Account:');
      console.log('   ID:', brokerAccount.id);
      console.log('   Name:', brokerAccount.account_name);
      console.log('   Profile ID:', brokerAccount.account_uid);
      console.log('   Status:', brokerAccount.account_status);
      console.log('   Verified:', brokerAccount.is_verified);
      console.log('   Active:', brokerAccount.is_active);
    }

    console.log('\n📋 Next Steps:');
    console.log('1. If function is updated: Open any position (futures or spot)');
    console.log('2. If function needs updating: Deploy the updated function first');
    console.log('3. Test with different symbol types:');
    console.log('   - Futures: BTCUSD, ETHUSD, SOLUSDT');
    console.log('   - Spot: Any spot trading pair');
    console.log('   - Options: Any options contracts');

    console.log('\n🎯 Expected Behavior:');
    console.log('   ✅ Should detect futures positions (margined)');
    console.log('   ✅ Should detect spot positions (cash)');
    console.log('   ✅ Should detect recent fills (all types)');
    console.log('   ✅ Should detect open orders (all types)');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testUpdatedMonitor().catch(console.error); 