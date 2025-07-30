const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugOpenPosition() {
  console.log('🔍 Debugging Open Position Detection...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const brokerId = 'f1bff339-23e2-4763-9aad-a3a02d18cf22';

    // Get broker account details
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', brokerId)
      .single();

    if (brokerError) {
      console.log('❌ Error getting broker account:', brokerError.message);
      return;
    }

    console.log('✅ Broker Account Details:');
    console.log('   ID:', brokerAccount.id);
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);
    console.log('   API Key Length:', brokerAccount.api_key?.length || 0);
    console.log('   API Secret Length:', brokerAccount.api_secret?.length || 0);

    // Check recent copy trades to see what was detected before
    console.log('\n📊 Recent Copy Trades (Last 10):');
    const { data: recentTrades, error: tradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .eq('master_broker_id', brokerId)
      .order('created_at', { ascending: false })
      .limit(10);

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
      .eq('subscribed_to', brokerAccount.user_id)
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

    // Test the real-time monitor with detailed logging
    console.log('\n🔍 Testing Real-Time Monitor with Detailed Logging...');
    const monitorResponse = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/real-time-trade-monitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        broker_id: brokerId,
        debug: true // Add debug flag if the function supports it
      })
    });

    if (monitorResponse.ok) {
      const monitorData = await monitorResponse.json();
      console.log('✅ Monitor Response:');
      console.log(JSON.stringify(monitorData, null, 2));
      
      if (monitorData.total_trades_found > 0) {
        console.log('\n🎉 SUCCESS! Trades detected!');
      } else {
        console.log('\n📋 No trades detected by monitor');
      }
    } else {
      const errorText = await monitorResponse.text();
      console.log('❌ Monitor failed:', errorText);
    }

    // Check if there are any trade sync status records
    console.log('\n📊 Trade Sync Status:');
    const { data: syncStatus, error: syncError } = await supabase
      .from('trade_sync_status')
      .select('*')
      .eq('master_broker_id', brokerId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (syncError) {
      console.log('❌ Error getting sync status:', syncError.message);
    } else {
      console.log(`✅ Found ${syncStatus?.length || 0} sync status records:`);
      if (syncStatus && syncStatus.length > 0) {
        syncStatus.forEach((sync, index) => {
          console.log(`   ${index + 1}. Trade ID: ${sync.master_trade_id} - Status: ${sync.sync_status} - Time: ${sync.created_at}`);
        });
      } else {
        console.log('   No sync status records found');
      }
    }

    console.log('\n🔍 Possible Issues:');
    console.log('1. Position might be in a different format (spot vs futures)');
    console.log('2. Position might be too recent (API delay)');
    console.log('3. Position might be in a different account/profile');
    console.log('4. API permissions might not include position reading');
    console.log('5. Position might be below minimum size threshold');

    console.log('\n💡 Next Steps:');
    console.log('1. Check if your position is a futures position (like BTC-PERP)');
    console.log('2. Wait 5-10 minutes for API to update');
    console.log('3. Try opening a new position with a larger size');
    console.log('4. Check Delta Exchange API permissions for this profile');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

debugOpenPosition().catch(console.error); 