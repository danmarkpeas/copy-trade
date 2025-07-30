const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkEthPosition() {
  console.log('🔍 Checking for ETHUSD Position (+0.01 ETH)...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const brokerId = 'f1bff339-23e2-4763-9aad-a3a02d18cf22';

    console.log('✅ Checking real-time monitor for ETHUSD position...');

    // Test the real-time monitor
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
      console.log('✅ Monitor Response:');
      console.log(JSON.stringify(monitorData, null, 2));
      
      if (monitorData.total_trades_found > 0) {
        console.log('\n🎉 SUCCESS! ETHUSD position detected!');
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
      .eq('master_broker_id', brokerId)
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

    console.log('\n📋 Next Steps:');
    console.log('1. If position detected: Check your follower account for the copied trade');
    console.log('2. If not detected: Wait 2-3 minutes and try again');
    console.log('3. Check Delta Exchange to confirm the position is still open');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkEthPosition().catch(console.error); 