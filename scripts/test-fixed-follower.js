const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testFixedFollower() {
  console.log('🧪 Testing Fixed Follower Creation\n');

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
    console.log('   User ID:', user.id);

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

    // Check current followers count
    console.log('🔍 Checking current followers...');
    const { data: currentFollowers, error: currentError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', user.id);

    if (currentError) {
      console.log('❌ Error checking current followers:', currentError.message);
    } else {
      console.log(`✅ Current followers count: ${currentFollowers?.length || 0}`);
    }
    console.log('');

    // Test the fixed create_follower_account function
    console.log('🧪 Testing fixed create_follower_account function...');
    
    try {
      const { data: result, error } = await supabase
        .rpc('create_follower_account', {
          api_key: 'test_api_key_fixed',
          api_secret: 'test_api_secret_fixed',
          copy_mode: 'multiplier',
          follower_name: 'Test Follower Fixed',
          lot_size: 0.01,
          master_broker_id: brokerAccount.id,
          profile_id: null
        });

      console.log('📊 Function Result:');
      console.log('   Success:', result?.success);
      console.log('   Error:', result?.error);
      console.log('   Details:', result?.details);
      console.log('   Follower ID:', result?.follower_id);
      console.log('   Message:', result?.message);
      console.log('');

      if (error) {
        console.log('❌ Function call error:', error.message);
        console.log('   Code:', error.code);
        console.log('   Details:', error.details);
        console.log('   Hint:', error.hint);
      }
    } catch (funcError) {
      console.log('❌ Function exception:', funcError.message);
    }
    console.log('');

    // Check followers count after function call
    console.log('🔍 Checking followers after function call...');
    const { data: afterFollowers, error: afterError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', user.id);

    if (afterError) {
      console.log('❌ Error checking after followers:', afterError.message);
    } else {
      console.log(`✅ Followers count after function: ${afterFollowers?.length || 0}`);
      
      if (afterFollowers && afterFollowers.length > 0) {
        console.log('📋 Recent followers:');
        afterFollowers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ID: ${follower.id}`);
          console.log(`      Name: ${follower.follower_name}`);
          console.log(`      Copy mode: ${follower.copy_mode}`);
          console.log(`      Status: ${follower.account_status}`);
          console.log(`      Created: ${follower.created_at}`);
        });
      }
    }
    console.log('');

    // Test real-time monitoring
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
          console.log('🎉 SUCCESS! The follower is now showing in real-time monitoring!');
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

    console.log('');
    console.log('📋 Summary:');
    console.log(`   - Initial followers: ${currentFollowers?.length || 0}`);
    console.log(`   - After function call: ${afterFollowers?.length || 0}`);
    console.log(`   - Function success: ${result?.success ? 'Yes' : 'No'}`);

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testFixedFollower().catch(console.error); 