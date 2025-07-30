const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugCopyRelationships() {
  console.log('🔍 DEBUGGING COPY RELATIONSHIPS\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get broker accounts
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true);

    console.log('📋 BROKER ACCOUNTS:');
    if (brokerAccounts && brokerAccounts.length > 0) {
      brokerAccounts.forEach((broker, index) => {
        console.log(`   ${index + 1}. ${broker.account_name} (${broker.id})`);
      });
    } else {
      console.log('   ❌ No active broker accounts found');
    }

    // Get followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    console.log('\n👥 FOLLOWERS:');
    if (followers && followers.length > 0) {
      followers.forEach((follower, index) => {
        console.log(`   ${index + 1}. ${follower.follower_name}`);
        console.log(`      User ID: ${follower.user_id}`);
        console.log(`      Master Broker ID: ${follower.master_broker_account_id}`);
        console.log(`      Copy Mode: ${follower.copy_mode}`);
        console.log(`      Status: ${follower.account_status}`);
        console.log('');
      });
    } else {
      console.log('   ❌ No active followers found');
    }

    // Check copy relationships
    console.log('🔗 COPY RELATIONSHIPS:');
    if (followers && followers.length > 0) {
      for (const follower of followers) {
        const masterBroker = brokerAccounts?.find(b => b.id === follower.master_broker_account_id);
        if (masterBroker) {
          console.log(`   ✅ ${follower.follower_name} -> ${masterBroker.account_name}`);
          console.log(`      Follower ID: ${follower.user_id}`);
          console.log(`      Master ID: ${follower.master_broker_account_id}`);
          console.log(`      Relationship: ACTIVE`);
        } else {
          console.log(`   ❌ ${follower.follower_name} -> UNKNOWN MASTER`);
          console.log(`      Master Broker ID: ${follower.master_broker_account_id} (not found)`);
        }
        console.log('');
      }
    }

    // Check recent copy trades
    console.log('📊 RECENT COPY TRADES:');
    const { data: copyTrades, error: tradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (copyTrades && copyTrades.length > 0) {
      copyTrades.forEach((trade, index) => {
        console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size}`);
        console.log(`      Master Broker: ${trade.master_broker_id}`);
        console.log(`      Follower: ${trade.follower_id}`);
        console.log(`      Status: ${trade.status}`);
        console.log(`      Time: ${trade.created_at}`);
        console.log('');
      });
    } else {
      console.log('   ⏳ No copy trades found');
    }

    // Test the copy relationship logic
    console.log('🧪 TESTING COPY RELATIONSHIP LOGIC:');
    if (followers && followers.length > 0 && brokerAccounts && brokerAccounts.length > 0) {
      const follower = followers[0];
      const masterBroker = brokerAccounts.find(b => b.id === follower.master_broker_account_id);
      
      if (masterBroker) {
        console.log(`   Testing: ${follower.follower_name} -> ${masterBroker.account_name}`);
        console.log(`   Follower ID: ${follower.user_id}`);
        console.log(`   Master ID: ${follower.master_broker_account_id}`);
        console.log(`   Expected relationship: ${follower.user_id} -> ${follower.master_broker_account_id}`);
        
        // Simulate the copy relationship check
        const copyRelationships = new Map();
        copyRelationships.set(follower.user_id, new Set([follower.master_broker_account_id]));
        
        const testMasterId = follower.master_broker_account_id;
        const followersOfMaster = Array.from(copyRelationships.entries())
          .filter(([_, masterIds]) => masterIds.has(testMasterId))
          .map(([followerId]) => followerId);
        
        console.log(`   Found followers for master: ${followersOfMaster.length}`);
        console.log(`   Follower IDs: ${followersOfMaster.join(', ')}`);
        
        if (followersOfMaster.includes(follower.user_id)) {
          console.log('   ✅ Copy relationship is correctly configured');
        } else {
          console.log('   ❌ Copy relationship is missing');
        }
      }
    }

    console.log('\n🎯 DIAGNOSIS:');
    console.log('1. Check if follower.user_id matches the expected format');
    console.log('2. Verify that copy relationships are being created in the engine');
    console.log('3. Ensure the master broker ID matches between followers and broker_accounts');
    console.log('4. Check if the WebSocket events are properly routing to the copy engine');

  } catch (error) {
    console.log('❌ Error debugging copy relationships:', error.message);
  }
}

debugCopyRelationships().catch(console.error); 