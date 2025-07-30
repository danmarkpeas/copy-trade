const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugUpdatedFunction() {
  console.log('🔍 Debugging Updated Real-Time Monitor Function\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const newBrokerId = '332f4927-8f66-46a3-bb4f-252a8c5373e3';

    console.log('🔍 Testing updated function with detailed logging...');

    // Test the real-time monitor with detailed logging
    const monitorResponse = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/real-time-trade-monitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        broker_id: newBrokerId,
        debug: true // Add debug flag if supported
      })
    });

    console.log('📊 Response Status:', monitorResponse.status);
    console.log('📊 Response Headers:', Object.fromEntries(monitorResponse.headers.entries()));

    if (monitorResponse.ok) {
      const monitorData = await monitorResponse.json();
      console.log('\n✅ Monitor Response:');
      console.log(JSON.stringify(monitorData, null, 2));
      
      if (monitorData.total_trades_found > 0) {
        console.log('\n🎉 SUCCESS! Trades detected!');
        console.log('📊 Total trades found:', monitorData.total_trades_found);
        console.log('📊 Trades copied:', monitorData.trades_copied);
      } else {
        console.log('\n📋 No trades detected');
        console.log('🔍 Possible reasons:');
        console.log('   1. ETHUSD position not in futures (margined)');
        console.log('   2. ETHUSD position not in spot (cash)');
        console.log('   3. No recent fills in last 5 minutes');
        console.log('   4. No open orders');
        console.log('   5. API authentication issue');
      }
    } else {
      const errorText = await monitorResponse.text();
      console.log('❌ Monitor failed:', errorText);
    }

    // Check broker account status
    console.log('\n🔍 Broker Account Status:');
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
      console.log('   API Key Length:', brokerAccount.api_key?.length || 0);
      console.log('   API Secret Length:', brokerAccount.api_secret?.length || 0);
    }

    // Check recent copy trades
    console.log('\n📊 Recent Copy Trades:');
    const { data: recentTrades, error: tradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .eq('master_broker_id', newBrokerId)
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
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error getting followers:', followersError.message);
    } else {
      console.log(`✅ Found ${followers?.length || 0} active followers:`);
      if (followers && followers.length > 0) {
        followers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name} - Copy Mode: ${follower.copy_mode} - Lot Size: ${follower.lot_size} - Subscribed To: ${follower.subscribed_to}`);
        });
      } else {
        console.log('   No active followers found');
      }
    }

    console.log('\n🔍 Next Steps:');
    console.log('1. Check if ETHUSD position is in futures or spot');
    console.log('2. Verify API credentials are working');
    console.log('3. Check function logs in Supabase dashboard');
    console.log('4. Try opening a different position type');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

debugUpdatedFunction().catch(console.error); 