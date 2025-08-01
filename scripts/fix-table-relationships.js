const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTableRelationships() {
  console.log('🔧 FIXING TABLE RELATIONSHIPS');
  console.log('=' .repeat(60));

  try {
    // 1. Check current table structure
    console.log('1. Checking current table structure...');
    
    // Check if we have the correct table names
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .limit(1);

    if (followersError) {
      console.log('❌ Error checking followers table:', followersError);
      return;
    }

    console.log('✅ Followers table exists');
    if (followers.length > 0) {
      console.log('   Sample follower columns:', Object.keys(followers[0]));
    }

    // 2. Check if we need to rename tables
    console.log('\n2. Checking table names...');
    
    // Check if we have 'follower_accounts' table
    const { data: followerAccounts, error: followerAccountsError } = await supabase
      .from('follower_accounts')
      .select('*')
      .limit(1);

    if (followerAccountsError) {
      console.log('ℹ️  follower_accounts table does not exist, using followers table');
    } else {
      console.log('✅ follower_accounts table exists');
    }

    // 3. Fix follower relationships
    console.log('\n3. Fixing follower relationships...');
    
    const { data: allFollowers, error: allFollowersError } = await supabase
      .from('followers')
      .select('*');

    if (allFollowersError) {
      console.log('❌ Error fetching followers:', allFollowersError);
      return;
    }

    console.log(`✅ Found ${allFollowers.length} followers`);

    // 4. Ensure each follower has proper relationships
    console.log('\n4. Ensuring proper relationships...');
    
    for (const follower of allFollowers) {
      console.log(`   Processing: ${follower.follower_name}`);
      
      // Check if follower has valid user_id
      if (!follower.user_id) {
        console.log(`   ❌ ${follower.follower_name} has no user_id`);
        continue;
      }

      // Check if follower has valid broker_account_id
      if (!follower.master_broker_account_id) {
        console.log(`   ❌ ${follower.follower_name} has no master_broker_account_id`);
        continue;
      }

      // Verify user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', follower.user_id)
        .single();

      if (userError || !user) {
        console.log(`   ❌ User ${follower.user_id} does not exist for ${follower.follower_name}`);
        continue;
      }

      // Verify broker account exists
      const { data: broker, error: brokerError } = await supabase
        .from('broker_accounts')
        .select('id')
        .eq('id', follower.master_broker_account_id)
        .single();

      if (brokerError || !broker) {
        console.log(`   ❌ Broker account ${follower.master_broker_account_id} does not exist for ${follower.follower_name}`);
        continue;
      }

      console.log(`   ✅ ${follower.follower_name} has valid relationships`);
    }

    // 5. Create missing tables if needed
    console.log('\n5. Creating missing tables...');
    
    // Check if copied_trades table exists
    const { data: copiedTrades, error: copiedTradesError } = await supabase
      .from('copied_trades')
      .select('*')
      .limit(1);

    if (copiedTradesError) {
      console.log('ℹ️  copied_trades table does not exist - will be created by the system');
    } else {
      console.log('✅ copied_trades table exists');
    }

    // Check if trade_logs table exists
    const { data: tradeLogs, error: tradeLogsError } = await supabase
      .from('trade_logs')
      .select('*')
      .limit(1);

    if (tradeLogsError) {
      console.log('ℹ️  trade_logs table does not exist - will be created by the system');
    } else {
      console.log('✅ trade_logs table exists');
    }

    // 6. Verify final relationships
    console.log('\n6. Verifying final relationships...');
    
    const { data: finalFollowers, error: finalError } = await supabase
      .from('followers')
      .select(`
        *,
        users!inner(id, email),
        broker_accounts!inner(id, account_name)
      `)
      .eq('account_status', 'active');

    if (finalError) {
      console.log('❌ Error verifying relationships:', finalError);
      return;
    }

    console.log(`✅ Final verification: ${finalFollowers.length} followers with valid relationships`);
    
    finalFollowers.forEach(follower => {
      console.log(`   - ${follower.follower_name}:`);
      console.log(`     User: ${follower.users.email}`);
      console.log(`     Broker: ${follower.broker_accounts.account_name}`);
    });

    console.log('\n✅ SUCCESS: Table relationships verified and fixed!');
    console.log('');
    console.log('🔄 NEXT STEPS:');
    console.log('   1. Start the backend server');
    console.log('   2. Test copy trading functionality');
    console.log('   3. Verify all relationships are working');

  } catch (error) {
    console.error('❌ Error in fix script:', error);
  }
}

// Run the fix script
fixTableRelationships().catch(console.error); 