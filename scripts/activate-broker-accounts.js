const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function activateBrokerAccounts() {
  console.log('🔧 Activating Broker Accounts...\n');
  
  try {
    // Get all broker accounts (active and inactive)
    const { data: allBrokers, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*');

    if (brokerError) {
      console.error('❌ Error fetching broker accounts:', brokerError);
      return;
    }

    console.log(`📊 Found ${allBrokers.length} total broker account(s):\n`);

    allBrokers.forEach((broker, index) => {
      console.log(`${index + 1}. ${broker.account_name} (ID: ${broker.id})`);
      console.log(`   User ID: ${broker.user_id}`);
      console.log(`   Active: ${broker.is_active ? 'Yes' : 'No'}`);
      console.log(`   Verified: ${broker.is_verified ? 'Yes' : 'No'}`);
      console.log(`   API Key: ${broker.api_key ? broker.api_key.substring(0, 10) + '...' : 'NOT SET'}`);
      console.log('');
    });

    // Get all users to see who should have active brokers
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(10);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`👥 Found ${users.length} users:\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.id})`);
    });
    console.log('');

    // For each user, ensure they have an active broker
    for (const user of users) {
      console.log(`🔧 Processing user: ${user.email}`);
      
      // Check if user has any broker accounts
      const userBrokers = allBrokers.filter(b => b.user_id === user.id);
      
      if (userBrokers.length === 0) {
        console.log(`   ❌ No broker accounts found for ${user.email}`);
        continue;
      }

      // Check if user has any active broker accounts
      const activeBrokers = userBrokers.filter(b => b.is_active && b.is_verified);
      
      if (activeBrokers.length === 0) {
        console.log(`   ⚠️ No active broker accounts found for ${user.email}`);
        console.log(`   🔧 Activating first broker account...`);
        
        // Activate the first broker account for this user
        const firstBroker = userBrokers[0];
        const { error: activateError } = await supabase
          .from('broker_accounts')
          .update({ 
            is_active: true, 
            is_verified: true 
          })
          .eq('id', firstBroker.id);

        if (activateError) {
          console.error(`   ❌ Error activating broker:`, activateError);
        } else {
          console.log(`   ✅ Activated broker: ${firstBroker.account_name}`);
        }
      } else {
        console.log(`   ✅ User already has active broker: ${activeBrokers[0].account_name}`);
      }
    }

    // Check followers for each broker
    console.log('\n👥 Checking followers for each broker:\n');
    
    for (const broker of allBrokers) {
      const { data: followers, error: followerError } = await supabase
        .from('followers')
        .select('*')
        .eq('master_broker_account_id', broker.id)
        .eq('account_status', 'active');

      if (followerError) {
        console.error(`❌ Error fetching followers for ${broker.account_name}:`, followerError);
        continue;
      }

      console.log(`📈 ${broker.account_name} (${broker.is_active ? 'Active' : 'Inactive'}):`);
      if (followers && followers.length > 0) {
        followers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name} (multiplier: ${follower.multiplier || 1.0})`);
        });
      } else {
        console.log(`   No active followers`);
      }
      console.log('');
    }

    console.log('🎉 Broker account activation completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart the server: npm run server');
    console.log('2. The system will now detect active broker accounts');
    console.log('3. Copy trading will start automatically for users with active brokers');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

activateBrokerAccounts().catch(console.error); 