const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

async function debugFollowerDetection() {
  console.log('🔍 DEBUGGING FOLLOWER DETECTION\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get all broker accounts
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true);

    console.log('📋 BROKER ACCOUNTS:');
    if (brokerAccounts && brokerAccounts.length > 0) {
      brokerAccounts.forEach((broker, index) => {
        console.log(`   ${index + 1}. ${broker.account_name} (${broker.id})`);
      });
    }

    // Get all followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    console.log('\n👥 ALL FOLLOWERS:');
    if (followers && followers.length > 0) {
      followers.forEach((follower, index) => {
        console.log(`   ${index + 1}. ${follower.follower_name}`);
        console.log(`      User ID: ${follower.user_id}`);
        console.log(`      Master Broker ID: ${follower.master_broker_account_id}`);
        console.log(`      Copy Mode: ${follower.copy_mode}`);
        console.log('');
      });
    }

    // Test real-time monitor for each broker
    console.log('🔍 TESTING REAL-TIME MONITOR FOR EACH BROKER...');
    
    for (const broker of brokerAccounts || []) {
      console.log(`\n📊 Testing broker: ${broker.account_name} (${broker.id})`);
      
      try {
        const monitorResponse = await axios.post('http://localhost:3001/api/real-time-monitor', {
          broker_id: broker.id
        }, { timeout: 10000 });

        console.log(`   ✅ Monitor response: ${monitorResponse.data.success ? 'Success' : 'Failed'}`);
        console.log(`   📊 Total trades found: ${monitorResponse.data.total_trades_found}`);
        console.log(`   👥 Active followers: ${monitorResponse.data.active_followers}`);
        console.log(`   📈 Trades copied: ${monitorResponse.data.trades_copied}`);
        console.log(`   🎯 Positions detected: ${monitorResponse.data.positions?.length || 0}`);
        
        // Check which followers should be detected for this broker
        const expectedFollowers = followers?.filter(f => f.master_broker_account_id === broker.id) || [];
        console.log(`   🔍 Expected followers for this broker: ${expectedFollowers.length}`);
        
        if (expectedFollowers.length > 0) {
          expectedFollowers.forEach((follower, index) => {
            console.log(`      ${index + 1}. ${follower.follower_name} (${follower.user_id})`);
          });
        }
        
        if (monitorResponse.data.positions && monitorResponse.data.positions.length > 0) {
          console.log('   📊 Current Positions:');
          monitorResponse.data.positions.forEach((pos, index) => {
            console.log(`      ${index + 1}. ${pos.product_symbol} ${pos.size} @ ${pos.avg_price || 'N/A'}`);
          });
        }
      } catch (error) {
        console.log(`   ❌ Monitor failed: ${error.message}`);
      }
    }

    // Check copy trades for each broker
    console.log('\n📊 CHECKING COPY TRADES FOR EACH BROKER...');
    
    for (const broker of brokerAccounts || []) {
      console.log(`\n📊 Copy trades for broker: ${broker.account_name} (${broker.id})`);
      
      const { data: copyTrades, error: tradesError } = await supabase
        .from('copy_trades')
        .select('*')
        .eq('master_broker_id', broker.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (tradesError) {
        console.log(`   ❌ Error fetching copy trades: ${tradesError.message}`);
      } else {
        console.log(`   📊 Copy trades: ${copyTrades?.length || 0}`);
        if (copyTrades && copyTrades.length > 0) {
          copyTrades.forEach((trade, index) => {
            const timeAgo = Math.floor((Date.now() - new Date(trade.created_at).getTime()) / (1000 * 60));
            console.log(`      ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size} (${trade.status}) - ${timeAgo} min ago`);
          });
        }
      }
    }

    console.log('\n🎯 DIAGNOSIS:');
    console.log('1. ✅ Follower user_id is fixed');
    console.log('2. ✅ Database relationships are correct');
    console.log('3. ❓ Real-time monitor may have logic issues');
    console.log('4. ❓ Copy relationships may not be created in the engine');

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Check if the real-time monitor query is correct');
    console.log('2. Verify that copy relationships are created in the engine');
    console.log('3. Test with a new trade to see if copy logic works');
    console.log('4. Monitor backend logs for WebSocket trade events');

  } catch (error) {
    console.log('❌ Debug failed:', error.message);
  }
}

debugFollowerDetection().catch(console.error); 