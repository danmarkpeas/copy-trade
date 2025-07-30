const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugFollowerFrontend() {
  console.log('🔍 DEBUGGING FOLLOWER FRONTEND ISSUE');
  console.log('=====================================\n');

  try {
    // Get the user first
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (usersError) {
      console.error('❌ Error loading users:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.error('❌ No users found');
      return;
    }

    const user = users[0];
    console.log(`👤 Testing with user: ${user.email} (${user.id})`);

    // Test 1: Check if followers exist for this user
    console.log('\n🔍 Test 1: Check followers for user');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('user_id', user.id);

    if (followersError) {
      console.error('❌ Error loading followers:', followersError);
    } else {
      console.log(`✅ Found ${followers?.length || 0} followers for user`);
      if (followers && followers.length > 0) {
        followers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name || 'Unnamed'}`);
          console.log(`      ID: ${follower.id}`);
          console.log(`      Status: ${follower.account_status}`);
          console.log(`      Copy Mode: ${follower.copy_mode}`);
        });
      }
    }

    // Test 2: Check if broker_accounts exist
    console.log('\n🔍 Test 2: Check broker accounts');
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true);

    if (brokerError) {
      console.error('❌ Error loading broker accounts:', brokerError);
    } else {
      console.log(`✅ Found ${brokerAccounts?.length || 0} active broker accounts`);
    }

    // Test 3: Test the exact frontend query
    console.log('\n🔍 Test 3: Frontend query simulation');
    const { data: frontendData, error: frontendError } = await supabase
      .from('followers')
      .select(`
        id,
        follower_name,
        copy_mode,
        lot_size,
        multiplier,
        fixed_lot,
        min_lot_size,
        max_lot_size,
        account_status,
        is_verified,
        created_at,
        master_broker_account_id,
        broker_accounts!inner(
          broker_name,
          account_name,
          users!inner(name)
        )
      `)
      .eq('user_id', user.id)
      .eq('account_status', 'active')
      .order('created_at', { ascending: false });

    if (frontendError) {
      console.error('❌ Frontend query error:', frontendError);
    } else {
      console.log(`✅ Frontend query returned ${frontendData?.length || 0} followers`);
      if (frontendData && frontendData.length > 0) {
        frontendData.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name || 'Unnamed'}`);
          console.log(`      Broker: ${follower.broker_accounts?.broker_name || 'Unknown'}`);
          console.log(`      Account: ${follower.broker_accounts?.account_name || 'Unknown'}`);
        });
      }
    }

    // Test 4: Check if the issue is with the inner join
    console.log('\n🔍 Test 4: Test without inner join');
    const { data: noJoinData, error: noJoinError } = await supabase
      .from('followers')
      .select(`
        id,
        follower_name,
        copy_mode,
        lot_size,
        multiplier,
        fixed_lot,
        min_lot_size,
        max_lot_size,
        account_status,
        is_verified,
        created_at,
        master_broker_account_id,
        broker_accounts(
          broker_name,
          account_name,
          users(name)
        )
      `)
      .eq('user_id', user.id)
      .eq('account_status', 'active')
      .order('created_at', { ascending: false });

    if (noJoinError) {
      console.error('❌ No join query error:', noJoinError);
    } else {
      console.log(`✅ No join query returned ${noJoinData?.length || 0} followers`);
      if (noJoinData && noJoinData.length > 0) {
        noJoinData.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name || 'Unnamed'}`);
          console.log(`      Broker: ${follower.broker_accounts?.broker_name || 'Unknown'}`);
          console.log(`      Account: ${follower.broker_accounts?.account_name || 'Unknown'}`);
        });
      }
    }

    // Test 5: Check if followers have master_broker_account_id
    console.log('\n🔍 Test 5: Check follower broker relationships');
    if (followers && followers.length > 0) {
      followers.forEach((follower, index) => {
        console.log(`   Follower ${index + 1}: ${follower.follower_name}`);
        console.log(`      master_broker_account_id: ${follower.master_broker_account_id}`);
        console.log(`      account_status: ${follower.account_status}`);
      });
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }

  console.log('\n🎉 Debug completed!');
}

debugFollowerFrontend().catch(console.error); 