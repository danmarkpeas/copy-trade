const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixFollowersComplete() {
  console.log('🔧 Complete Fix for Followers Issue\n');

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
    console.log('');

    // Step 1: Create a trader record for the user
    console.log('👨‍💼 Creating trader record...');
    const { data: trader, error: traderError } = await supabase
      .from('traders')
      .insert({
        id: user.id,
        bio: 'Test trader for copy trading',
        performance_rating: 4.5,
        total_followers: 1
      })
      .select()
      .single();

    if (traderError) {
      if (traderError.message.includes('duplicate key')) {
        console.log('✅ Trader record already exists');
      } else {
        console.log('❌ Error creating trader:', traderError.message);
        return;
      }
    } else {
      console.log('✅ Created trader record');
    }
    console.log('');

    // Step 2: Create a proper follower record
    console.log('👥 Creating follower record...');
    
    // First, check if follower already exists
    const { data: existingFollower, error: checkError } = await supabase
      .from('followers')
      .select('*')
      .eq('id', user.id)
      .single();

    if (checkError && !checkError.message.includes('No rows found')) {
      console.log('❌ Error checking existing follower:', checkError.message);
      return;
    }

    if (existingFollower) {
      console.log('✅ Follower record already exists, updating...');
      
      // Update the existing follower with the correct fields
      const { error: updateError } = await supabase
        .from('followers')
        .update({
          subscribed_to: user.id, // This should be the trader ID
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
        .eq('id', user.id);

      if (updateError) {
        console.log('❌ Error updating follower:', updateError.message);
        return;
      }
      console.log('✅ Updated existing follower record');
    } else {
      console.log('✅ Creating new follower record...');
      
      const { data: newFollower, error: createError } = await supabase
        .from('followers')
        .insert({
          id: user.id,
          subscribed_to: user.id, // This should be the trader ID
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

      if (createError) {
        console.log('❌ Error creating follower:', createError.message);
        return;
      }
      console.log('✅ Created new follower record');
    }
    console.log('');

    // Step 3: Test the follower query
    console.log('🧪 Testing follower queries...');
    
    // Test the exact query that the edge function uses
    const { data: edgeFunctionFollowers, error: edgeError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', brokerAccount.id)
      .eq('is_active', true)
      .eq('sync_status', 'active');

    if (edgeError) {
      console.log('❌ Edge function query error:', edgeError.message);
      console.log('💡 This is expected - the edge function is looking for wrong columns');
    } else {
      console.log(`✅ Edge function query found ${edgeFunctionFollowers?.length || 0} followers`);
    }

    // Test a query that should work with the current table structure
    const { data: workingFollowers, error: workingError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', user.id)
      .eq('account_status', 'active');

    if (workingError) {
      console.log('❌ Working query error:', workingError.message);
    } else {
      console.log(`✅ Working query found ${workingFollowers?.length || 0} followers`);
      if (workingFollowers && workingFollowers.length > 0) {
        console.log('   Follower details:', {
          id: workingFollowers[0].id,
          subscribed_to: workingFollowers[0].subscribed_to,
          copy_mode: workingFollowers[0].copy_mode,
          account_status: workingFollowers[0].account_status
        });
      }
    }
    console.log('');

    console.log('🎯 Root Cause Analysis:');
    console.log('=======================');
    console.log('The edge function is looking for:');
    console.log('- subscribed_to = broker_account_id (WRONG)');
    console.log('- is_active = true (MISSING COLUMN)');
    console.log('- sync_status = "active" (MISSING COLUMN)');
    console.log('');
    console.log('But the followers table has:');
    console.log('- subscribed_to = trader_id (CORRECT)');
    console.log('- account_status = "active" (DIFFERENT NAME)');
    console.log('- No is_active or sync_status columns');
    console.log('');

    console.log('💡 Solution Options:');
    console.log('===================');
    console.log('Option 1: Fix the edge function to use correct column names');
    console.log('Option 2: Add missing columns to followers table');
    console.log('Option 3: Create a view that maps the columns correctly');
    console.log('');
    console.log('🚀 For now, the follower record is created correctly');
    console.log('   The real-time monitoring will work once we fix the column mismatch');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

fixFollowersComplete().catch(console.error); 