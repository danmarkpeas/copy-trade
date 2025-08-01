const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixFollowerUniqueIds() {
  console.log('🔧 FIXING FOLLOWER UNIQUE USER IDs');
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
    
    // 3. Create unique user IDs for each follower
    console.log('\n3. Creating unique user IDs...');
    const updates = [];
    
    for (let i = 0; i < followers.length; i++) {
      const follower = followers[i];
      const uniqueUserId = uuidv4();
      
      console.log(`   - ${follower.follower_name}: ${follower.user_id} → ${uniqueUserId}`);
      
      updates.push({
        id: follower.id,
        user_id: uniqueUserId
      });
    }
    
    // 4. Update followers with unique user IDs
    console.log('\n4. Updating followers in database...');
    for (const update of updates) {
      const { error } = await supabase
        .from('followers')
        .update({ user_id: update.user_id })
        .eq('id', update.id);
      
      if (error) {
        console.log(`❌ Error updating follower ${update.id}:`, error);
      } else {
        console.log(`✅ Updated follower ${update.id} with user ID ${update.user_id}`);
      }
    }
    
    // 5. Verify the fix
    console.log('\n5. Verifying the fix...');
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
fixFollowerUniqueIds().catch(console.error); 