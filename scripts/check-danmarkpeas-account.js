const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkDanmarkpeasAccount() {
  console.log('🔍 Checking danmarkpeas@gmail.com Account\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing required environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get the danmarkpeas@gmail.com user
    console.log('🔍 Getting danmarkpeas@gmail.com user...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'danmarkpeas@gmail.com');

    if (usersError || !users || users.length === 0) {
      console.log('❌ User danmarkpeas@gmail.com not found');
      return;
    }

    const user = users[0];
    console.log('✅ Found user:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log('');

    // Check if this user has broker accounts
    console.log('🔍 Checking broker accounts...');
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', user.id);

    if (brokerError) {
      console.log('❌ Error getting broker accounts:', brokerError.message);
    } else {
      console.log(`✅ Found ${brokerAccounts?.length || 0} broker accounts:`);
      if (brokerAccounts && brokerAccounts.length > 0) {
        brokerAccounts.forEach((account, index) => {
          console.log(`   ${index + 1}. ID: ${account.id}`);
          console.log(`      Broker: ${account.broker_name}`);
          console.log(`      Account: ${account.account_name}`);
          console.log(`      Status: ${account.account_status}`);
          console.log(`      Active: ${account.is_active}`);
        });
      } else {
        console.log('   ❌ No broker accounts found');
        console.log('   This is why follower creation is failing!');
      }
    }
    console.log('');

    // Check current followers for this user
    console.log('🔍 Checking current followers...');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', user.id);

    if (followersError) {
      console.log('❌ Error getting followers:', followersError.message);
    } else {
      console.log(`✅ Found ${followers?.length || 0} followers for this user`);
      if (followers && followers.length > 0) {
        followers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name} (${follower.account_status})`);
        });
      }
    }
    console.log('');

    // Test the create_follower_account function with this user
    console.log('🧪 Testing create_follower_account function...');
    
    if (brokerAccounts && brokerAccounts.length > 0) {
      const brokerAccount = brokerAccounts[0];
      console.log(`Using broker account: ${brokerAccount.account_name}`);
      
      const { data: result, error } = await supabase
        .rpc('create_follower_account', {
          api_key: 'test_api_key_danmarkpeas',
          api_secret: 'test_api_secret_danmarkpeas',
          copy_mode: 'multiplier',
          follower_name: 'Danmarkpeas Test Follower',
          lot_size: 0.01,
          master_broker_id: brokerAccount.id,
          profile_id: null
        });

      console.log('📊 Function Result:');
      console.log('   Success:', result?.success);
      console.log('   Error:', result?.error);
      console.log('   Message:', result?.message);
      console.log('   Follower ID:', result?.follower_id);

      if (error) {
        console.log('❌ Function call error:', error.message);
      }
    } else {
      console.log('❌ Cannot test function - no broker accounts available');
      console.log('   Need to create a broker account first');
    }
    console.log('');

    // Check if we need to create a broker account for this user
    if (!brokerAccounts || brokerAccounts.length === 0) {
      console.log('🔧 Creating a broker account for danmarkpeas@gmail.com...');
      
      const { data: newBrokerAccount, error: createBrokerError } = await supabase
        .from('broker_accounts')
        .insert({
          user_id: user.id,
          broker_name: 'delta',
          account_name: 'Delta Account - Danmarkpeas',
          api_key: 'test_api_key_for_danmarkpeas',
          api_secret: 'test_api_secret_for_danmarkpeas',
          is_active: true,
          is_verified: true,
          account_status: 'active'
        })
        .select();

      if (createBrokerError) {
        console.log('❌ Error creating broker account:', createBrokerError.message);
      } else {
        console.log('✅ Created broker account:', newBrokerAccount[0].account_name);
        console.log('   Now you can create followers for this account');
      }
    }

    console.log('');
    console.log('📋 Summary:');
    console.log(`   - User: ${user.email} (${user.id})`);
    console.log(`   - Broker accounts: ${brokerAccounts?.length || 0}`);
    console.log(`   - Current followers: ${followers?.length || 0}`);
    
    if (!brokerAccounts || brokerAccounts.length === 0) {
      console.log('   - Issue: No broker accounts (follower creation will fail)');
      console.log('   - Solution: Create a broker account first');
    } else {
      console.log('   - Status: Ready for follower creation');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkDanmarkpeasAccount().catch(console.error); 