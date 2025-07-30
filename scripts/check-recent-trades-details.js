const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkRecentTradesDetails() {
  console.log('🔍 Checking Recent Copy Trades Details\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const newBrokerId = '332f4927-8f66-46a3-bb4f-252a8c5373e3';

    // Check recent copy trades
    console.log('📊 Checking recent copy trades...');
    const { data: recentTrades, error: tradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (tradesError) {
      console.log('❌ Error getting recent trades:', tradesError.message);
    } else {
      console.log(`✅ Found ${recentTrades?.length || 0} recent copy trades:`);
      if (recentTrades && recentTrades.length > 0) {
        recentTrades.forEach((trade, index) => {
          console.log(`\n   ${index + 1}. Trade Details:`);
          console.log(`      ID: ${trade.id}`);
          console.log(`      Symbol: ${trade.original_symbol}`);
          console.log(`      Side: ${trade.original_side}`);
          console.log(`      Size: ${trade.original_size}`);
          console.log(`      Price: ${trade.original_price}`);
          console.log(`      Status: ${trade.status}`);
          console.log(`      Master Broker: ${trade.master_broker_id}`);
          console.log(`      Follower: ${trade.follower_id}`);
          console.log(`      Created: ${trade.created_at}`);
          console.log(`      Entry Time: ${trade.entry_time}`);
          console.log(`      Exit Time: ${trade.exit_time || 'Not closed'}`);
        });
      } else {
        console.log('   No recent copy trades found');
      }
    }

    // Check trade sync status
    console.log('\n📊 Checking trade sync status...');
    const { data: syncStatus, error: syncError } = await supabase
      .from('trade_sync_status')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (syncError) {
      console.log('❌ Error getting sync status:', syncError.message);
    } else {
      console.log(`✅ Found ${syncStatus?.length || 0} sync status records:`);
      if (syncStatus && syncStatus.length > 0) {
        syncStatus.forEach((sync, index) => {
          console.log(`   ${index + 1}. Sync Status:`);
          console.log(`      Master Trade ID: ${sync.master_trade_id}`);
          console.log(`      Follower Trade ID: ${sync.follower_trade_id || 'None'}`);
          console.log(`      Status: ${sync.sync_status}`);
          console.log(`      Last Verified: ${sync.last_verified}`);
          console.log(`      Error: ${sync.error_message || 'None'}`);
        });
      } else {
        console.log('   No sync status records found');
      }
    }

    // Check broker account details
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
      console.log('   Created:', brokerAccount.created_at);
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
          console.log(`   ${index + 1}. ${follower.follower_name}:`);
          console.log(`      Copy Mode: ${follower.copy_mode}`);
          console.log(`      Lot Size: ${follower.lot_size}`);
          console.log(`      Subscribed To: ${follower.subscribed_to}`);
          console.log(`      Status: ${follower.account_status}`);
        });
      } else {
        console.log('   No active followers found');
      }
    }

    console.log('\n📋 Analysis:');
    if (recentTrades && recentTrades.length > 0) {
      console.log('✅ System has been working before - trades were detected and copied');
      console.log('❓ Current issue: ETHUSD position not being detected');
      console.log('🔍 Possible reasons:');
      console.log('   1. ETHUSD position might be in a different account');
      console.log('   2. Position might be closed or pending');
      console.log('   3. Position might be in a different format (spot vs futures)');
      console.log('   4. Function might need to be redeployed');
    } else {
      console.log('❌ No previous trades found - system might not have worked yet');
    }

    console.log('\n🎯 Next Steps:');
    console.log('1. Verify ETHUSD position is in Profile ID: 54678948');
    console.log('2. Check if position is futures (margined) or spot (cash)');
    console.log('3. Try opening a different position type (BTCUSD, SOLUSDT)');
    console.log('4. Check Supabase function logs for detailed error messages');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkRecentTradesDetails().catch(console.error); 