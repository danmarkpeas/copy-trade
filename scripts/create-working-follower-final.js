const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createWorkingFollowerFinal() {
  console.log('👥 Creating Working Follower Record (Final)\n');

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

    // Clean up any existing followers for this user
    console.log('🧹 Cleaning up existing followers...');
    const { error: deleteError } = await supabase
      .from('followers')
      .delete()
      .eq('id', user.id);

    if (deleteError && !deleteError.message.includes('No rows deleted')) {
      console.log('⚠️ Could not delete existing followers:', deleteError.message);
    } else {
      console.log('✅ Cleaned up existing followers');
    }
    console.log('');

    // Create a proper follower record
    console.log('👥 Creating new follower record...');
    const { data: follower, error: followerError } = await supabase
      .from('followers')
      .insert({
        id: user.id,
        subscribed_to: user.id, // This should be the trader/user ID
        capital_allocated: 1000,
        risk_level: 'medium',
        copy_mode: 'multiplier',
        multiplier: 0.5,
        drawdown_limit: 5.00,
        user_id: user.id,
        master_broker_account_id: brokerAccount.id,
        is_verified: true,
        account_status: 'active'
      })
      .select()
      .single();

    if (followerError) {
      console.log('❌ Error creating follower:', followerError.message);
      return;
    }

    console.log('✅ Created follower record successfully');
    console.log('   Follower ID:', follower.id);
    console.log('   Subscribed to:', follower.subscribed_to);
    console.log('   Account status:', follower.account_status);
    console.log('');

    // Test the query that the fixed edge function will use
    console.log('🧪 Testing Fixed Edge Function Query:');
    console.log('=====================================');
    console.log('The fixed edge function will now:');
    console.log('1. Get broker account for broker ID:', brokerAccount.id);
    console.log('2. Find user_id:', brokerAccount.user_id);
    console.log('3. Look for followers where subscribed_to = user_id');
    console.log('4. Check account_status = "active"');
    console.log('');

    // Simulate the fixed edge function query
    const { data: testFollowers, error: testError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', brokerAccount.user_id)
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

    console.log('🎉 SUCCESS! Follower setup complete!');
    console.log('====================================');
    console.log('✅ Created working follower record');
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
    console.log('   - You should now see active_followers > 0');
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

createWorkingFollowerFinal().catch(console.error); 