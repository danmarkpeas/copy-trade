const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkFollowers() {
  console.log('🔍 CHECKING FOLLOWERS IN DATABASE\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get all followers
    console.log('📋 ALL FOLLOWERS IN DATABASE:');
    const { data: allFollowers, error: allFollowersError } = await supabase
      .from('followers')
      .select('*')
      .order('created_at', { ascending: false });

    if (allFollowersError) {
      console.log('❌ Error fetching all followers:', allFollowersError);
      return;
    }

    console.log(`   Total followers found: ${allFollowers?.length || 0}`);

    if (allFollowers && allFollowers.length > 0) {
      allFollowers.forEach((follower, index) => {
        console.log(`\n   ${index + 1}. Follower Details:`);
        console.log(`      ID: ${follower.id}`);
        console.log(`      Name: ${follower.follower_name || 'N/A'}`);
        console.log(`      Status: ${follower.account_status || 'N/A'}`);
        console.log(`      Copy Mode: ${follower.copy_mode || 'N/A'}`);
        console.log(`      Lot Size: ${follower.lot_size || 'N/A'}`);
        console.log(`      Subscribed To: ${follower.subscribed_to || 'N/A'}`);
        console.log(`      Master Broker ID: ${follower.master_broker_account_id || 'N/A'}`);
        console.log(`      Created: ${follower.created_at}`);
        console.log(`      Is Verified: ${follower.is_verified || false}`);
      });
    }

    // Get active broker accounts
    console.log('\n📋 ACTIVE BROKER ACCOUNTS:');
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (brokerError) {
      console.log('❌ Error fetching broker accounts:', brokerError);
      return;
    }

    console.log(`   Total active brokers: ${brokerAccounts?.length || 0}`);

    if (brokerAccounts && brokerAccounts.length > 0) {
      brokerAccounts.forEach((broker, index) => {
        console.log(`\n   ${index + 1}. Broker Details:`);
        console.log(`      ID: ${broker.id}`);
        console.log(`      Name: ${broker.account_name}`);
        console.log(`      User ID: ${broker.user_id}`);
        console.log(`      Status: ${broker.account_status || 'N/A'}`);
        console.log(`      Created: ${broker.created_at}`);
      });
    }

    // Check followers for each broker
    if (brokerAccounts && brokerAccounts.length > 0) {
      console.log('\n🔍 FOLLOWERS PER BROKER:');
      
      for (const broker of brokerAccounts) {
        console.log(`\n   Broker: ${broker.account_name} (${broker.id})`);
        
        const { data: brokerFollowers, error: brokerFollowersError } = await supabase
          .from('followers')
          .select('*')
          .eq('master_broker_account_id', broker.id)
          .eq('account_status', 'active');

        if (brokerFollowersError) {
          console.log(`   ❌ Error fetching followers for broker: ${brokerFollowersError.message}`);
        } else {
          console.log(`   Active followers: ${brokerFollowers?.length || 0}`);
          
          if (brokerFollowers && brokerFollowers.length > 0) {
            brokerFollowers.forEach((follower, index) => {
              console.log(`     ${index + 1}. ${follower.follower_name} (${follower.copy_mode})`);
            });
          }
        }
      }
    }

    // Check users table
    console.log('\n📋 USERS IN DATABASE:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.log('❌ Error fetching users:', usersError);
    } else {
      console.log(`   Total users: ${users?.length || 0}`);
      
      if (users && users.length > 0) {
        users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} (${user.id})`);
        });
      }
    }

    console.log('\n🎯 ANALYSIS:');
    if (allFollowers && allFollowers.length > 0) {
      console.log('✅ Followers exist in database');
      
      const activeFollowers = allFollowers.filter(f => f.account_status === 'active');
      console.log(`   Active followers: ${activeFollowers.length}`);
      
      const inactiveFollowers = allFollowers.filter(f => f.account_status !== 'active');
      console.log(`   Inactive followers: ${inactiveFollowers.length}`);
      
      if (inactiveFollowers.length > 0) {
        console.log('⚠️ Some followers are not active - check their status');
      }
    } else {
      console.log('❌ No followers found in database');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkFollowers().catch(console.error); 