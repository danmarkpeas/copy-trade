const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testFollowerCreationAfterFix() {
  console.log('🧪 Testing Follower Creation After Foreign Key Fix...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Check if the foreign key constraint is fixed
    console.log('🔍 Test 1: Checking foreign key constraint...');
    const testFollowerData = {
      id: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID
      subscribed_to: 'fdb32e0d-0778-4f76-b153-c72b8656ab47',
      capital_allocated: 1000,
      risk_level: 'medium',
      copy_mode: 'fixed lot',
      follower_name: 'Test Follower After Fix',
      lot_size: 0.01,
      master_broker_account_id: 'f1bff339-23e2-4763-9aad-a3a02d18cf22',
      profile_id: null,
      api_key: 'test_key',
      api_secret: 'test_secret',
      account_status: 'active',
      is_verified: true,
      created_at: new Date().toISOString()
    };

    console.log('   Attempting to insert follower...');
    const { data: insertedFollower, error: insertError } = await supabase
      .from('followers')
      .insert(testFollowerData)
      .select()
      .single();

    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      console.log('   The foreign key constraint fix may not have been applied yet');
      console.log('   Please run the SQL fix in Supabase Dashboard first');
      return;
    } else {
      console.log('✅ Manual insertion successful:', insertedFollower.id);
      
      // Clean up
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

    // Test 2: Test the create_follower_account function
    console.log('\n🔍 Test 2: Testing create_follower_account function...');
    const { data: functionResult, error: functionError } = await supabase.rpc('create_follower_account', {
      api_key: 'test_function_key_after_fix',
      api_secret: 'test_function_secret_after_fix',
      copy_mode: 'fixed lot',
      follower_name: 'Test Function After Fix',
      lot_size: 0.01,
      master_broker_id: 'f1bff339-23e2-4763-9aad-a3a02d18cf22',
      profile_id: null
    });

    console.log('📊 Function result:');
    console.log('   Error:', functionError);
    console.log('   Data:', functionResult);

    if (functionError) {
      console.log('❌ Function call failed:', functionError.message);
    } else if (functionResult && functionResult.success) {
      console.log('✅ Function call successful!');
      console.log('   Follower ID:', functionResult.follower_id);
      console.log('   Message:', functionResult.message);
      
      // Clean up the function-created follower
      if (functionResult.follower_id) {
        const { error: cleanupError } = await supabase
          .from('followers')
          .delete()
          .eq('id', functionResult.follower_id);
        
        if (cleanupError) {
          console.log('⚠️  Warning: Could not clean up function-created follower:', cleanupError.message);
        } else {
          console.log('✅ Function-created follower cleaned up');
        }
      }
    } else {
      console.log('❌ Function returned failure:');
      console.log('   Error:', functionResult?.error);
      console.log('   Success:', functionResult?.success);
    }

    // Test 3: Check current followers
    console.log('\n🔍 Test 3: Checking current followers...');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', 'fdb32e0d-0778-4f76-b153-c72b8656ab47');

    if (followersError) {
      console.log('❌ Error checking followers:', followersError.message);
    } else {
      console.log(`✅ Found ${followers?.length || 0} followers for user`);
      if (followers && followers.length > 0) {
        followers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name} (${follower.id})`);
        });
      }
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('   If manual insertion worked: Foreign key constraint is fixed ✅');
  console.log('   If function call worked: Both constraint and authentication are fixed ✅');
  console.log('   If both failed: Check the SQL fix was applied correctly');
  
  console.log('\n🎉 Next Steps:');
  console.log('1. If tests passed, try creating a follower from the frontend');
  console.log('2. Make sure you are logged in to the browser application');
  console.log('3. Go to http://localhost:3000/followers and try the form');
}

testFollowerCreationAfterFix().catch(console.error); 