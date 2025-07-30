const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testMultiTenantSystem() {
  console.log('🧪 Testing Multi-Tenant Copy Trading System\n');
  
  try {
    // 1. Check all users in the system
    console.log('📊 Step 1: Checking all users in the system...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(5);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.id})`);
    });
    console.log('');

    // 2. Check broker accounts for each user
    console.log('📊 Step 2: Checking broker accounts for each user...');
    for (const user of users) {
      const { data: brokerAccounts, error: brokerError } = await supabase
        .from('broker_accounts')
        .select('*')
        .eq('user_id', user.id);

      if (brokerError) {
        console.error(`❌ Error fetching broker accounts for ${user.email}:`, brokerError);
        continue;
      }

      console.log(`\n👤 ${user.email}:`);
      if (brokerAccounts && brokerAccounts.length > 0) {
        brokerAccounts.forEach((broker, index) => {
          console.log(`  📈 Broker ${index + 1}: ${broker.account_name}`);
          console.log(`     Active: ${broker.is_active ? 'Yes' : 'No'}`);
          console.log(`     Verified: ${broker.is_verified ? 'Yes' : 'No'}`);
          
          // Check followers for this broker
          checkFollowersForBroker(broker);
        });
      } else {
        console.log('  ❌ No broker accounts found');
      }
    }

    // 3. Test the backend API
    console.log('\n🌐 Step 3: Testing backend API...');
    const response = await fetch('http://localhost:3001/api/all-users');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend API is responding');
      console.log(`   Active users: ${data.data.length}`);
    } else {
      console.log('❌ Backend API not responding');
    }

    console.log('\n🎉 Multi-tenant system test completed!');
    console.log('\n💡 How the system works:');
    console.log('1. Each user can have their own broker account');
    console.log('2. Each broker can have multiple followers');
    console.log('3. When a user logs in, their broker account is monitored');
    console.log('4. When the broker executes a trade, all followers copy it');
    console.log('5. Multiple users can be active simultaneously');
    console.log('6. Each user\'s trades are isolated and tracked separately');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function checkFollowersForBroker(broker) {
  try {
    const { data: followers, error: followerError } = await supabase
      .from('followers')
      .select('*')
      .eq('master_broker_account_id', broker.id)
      .eq('account_status', 'active');

    if (followerError) {
      console.error(`    ❌ Error fetching followers:`, followerError);
      return;
    }

    if (followers && followers.length > 0) {
      console.log(`    👥 Followers (${followers.length}):`);
      followers.forEach((follower, index) => {
        console.log(`       ${index + 1}. ${follower.follower_name} (multiplier: ${follower.multiplier || 1.0})`);
      });
    } else {
      console.log('    👥 No active followers');
    }
  } catch (error) {
    console.error(`    ❌ Error checking followers:`, error);
  }
}

testMultiTenantSystem().catch(console.error); 