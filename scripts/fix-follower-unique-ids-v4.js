const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixFollowerUniqueIdsV4() {
  console.log('🔧 FIXING FOLLOWER UNIQUE USER IDs (V4)');
  console.log('=' .repeat(60));

  try {
    // 1. Get all active followers
    console.log('1. Fetching active followers...');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }

    console.log(`✅ Found ${followers.length} active followers`);

    // 2. Check current user IDs
    console.log('\n2. Checking current user IDs...');
    const userIds = new Set();
    followers.forEach(follower => {
      userIds.add(follower.user_id);
      console.log(`   - ${follower.follower_name}: ${follower.user_id}`);
    });

    console.log(`   Unique user IDs: ${userIds.size}`);

    if (userIds.size === followers.length) {
      console.log('✅ All followers already have unique user IDs');
      return;
    }

    // 3. Update followers with their own unique ID as user_id
    console.log('\n3. Updating followers with unique user IDs...');
    for (const follower of followers) {
      // Use the follower's own ID as the user_id to make it unique
      const uniqueUserId = follower.id; // Use follower's own ID as user_id

      console.log(`   - ${follower.follower_name}: ${follower.user_id} → ${uniqueUserId}`);

      const { error } = await supabase
        .from('followers')
        .update({ user_id: uniqueUserId })
        .eq('id', follower.id);

      if (error) {
        console.log(`❌ Error updating follower ${follower.follower_name}:`, error);
      } else {
        console.log(`✅ Updated ${follower.follower_name} with user ID ${uniqueUserId}`);
      }
    }

    // 4. Verify the fix
    console.log('\n4. Verifying the fix...');
    const { data: updatedFollowers, error: verifyError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (verifyError) {
      console.log('❌ Error verifying followers:', verifyError);
      return;
    }

    const updatedUserIds = new Set();
    updatedFollowers.forEach(follower => {
      updatedUserIds.add(follower.user_id);
      console.log(`   - ${follower.follower_name}: ${follower.user_id}`);
    });

    console.log(`   Unique user IDs after fix: ${updatedUserIds.size}`);

    if (updatedUserIds.size === updatedFollowers.length) {
      console.log('✅ SUCCESS: All followers now have unique user IDs!');
      console.log('');
      console.log('🔄 NEXT STEPS:');
      console.log('   1. Restart the backend server');
      console.log('   2. Test the copy trading functionality');
      console.log('   3. Verify that all followers are added to the copy trading engine');
    } else {
      console.log('❌ FAILED: Some followers still have duplicate user IDs');
    }

  } catch (error) {
    console.error('❌ Error in fix script:', error);
  }
}

// Run the fix script
fixFollowerUniqueIdsV4().catch(console.error); 