const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkSignusdPosition() {
  console.log('🔍 Checking for SIGNUSD Position with New Broker Account...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Use the new broker account ID
    const newBrokerId = '332f4927-8f66-46a3-bb4f-252a8c5373e3';

    console.log('✅ Checking real-time monitor for SIGNUSD position...');

    // Test the real-time monitor with the new broker account
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
      console.log('✅ Monitor Response:');
      console.log(JSON.stringify(monitorData, null, 2));
      
      if (monitorData.total_trades_found > 0) {
        console.log('\n🎉 SUCCESS! SIGNUSD position detected!');
        console.log('📊 Trades found:', monitorData.total_trades_found);
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
        console.log('   1. Position is still processing (wait 1-2 minutes)');
        console.log('   2. Position is in a different account/profile');
        console.log('   3. Position format is not supported');
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

    // Check active followers
    console.log('\n👥 Active Followers:');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error getting followers:', followersError.message);
    } else {
      console.log(`✅ Found ${followers?.length || 0} active followers:`);
      if (followers && followers.length > 0) {
        followers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name} - Copy Mode: ${follower.copy_mode} - Lot Size: ${follower.lot_size}`);
        });
      } else {
        console.log('   No active followers found');
      }
    }

    // Get broker account details
    console.log('\n🔍 New Broker Account Details:');
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
    console.log('1. If position detected: Check your follower account for the copied trade');
    console.log('2. If not detected: Wait 2-3 minutes and try again');
    console.log('3. Check Delta Exchange to confirm the SIGNUSD position is still open');
    console.log('4. Make sure SIGNUSD is a futures contract (not spot)');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkSignusdPosition().catch(console.error); 