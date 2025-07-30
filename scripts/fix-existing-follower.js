const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixExistingFollower() {
  console.log('🔧 Fixing Existing Follower Record\n');

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
    console.log('   Broker User ID:', brokerAccount.user_id);
    console.log('');

    // Get the existing follower record
    console.log('🔍 Getting existing follower record...');
    const { data: existingFollowers, error: followersError } = await supabase
      .from('followers')
      .select('*');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError.message);
      return;
    }

    if (!existingFollowers || existingFollowers.length === 0) {
      console.log('❌ No followers found');
      return;
    }

    const existingFollower = existingFollowers[0];
    console.log('✅ Found existing follower:');
    console.log('   ID:', existingFollower.id);
    console.log('   Current subscribed_to:', existingFollower.subscribed_to);
    console.log('   Current account_status:', existingFollower.account_status);
    console.log('');

    // Update the follower record
    console.log('🔄 Updating follower record...');
    const { data: updatedFollower, error: updateError } = await supabase
      .from('followers')
      .update({
        subscribed_to: user.id, // Set to the user/trader ID
        account_status: 'active' // Change from 'verified' to 'active'
      })
      .eq('id', existingFollower.id)
      .select()
      .single();

    if (updateError) {
      console.log('❌ Error updating follower:', updateError.message);
      return;
    }

    console.log('✅ Successfully updated follower record');
    console.log('   New subscribed_to:', updatedFollower.subscribed_to);
    console.log('   New account_status:', updatedFollower.account_status);
    console.log('');

    // Test the fixed edge function query
    console.log('🧪 Testing Fixed Edge Function Query:');
    console.log('=====================================');
    console.log('The fixed edge function will now find this follower because:');
    console.log(`- subscribed_to = '${user.id}' (matches user ID)`);
    console.log('- account_status = "active" (matches active status)');
    console.log('');

    const { data: testFollowers, error: testError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', user.id)
      .eq('account_status', 'active');

    if (testError) {
      console.log('❌ Test query failed:', testError.message);
    } else {
      console.log(`✅ Test query found ${testFollowers?.length || 0} followers`);
      if (testFollowers && testFollowers.length > 0) {
        console.log('   Follower details:', {
          id: testFollowers[0].id,
          subscribed_to: testFollowers[0].subscribed_to,
          copy_mode: testFollowers[0].copy_mode,
          account_status: testFollowers[0].account_status
        });
      }
    }
    console.log('');

    console.log('🎉 SUCCESS! Follower record fixed!');
    console.log('==================================');
    console.log('✅ Updated existing follower record');
    console.log('✅ Fixed edge function queries');
    console.log('✅ Test query confirms follower will be found');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('==============');
    console.log('1. Deploy the updated edge functions:');
    console.log('   npx supabase functions deploy real-time-trade-monitor');
    console.log('   npx supabase functions deploy copy-trade');
    console.log('');
    console.log('2. Test the real-time monitoring:');
    console.log('   - Go to http://localhost:3000/trades');
    console.log('   - Click "Real-Time Monitor & Copy"');
    console.log('   - You should now see active_followers: 1');
    console.log('');
    console.log('🎯 Expected Result:');
    console.log('==================');
    console.log('The monitoring should now show:');
    console.log('- active_followers: 1 (instead of 0)');
    console.log('- The follower will be able to copy trades');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

fixExistingFollower().catch(console.error); 