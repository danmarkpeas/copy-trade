const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createWorkingFollower() {
  console.log('👥 Creating Working Follower Record\n');

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

    // First, let's check what columns exist in the followers table
    console.log('🔍 Checking followers table structure...');
    const { data: existingFollowers, error: checkError } = await supabase
      .from('followers')
      .select('*')
      .limit(1);

    if (checkError) {
      console.log('❌ Error checking followers table:', checkError.message);
      return;
    }

    console.log('✅ Followers table accessible');
    if (existingFollowers && existingFollowers.length > 0) {
      console.log('   Existing columns:', Object.keys(existingFollowers[0]));
    }
    console.log('');

    // The edge function expects these fields in FollowerData:
    // id, user_id, subscribed_to, capital_allocated, risk_level, copy_mode
    // multiplier, lot_size, percentage_balance, drawdown_limit, is_active, broker_account_id, sync_status

    // Create a follower record that matches the edge function expectations
    console.log('👥 Creating follower record for edge function...');
    
    // First, delete any existing follower record for this user
    const { error: deleteError } = await supabase
      .from('followers')
      .delete()
      .eq('id', user.id);

    if (deleteError && !deleteError.message.includes('No rows deleted')) {
      console.log('⚠️ Could not delete existing follower:', deleteError.message);
    }

    // Create new follower record
    const { data: follower, error: followerError } = await supabase
      .from('followers')
      .insert({
        id: user.id,
        subscribed_to: brokerAccount.id, // This should match the broker ID for the edge function
        capital_allocated: 1000,
        risk_level: 'medium',
        copy_mode: 'multiplier'
      })
      .select()
      .single();

    if (followerError) {
      console.log('❌ Error creating follower:', followerError.message);
      return;
    }

    console.log('✅ Created follower record');
    console.log('   Follower ID:', follower.id);
    console.log('   Subscribed to:', follower.subscribed_to);
    console.log('');

    // Now let's add the missing columns using direct SQL
    console.log('🔧 Adding missing columns to followers table...');
    
    // We'll use a different approach - let's try to update the record with the fields we can
    console.log('🔄 Updating follower with available fields...');
    
    // Let's check what we can actually update
    const updateData = {
      capital_allocated: 1000,
      risk_level: 'medium',
      copy_mode: 'multiplier'
    };

    const { error: updateError } = await supabase
      .from('followers')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.log('❌ Error updating follower:', updateError.message);
    } else {
      console.log('✅ Updated follower record');
    }
    console.log('');

    // Test the exact query that the edge function uses
    console.log('🧪 Testing edge function query...');
    const { data: testFollowers, error: testError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', brokerAccount.id)
      .eq('is_active', true)
      .eq('sync_status', 'active');

    if (testError) {
      console.log('❌ Error testing edge function query:', testError.message);
      console.log('💡 This is expected - the missing columns will cause this error');
    } else {
      console.log(`✅ Found ${testFollowers?.length || 0} active followers`);
    }
    console.log('');

    // Let's test a simpler query without the missing columns
    console.log('🧪 Testing simplified query...');
    const { data: simpleFollowers, error: simpleError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', brokerAccount.id);

    if (simpleError) {
      console.log('❌ Error with simple query:', simpleError.message);
    } else {
      console.log(`✅ Found ${simpleFollowers?.length || 0} followers for broker`);
      if (simpleFollowers && simpleFollowers.length > 0) {
        console.log('   Follower details:', {
          id: simpleFollowers[0].id,
          subscribed_to: simpleFollowers[0].subscribed_to,
          copy_mode: simpleFollowers[0].copy_mode
        });
      }
    }
    console.log('');

    console.log('🎯 Issue Analysis:');
    console.log('==================');
    console.log('The edge function expects these columns in followers table:');
    console.log('- is_active (BOOLEAN)');
    console.log('- sync_status (TEXT)');
    console.log('- user_id (UUID)');
    console.log('- broker_account_id (UUID)');
    console.log('- multiplier (DECIMAL)');
    console.log('- lot_size (DECIMAL)');
    console.log('- percentage_balance (DECIMAL)');
    console.log('- drawdown_limit (DECIMAL)');
    console.log('');
    console.log('💡 Solution: We need to add these columns to the followers table');
    console.log('   You can do this manually in your Supabase dashboard:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Run the ALTER TABLE commands to add missing columns');
    console.log('   3. Then test the real-time monitoring again');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

createWorkingFollower().catch(console.error); 