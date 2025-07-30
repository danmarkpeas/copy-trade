const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testRealTimeMonitor() {
  console.log('🧪 TESTING REAL-TIME MONITOR\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the most recent broker account
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    const brokerAccount = brokerAccounts[0];
    console.log('📋 BROKER ACCOUNT:');
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);
    console.log('   API Key:', brokerAccount.api_key);

    console.log('\n🔍 TESTING REAL-TIME MONITOR...');

    // Test the Edge Function directly
    const { data: result, error: invokeError } = await supabase.functions.invoke('real-time-trade-monitor', {
      body: { broker_id: brokerAccount.id }
    });

    if (invokeError) {
      console.log('❌ Edge Function failed:', invokeError);
      return;
    }

    console.log('✅ Real-time monitor result:');
    console.log('   Success:', result.success);
    console.log('   Message:', result.message);
    console.log('   Total trades found:', result.total_trades_found);
    console.log('   Active followers:', result.active_followers);
    console.log('   Trades copied:', result.trades_copied);
    console.log('   Timestamp:', result.timestamp);

    // Check if there are any followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', brokerAccount.id)
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
    } else {
      console.log('👥 Followers found:', followers?.length || 0);
      if (followers && followers.length > 0) {
        console.log('   Sample follower:', {
          id: followers[0].id,
          copy_mode: followers[0].copy_mode,
          lot_size: followers[0].lot_size
        });
      }
    }

    // Check copy trades table
    const { data: copyTrades, error: copyTradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .eq('master_broker_id', brokerAccount.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (copyTradesError) {
      console.log('❌ Error fetching copy trades:', copyTradesError);
    } else {
      console.log('📊 Recent copy trades:', copyTrades?.length || 0);
      if (copyTrades && copyTrades.length > 0) {
        console.log('   Latest copy trade:', {
          id: copyTrades[0].id,
          symbol: copyTrades[0].original_symbol,
          side: copyTrades[0].original_side,
          status: copyTrades[0].status,
          created_at: copyTrades[0].created_at
        });
      }
    }

    console.log('\n🎯 SYSTEM STATUS:');
    if (result.success) {
      console.log('✅ Real-time monitoring is working correctly!');
      console.log('✅ Edge Function is deployed and functional');
      console.log('✅ Database integration is working');
      
      if (result.total_trades_found > 0) {
        console.log('✅ Trade detection is working');
      } else {
        console.log('⚠️ No trades detected (this is normal if no recent trades)');
      }
      
      if (result.active_followers > 0) {
        console.log('✅ Follower system is working');
      } else {
        console.log('⚠️ No active followers found');
      }
    } else {
      console.log('❌ Real-time monitoring has issues');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testRealTimeMonitor().catch(console.error); 