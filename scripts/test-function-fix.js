const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testFunctionFix() {
  console.log('🧪 Testing Function Fix\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing required environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get the first user
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.log('❌ No users found');
      return;
    }

    const user = users[0];
    console.log('✅ Using user:', user.email);

    // Get broker account
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    const brokerAccount = brokerAccounts[0];
    console.log('✅ Using broker account:', brokerAccount.account_name);
    console.log('   Broker ID:', brokerAccount.id);
    console.log('');

    // Test the simple follower function (this should work)
    console.log('🧪 Testing create_simple_follower_account function...');
    
    try {
      const { data: simpleResult, error: simpleError } = await supabase
        .rpc('create_simple_follower_account', {
          api_key: 'test_api_key',
          api_secret: 'test_api_secret',
          copy_mode: 'multiplier',
          follower_name: 'Test Follower Simple',
          lot_size: 0.01
        });

      if (simpleError) {
        console.log('❌ Simple function error:', simpleError.message);
      } else {
        console.log('✅ Simple function result:', simpleResult);
      }
    } catch (error) {
      console.log('❌ Simple function exception:', error.message);
    }
    console.log('');

    // Test the fixed follower function
    console.log('🧪 Testing create_follower_account function...');
    
    try {
      const { data: result, error } = await supabase
        .rpc('create_follower_account', {
          api_key: 'test_api_key_2',
          api_secret: 'test_api_secret_2',
          copy_mode: 'multiplier',
          follower_name: 'Test Follower Fixed',
          lot_size: 0.01,
          master_broker_id: '57068604', // This was causing the UUID error
          profile_id: null
        });

      if (error) {
        console.log('❌ Fixed function error:', error.message);
      } else {
        console.log('✅ Fixed function result:', result);
      }
    } catch (error) {
      console.log('❌ Fixed function exception:', error.message);
    }
    console.log('');

    // Check current followers
    console.log('🔍 Checking current followers...');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', user.id)
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error checking followers:', followersError.message);
    } else {
      console.log(`✅ Found ${followers?.length || 0} active followers`);
      if (followers && followers.length > 0) {
        followers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ID: ${follower.id}`);
          console.log(`      Name: ${follower.follower_name}`);
          console.log(`      Copy mode: ${follower.copy_mode}`);
          console.log(`      Account status: ${follower.account_status}`);
        });
      }
    }
    console.log('');

    // Test the real-time monitoring
    console.log('🧪 Testing real-time monitoring...');
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/real-time-trade-monitor`;
    
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ broker_id: brokerAccount.id })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Real-time monitoring result:');
        console.log('   Success:', result.success);
        console.log('   Active Followers:', result.active_followers);
        console.log('   Total Trades Found:', result.total_trades_found);
        
        if (result.active_followers > 0) {
          console.log('🎉 SUCCESS! The follower issue is resolved!');
          console.log('   active_followers is now:', result.active_followers);
        } else {
          console.log('⚠️  Still showing 0 active followers');
        }
      } else {
        const errorText = await response.text();
        console.log('❌ Real-time monitoring failed:', response.status, errorText);
      }
    } catch (error) {
      console.log('❌ Error calling real-time monitoring:', error.message);
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testFunctionFix().catch(console.error); 