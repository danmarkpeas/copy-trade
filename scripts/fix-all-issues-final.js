const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAllIssuesFinal() {
  console.log('🔧 FIXING ALL ISSUES FINAL');
  console.log('=' .repeat(60));

  try {
    // 1. Clean up duplicate followers
    console.log('1. Cleaning up duplicate followers...');
    
    // Get all followers
    const { data: allFollowers, error: followersError } = await supabase
      .from('followers')
      .select('*');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }

    console.log(`✅ Found ${allFollowers.length} total followers`);

    // Group by follower_name to find duplicates
    const followersByName = {};
    allFollowers.forEach(follower => {
      if (!followersByName[follower.follower_name]) {
        followersByName[follower.follower_name] = [];
      }
      followersByName[follower.follower_name].push(follower);
    });

    // Keep only the first (oldest) follower for each name
    const followersToKeep = [];
    const followersToDelete = [];

    Object.keys(followersByName).forEach(name => {
      const followers = followersByName[name];
      if (followers.length > 1) {
        // Sort by created_at to keep the oldest
        followers.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        followersToKeep.push(followers[0]);
        followersToDelete.push(...followers.slice(1));
      } else {
        followersToKeep.push(followers[0]);
      }
    });

    console.log(`✅ Will keep ${followersToKeep.length} followers`);
    console.log(`🗑️  Will delete ${followersToDelete.length} duplicate followers`);

    // Delete duplicate followers
    for (const follower of followersToDelete) {
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('id', follower.id);

      if (error) {
        console.log(`❌ Error deleting follower ${follower.follower_name}:`, error);
      } else {
        console.log(`✅ Deleted duplicate follower: ${follower.follower_name}`);
      }
    }

    // 2. Ensure each follower has unique user_id
    console.log('\n2. Ensuring unique user IDs...');
    
    const { data: remainingFollowers, error: remainingError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (remainingError) {
      console.log('❌ Error fetching remaining followers:', remainingError);
      return;
    }

    console.log(`✅ Found ${remainingFollowers.length} active followers`);

    // Check if all have unique user_ids
    const userIds = new Set();
    const needsUpdate = [];

    remainingFollowers.forEach(follower => {
      if (userIds.has(follower.user_id)) {
        needsUpdate.push(follower);
      } else {
        userIds.add(follower.user_id);
      }
    });

    if (needsUpdate.length > 0) {
      console.log(`🔄 ${needsUpdate.length} followers need unique user IDs`);
      
      for (const follower of needsUpdate) {
        const newUserId = uuidv4();
        const { error } = await supabase
          .from('followers')
          .update({ user_id: newUserId })
          .eq('id', follower.id);

        if (error) {
          console.log(`❌ Error updating ${follower.follower_name}:`, error);
        } else {
          console.log(`✅ Updated ${follower.follower_name} with new user ID`);
        }
      }
    } else {
      console.log('✅ All followers already have unique user IDs');
    }

    // 3. Verify final state
    console.log('\n3. Verifying final state...');
    
    const { data: finalFollowers, error: finalError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (finalError) {
      console.log('❌ Error fetching final followers:', finalError);
      return;
    }

    console.log(`✅ Final state: ${finalFollowers.length} active followers`);
    
    const finalUserIds = new Set();
    finalFollowers.forEach(follower => {
      finalUserIds.add(follower.user_id);
      console.log(`   - ${follower.follower_name}: ${follower.user_id}`);
    });

    console.log(`   Unique user IDs: ${finalUserIds.size}`);

    if (finalUserIds.size === finalFollowers.length) {
      console.log('✅ SUCCESS: All issues fixed!');
      console.log('');
      console.log('🔄 NEXT STEPS:');
      console.log('   1. Start the backend server');
      console.log('   2. Test copy trading functionality');
      console.log('   3. Verify followers are working correctly');
    } else {
      console.log('❌ FAILED: Some followers still have duplicate user IDs');
    }

  } catch (error) {
    console.error('❌ Error in fix script:', error);
  }
}

// Run the fix script
fixAllIssuesFinal().catch(console.error); 