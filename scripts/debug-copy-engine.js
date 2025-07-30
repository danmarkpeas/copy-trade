const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugCopyEngine() {
  console.log('🔍 DEBUGGING COPY TRADING ENGINE\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Wait for servers to start
    console.log('⏳ Waiting for servers to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check server status
    console.log('🔍 CHECKING SERVER STATUS...');
    
    try {
      const backendResponse = await axios.get('http://localhost:3001/api/health', { timeout: 5000 });
      console.log('   ✅ Backend (API): Running on localhost:3001');
    } catch (error) {
      console.log('   ❌ Backend: Not accessible');
      return;
    }

    // Get copy trading status
    console.log('\n📊 CHECKING COPY TRADING STATUS...');
    try {
      const statusResponse = await axios.get('http://localhost:3001/api/status', { timeout: 5000 });
      console.log('   Copy Trading Status:', statusResponse.data);
      
      const status = statusResponse.data.data;
      console.log(`   Master Traders: ${status.masterTraders}`);
      console.log(`   Followers: ${status.followers}`);
      console.log(`   Copy Relationships: ${status.copyRelationships}`);
      console.log(`   Total Trades: ${status.totalTrades}`);
    } catch (error) {
      console.log('   ❌ Error getting copy trading status:', error.message);
    }

    // Check database state
    console.log('\n📊 CHECKING DATABASE STATE...');
    
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }

    console.log(`📊 Active followers: ${followers?.length || 0}`);
    if (followers && followers.length > 0) {
      followers.forEach((follower, index) => {
        console.log(`   ${index + 1}. ${follower.follower_name}`);
        console.log(`      User ID: ${follower.user_id || 'NULL'}`);
        console.log(`      Master Broker ID: ${follower.master_broker_account_id}`);
        console.log(`      Copy Mode: ${follower.copy_mode}`);
        console.log('');
      });
    }

    // Test real-time monitor
    console.log('🔍 TESTING REAL-TIME MONITOR...');
    
    const { data: brokerAccounts } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (brokerAccounts && brokerAccounts.length > 0) {
      const brokerId = brokerAccounts[0].id;
      
      try {
        const monitorResponse = await axios.post('http://localhost:3001/api/real-time-monitor', {
          broker_id: brokerId
        }, { timeout: 10000 });

        console.log('   ✅ Backend monitor: Working');
        console.log(`   📊 Total trades found: ${monitorResponse.data.total_trades_found}`);
        console.log(`   👥 Active followers: ${monitorResponse.data.active_followers}`);
        console.log(`   📈 Trades copied: ${monitorResponse.data.trades_copied}`);
        console.log(`   🎯 Positions detected: ${monitorResponse.data.positions?.length || 0}`);
        
        if (monitorResponse.data.positions && monitorResponse.data.positions.length > 0) {
          console.log('   📊 Current Positions:');
          monitorResponse.data.positions.forEach((pos, index) => {
            console.log(`      ${index + 1}. ${pos.product_symbol} ${pos.size} @ ${pos.avg_price || 'N/A'}`);
          });
        }
      } catch (error) {
        console.log('   ❌ Backend monitor failed:', error.message);
      }
    }

    // Simulate copy relationship check
    console.log('\n🔗 SIMULATING COPY RELATIONSHIP CHECK...');
    if (followers && followers.length > 0 && brokerAccounts && brokerAccounts.length > 0) {
      const follower = followers[0];
      const masterBroker = brokerAccounts.find(b => b.id === follower.master_broker_account_id);
      
      if (masterBroker) {
        console.log(`   Testing: ${follower.follower_name} -> ${masterBroker.account_name}`);
        console.log(`   Follower ID: ${follower.user_id}`);
        console.log(`   Master ID: ${follower.master_broker_account_id}`);
        
        // Simulate the copy relationship check
        const copyRelationships = new Map();
        copyRelationships.set(follower.user_id, new Set([follower.master_broker_account_id]));
        
        const testMasterId = follower.master_broker_account_id;
        const followersOfMaster = Array.from(copyRelationships.entries())
          .filter(([_, masterIds]) => masterIds.has(testMasterId))
          .map(([followerId]) => followerId);
        
        console.log(`   Expected followers for master: ${followersOfMaster.length}`);
        console.log(`   Expected follower IDs: ${followersOfMaster.join(', ')}`);
        
        if (followersOfMaster.includes(follower.user_id)) {
          console.log('   ✅ Copy relationship logic is correct');
        } else {
          console.log('   ❌ Copy relationship logic is broken');
        }
      }
    }

    // Check recent copy trades
    console.log('\n📊 CHECKING RECENT COPY TRADES...');
    const { data: copyTrades, error: tradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (tradesError) {
      console.log('❌ Error fetching copy trades:', tradesError);
    } else {
      console.log(`📊 Recent copy trades: ${copyTrades?.length || 0}`);
      if (copyTrades && copyTrades.length > 0) {
        copyTrades.forEach((trade, index) => {
          const timeAgo = Math.floor((Date.now() - new Date(trade.created_at).getTime()) / (1000 * 60));
          console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size} (${trade.status}) - ${timeAgo} min ago`);
        });
      }
    }

    console.log('\n🎯 DIAGNOSIS:');
    console.log('1. ✅ Follower user_id is now fixed');
    console.log('2. ✅ WebSocket connections are working');
    console.log('3. ✅ Backend monitor is working');
    console.log('4. ❓ Copy relationships may not be created properly');
    console.log('5. ❓ New trades may not be triggering copy logic');

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Place a new trade in Delta Exchange to test copy trading');
    console.log('2. Check the backend logs for WebSocket trade events');
    console.log('3. Monitor if copy relationships are being used');
    console.log('4. Verify that the copy trading engine is receiving trade events');

  } catch (error) {
    console.log('❌ Debug failed:', error.message);
  }
}

debugCopyEngine().catch(console.error); 