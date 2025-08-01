const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixFollowerUniqueIdsV3() {
  console.log('🔧 FIXING FOLLOWER UNIQUE USER IDs (V3)');
  console.log('=' .repeat(60));
  
  try {
    // 1. Check users table structure
    console.log('1. Checking users table structure...');
    const { data: existingUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Error checking users table:', usersError);
      return;
    }
    
    console.log('✅ Users table structure checked');
    if (existingUsers.length > 0) {
      console.log('   Sample user columns:', Object.keys(existingUsers[0]));
    }
    
    // 2. Get all active followers
    console.log('\n2. Fetching active followers...');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');
    
    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }
    
    console.log(`✅ Found ${followers.length} active followers`);
    
    // 3. Check current user IDs
    console.log('\n3. Checking current user IDs...');
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
    
    // 4. Create users in the users table first (simplified)
    console.log('\n4. Creating users in users table...');
    const userCreations = [];
    
    for (let i = 0; i < followers.length; i++) {
      const follower = followers[i];
      const uniqueUserId = uuidv4();
      const userEmail = `follower-${follower.follower_name.toLowerCase().replace(/\s+/g, '-')}@copy-trading.com`;
      
      console.log(`   - Creating user for ${follower.follower_name}:`);
      console.log(`     User ID: ${uniqueUserId}`);
      console.log(`     Email: ${userEmail}`);
      
      userCreations.push({
        followerId: follower.id,
        followerName: follower.follower_name,
        userId: uniqueUserId,
        email: userEmail
      });
    }
    
    // 5. Insert users into users table (simplified)
    console.log('\n5. Inserting users into users table...');
    for (const userCreation of userCreations) {
      const { error } = await supabase
        .from('users')
        .insert({
          id: userCreation.userId,
          email: userCreation.email,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.log(`❌ Error creating user for ${userCreation.followerName}:`, error);
      } else {
        console.log(`✅ Created user for ${userCreation.followerName}`);
      }
    }
    
    // 6. Update followers with unique user IDs
    console.log('\n6. Updating followers with unique user IDs...');
    for (const userCreation of userCreations) {
      const { error } = await supabase
        .from('followers')
        .update({ user_id: userCreation.userId })
        .eq('id', userCreation.followerId);
      
      if (error) {
        console.log(`❌ Error updating follower ${userCreation.followerName}:`, error);
      } else {
        console.log(`✅ Updated ${userCreation.followerName} with user ID ${userCreation.userId}`);
      }
    }
    
    // 7. Verify the fix
    console.log('\n7. Verifying the fix...');
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
fixFollowerUniqueIdsV3().catch(console.error); 