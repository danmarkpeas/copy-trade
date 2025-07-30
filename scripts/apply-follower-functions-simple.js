const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createFollowerFunctions() {
  console.log('🔧 Creating follower edit functions...\n');

  try {
    // First, let's check if the functions already exist
    console.log('🔍 Checking existing functions...');
    
    const { data: existingFunctions, error: checkError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .in('routine_name', ['get_all_followers', 'get_follower_account_complete_details_with_platform', 'update_follower_account_complete']);

    if (checkError) {
      console.log('⚠️ Could not check existing functions, proceeding with creation...');
    } else {
      console.log(`📋 Found ${existingFunctions?.length || 0} existing functions`);
    }

    // Create get_all_followers function
    console.log('\n🔄 Creating get_all_followers function...');
    const { error: followersError } = await supabase.rpc('create_get_all_followers_function');
    if (followersError) {
      console.log('❌ Error creating get_all_followers:', followersError.message);
    } else {
      console.log('✅ get_all_followers function created');
    }

    // Create get_follower_account_complete_details_with_platform function
    console.log('\n🔄 Creating get_follower_account_complete_details_with_platform function...');
    const { error: detailsError } = await supabase.rpc('create_get_follower_details_function');
    if (detailsError) {
      console.log('❌ Error creating get_follower_details:', detailsError.message);
    } else {
      console.log('✅ get_follower_account_complete_details_with_platform function created');
    }

    // Create update_follower_account_complete function
    console.log('\n🔄 Creating update_follower_account_complete function...');
    const { error: updateError } = await supabase.rpc('create_update_follower_function');
    if (updateError) {
      console.log('❌ Error creating update_follower:', updateError.message);
    } else {
      console.log('✅ update_follower_account_complete function created');
    }

    // Test the functions
    console.log('\n🧪 Testing the functions...');
    
    // Test get_all_followers
    const { data: followers, error: testFollowersError } = await supabase.rpc('get_all_followers');
    if (testFollowersError) {
      console.log('❌ get_all_followers test failed:', testFollowersError.message);
    } else {
      console.log(`✅ get_all_followers working - Found ${followers?.length || 0} followers`);
      if (followers && followers.length > 0) {
        console.log('📊 Sample follower data:');
        console.log(`   Name: ${followers[0].follower_name}`);
        console.log(`   Copy Mode: ${followers[0].copy_mode}`);
        console.log(`   Lot Size: ${followers[0].lot_size}`);
      }
    }

  } catch (error) {
    console.log('❌ Error creating functions:', error.message);
  }
}

// Run the function
createFollowerFunctions().then(() => {
  console.log('\n🎉 FOLLOWER FUNCTIONS CREATION COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Creation error:', error);
  process.exit(1);
}); 