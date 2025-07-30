const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestFollowers() {
  console.log('🧪 CREATING TEST FOLLOWERS FOR DIFFERENT USERS');
  console.log('==============================================\n');

  try {
    // Step 1: Get existing users
    console.log('🔄 Step 1: Getting existing users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');

    if (usersError) {
      console.log('❌ Error fetching users:', usersError.message);
      return;
    }

    console.log(`✅ Found ${users?.length || 0} users:`);
    if (users && users.length > 0) {
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.id})`);
      });
    }

    // Step 2: Get existing broker accounts
    console.log('\n🔄 Step 2: Getting broker accounts...');
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('account_status', 'active');

    if (brokerError) {
      console.log('❌ Error fetching broker accounts:', brokerError.message);
      return;
    }

    console.log(`✅ Found ${brokerAccounts?.length || 0} broker accounts:`);
    if (brokerAccounts && brokerAccounts.length > 0) {
      brokerAccounts.forEach((account, index) => {
        console.log(`  ${index + 1}. ${account.broker_name} - ${account.account_name} (${account.id})`);
      });
    }

    // Step 3: Create test followers for different scenarios
    console.log('\n🔄 Step 3: Creating test followers...');
    
    const testFollowers = [
      {
        name: 'Test User 1 Follower',
        user_id: users?.[0]?.id || null,
        broker_account_id: brokerAccounts?.[0]?.id,
        copy_mode: 'multiplier',
        multiplier: 1.2,
        lot_size: 1.5
      },
      {
        name: 'Test User 2 Follower',
        user_id: users?.[1]?.id || null,
        broker_account_id: brokerAccounts?.[0]?.id,
        copy_mode: 'percentage',
        percentage: 15.0,
        lot_size: 2.0
      },
      {
        name: 'System Test Follower',
        user_id: null, // System follower
        broker_account_id: brokerAccounts?.[0]?.id,
        copy_mode: 'fixed lot',
        fixed_lot: 2.5,
        lot_size: 1.0
      },
      {
        name: 'Another User Follower',
        user_id: users?.[0]?.id || null,
        broker_account_id: brokerAccounts?.[1]?.id || brokerAccounts?.[0]?.id,
        copy_mode: 'multiplier',
        multiplier: 1.8,
        lot_size: 3.0
      }
    ];

    for (const testFollower of testFollowers) {
      console.log(`\n📋 Creating follower: ${testFollower.name}`);
      
      const followerData = {
        follower_name: testFollower.name,
        subscribed_to: testFollower.user_id || '29a36e2e-84e4-4998-8588-6ffb02a77890', // Default master
        master_broker_account_id: testFollower.broker_account_id,
        user_id: testFollower.user_id,
        copy_mode: testFollower.copy_mode,
        multiplier: testFollower.multiplier || 1.0,
        percentage: testFollower.percentage || 10.0,
        fixed_lot: testFollower.fixed_lot || 1.0,
        lot_size: testFollower.lot_size,
        max_lot_size: 10.0,
        min_lot_size: 0.1,
        drawdown_limit: 20.0,
        total_balance: 10000.0,
        risk_level: 'medium',
        capital_allocated: 1000.0,
        max_daily_trades: 50,
        max_open_positions: 10,
        stop_loss_percentage: 5.0,
        take_profit_percentage: 10.0,
        account_status: 'active',
        is_verified: true,
        profile_id: `test_profile_${Date.now()}`,
        api_key: `test_api_key_${Date.now()}`,
        api_secret: `test_api_secret_${Date.now()}`
      };

      const { data: newFollower, error: createError } = await supabase
        .from('followers')
        .insert([followerData])
        .select()
        .single();

      if (createError) {
        console.log(`  ❌ Failed to create ${testFollower.name}:`, createError.message);
      } else {
        console.log(`  ✅ Created ${testFollower.name} successfully`);
        console.log(`  📊 Follower ID: ${newFollower.id}`);
        console.log(`  📊 User ID: ${newFollower.user_id || 'null'}`);
        console.log(`  📊 Copy Mode: ${newFollower.copy_mode}`);
      }
    }

    // Step 4: Verify all followers
    console.log('\n🔄 Step 4: Verifying all followers...');
    const { data: allFollowers, error: allFollowersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (allFollowersError) {
      console.log('❌ Error fetching all followers:', allFollowersError.message);
    } else {
      console.log(`✅ Total followers: ${allFollowers?.length || 0}`);
      console.log('\n📊 All followers:');
      allFollowers?.forEach((follower, index) => {
        console.log(`  ${index + 1}. ${follower.follower_name}`);
        console.log(`     User ID: ${follower.user_id || 'null'}`);
        console.log(`     Copy Mode: ${follower.copy_mode}`);
        console.log(`     Lot Size: ${follower.lot_size}`);
        console.log(`     Status: ${follower.account_status}`);
      });
    }

    console.log('\n🎉 TEST FOLLOWERS CREATION COMPLETE!');
    console.log('✅ You now have multiple followers for testing');
    console.log('✅ Test the edit functionality with different users');
    console.log('✅ Each follower should be editable regardless of user_id');

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run the creation
createTestFollowers().then(() => {
  console.log('\n🎉 CREATION COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Creation error:', error);
  process.exit(1);
}); 