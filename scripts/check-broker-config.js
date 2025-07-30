const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBrokerConfig() {
  console.log('🔍 Checking Broker Configuration...\n');
  
  try {
    // Get all broker accounts
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true);

    if (brokerError) {
      console.error('❌ Error fetching broker accounts:', brokerError);
      return;
    }

    console.log(`📊 Found ${brokerAccounts.length} active broker account(s):\n`);

    brokerAccounts.forEach((broker, index) => {
      console.log(`${index + 1}. ${broker.account_name} (ID: ${broker.id})`);
      console.log(`   User ID: ${broker.user_id}`);
      console.log(`   API Key: ${broker.api_key ? broker.api_key.substring(0, 10) + '...' : 'NOT SET'}`);
      console.log(`   Status: ${broker.is_active ? 'Active' : 'Inactive'}`);
      console.log(`   Verified: ${broker.is_verified ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Get followers for each broker
    for (const broker of brokerAccounts) {
      console.log(`👥 Followers for ${broker.account_name}:\n`);
      
      const { data: followers, error: followerError } = await supabase
        .from('followers')
        .select('*')
        .eq('master_broker_account_id', broker.id)
        .eq('account_status', 'active');

      if (followerError) {
        console.error('❌ Error fetching followers:', followerError);
        continue;
      }

      if (!followers || followers.length === 0) {
        console.log('   No active followers found');
      } else {
        followers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name}`);
          console.log(`      API Key: ${follower.api_key ? follower.api_key.substring(0, 10) + '...' : 'NOT SET'}`);
          console.log(`      Multiplier: ${follower.multiplier || 1.0}`);
          console.log(`      Status: ${follower.account_status}`);
          console.log('');
        });
      }
    }

    // Check which broker is currently being monitored
    console.log('🎯 Current System Configuration:');
    
    if (brokerAccounts.length > 0) {
      const currentBroker = brokerAccounts[0]; // System uses the first active broker
      console.log(`   Monitoring Broker: ${currentBroker.account_name}`);
      console.log(`   Broker ID: ${currentBroker.id}`);
      
      const { data: currentFollowers } = await supabase
        .from('followers')
        .select('*')
        .eq('master_broker_account_id', currentBroker.id)
        .eq('account_status', 'active');

      console.log(`   Active Followers: ${currentFollowers?.length || 0}`);
      
      if (currentFollowers && currentFollowers.length > 0) {
        currentFollowers.forEach(f => {
          console.log(`     - ${f.follower_name} (multiplier: ${f.multiplier || 1.0})`);
        });
      }
    } else {
      console.log('   ❌ No active broker accounts found');
    }

    console.log('\n💡 If Anneshan should be the broker:');
    console.log('1. Make sure Anneshan is in the broker_accounts table');
    console.log('2. Set is_active = true and is_verified = true');
    console.log('3. Ensure Anneshan has valid API credentials');
    console.log('4. Restart the system to pick up the new configuration');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkBrokerConfig().catch(console.error); 