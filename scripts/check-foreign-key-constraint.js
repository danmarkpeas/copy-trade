const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkForeignKeyConstraint() {
  console.log('🔍 Checking Foreign Key Constraint Details...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check 1: Get the exact foreign key constraint details
    console.log('🔍 Check 1: Checking foreign key constraint details...');
    
    // Try to get the constraint information by looking at the table structure
    const { data: constraintInfo, error: constraintError } = await supabase
      .rpc('get_foreign_key_constraints', { table_name: 'followers' });

    if (constraintError) {
      console.log('❌ Error getting constraint info:', constraintError.message);
      console.log('   Trying alternative approach...');
    } else {
      console.log('✅ Constraint info:', constraintInfo);
    }

    // Check 2: Look at the followers table structure
    console.log('\n🔍 Check 2: Followers table structure...');
    const { data: followersSample, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .limit(1);

    if (followersError) {
      console.log('❌ Error accessing followers table:', followersError.message);
    } else {
      console.log('✅ Followers table accessible');
      if (followersSample && followersSample.length > 0) {
        console.log('   Sample follower record:', followersSample[0]);
      } else {
        console.log('   No followers in table yet');
      }
    }

    // Check 3: Test the exact values that would be inserted
    console.log('\n🔍 Check 3: Testing values for insertion...');
    const testUserId = 'fdb32e0d-0778-4f76-b153-c72b8656ab47'; // danmarkpeas
    const testBrokerId = 'f1bff339-23e2-4763-9aad-a3a02d18cf22'; // from logs
    
    console.log('   Test User ID:', testUserId);
    console.log('   Test Broker ID:', testBrokerId);

    // Check if the user exists
    const { data: userExists, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', testUserId)
      .single();

    if (userError) {
      console.log('❌ User check error:', userError.message);
    } else {
      console.log('✅ User exists:', userExists.id);
    }

    // Check if the broker exists
    const { data: brokerExists, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('id, user_id')
      .eq('id', testBrokerId)
      .single();

    if (brokerError) {
      console.log('❌ Broker check error:', brokerError.message);
    } else {
      console.log('✅ Broker exists:', brokerExists.id, 'User ID:', brokerExists.user_id);
    }

    // Check 4: Try to manually insert a follower record
    console.log('\n🔍 Check 4: Testing manual follower insertion...');
    const testFollowerData = {
      id: 'test-follower-' + Date.now(),
      subscribed_to: testUserId,
      capital_allocated: 1000,
      risk_level: 'medium',
      copy_mode: 'fixed lot',
      follower_name: 'Test Follower',
      lot_size: 0.01,
      master_broker_account_id: testBrokerId,
      profile_id: null,
      api_key: 'test_key',
      api_secret: 'test_secret',
      account_status: 'active',
      is_verified: true,
      created_at: new Date().toISOString()
    };

    console.log('   Attempting to insert:', testFollowerData);

    const { data: insertedFollower, error: insertError } = await supabase
      .from('followers')
      .insert(testFollowerData)
      .select()
      .single();

    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      console.log('   Code:', insertError.code);
      console.log('   Details:', insertError.details);
      console.log('   Hint:', insertError.hint);
      
      // Check if it's a foreign key constraint error
      if (insertError.message.includes('foreign key constraint')) {
        console.log('\n🔍 Foreign key constraint analysis:');
        console.log('   The error suggests that one of the referenced IDs does not exist');
        console.log('   subscribed_to should reference users.id');
        console.log('   master_broker_account_id should reference broker_accounts.id');
        
        // Check if the broker's user_id matches the subscribed_to
        if (brokerExists) {
          console.log('   Broker user_id:', brokerExists.user_id);
          console.log('   Subscribed_to:', testUserId);
          console.log('   Match:', brokerExists.user_id === testUserId ? 'Yes' : 'No');
        }
      }
    } else {
      console.log('✅ Manual insertion successful:', insertedFollower.id);
      
      // Clean up the test record
      const { error: deleteError } = await supabase
        .from('followers')
        .delete()
        .eq('id', insertedFollower.id);
      
      if (deleteError) {
        console.log('⚠️  Warning: Could not clean up test record:', deleteError.message);
      } else {
        console.log('✅ Test record cleaned up');
      }
    }

    // Check 5: Test the function with service role key
    console.log('\n🔍 Check 5: Testing function with service role key...');
    const { data: functionResult, error: functionError } = await supabase.rpc('create_follower_account', {
      api_key: 'test_function_key',
      api_secret: 'test_function_secret',
      copy_mode: 'fixed lot',
      follower_name: 'Test Function Follower',
      lot_size: 0.01,
      master_broker_id: testBrokerId,
      profile_id: null
    });

    console.log('📊 Function result:');
    console.log('   Error:', functionError);
    console.log('   Data:', functionResult);

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('   The foreign key constraint error could be caused by:');
  console.log('   1. Referenced user ID not existing in users table');
  console.log('   2. Referenced broker ID not existing in broker_accounts table');
  console.log('   3. Mismatch between broker.user_id and follower.subscribed_to');
  console.log('   4. Database trigger or constraint issues');
}

checkForeignKeyConstraint().catch(console.error); 