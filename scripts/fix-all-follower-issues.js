const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAllFollowerIssues() {
  console.log('🔧 FIXING ALL FOLLOWER ISSUES');
  console.log('=' .repeat(60));

  try {
    // 1. Get all followers (including inactive ones)
    console.log('1. Fetching all followers...');
    const { data: allFollowers, error: followersError } = await supabase
      .from('followers')
      .select('*');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }

    console.log(`✅ Found ${allFollowers.length} total followers`);

    // 2. Check for duplicate user IDs
    console.log('\n2. Checking for duplicate user IDs...');
    const userIdCounts = {};
    allFollowers.forEach(follower => {
      if (follower.user_id) {
        userIdCounts[follower.user_id] = (userIdCounts[follower.user_id] || 0) + 1;
      }
    });

    const duplicates = Object.entries(userIdCounts).filter(([id, count]) => count > 1);
    console.log(`   Found ${duplicates.length} duplicate user IDs`);

    // 3. Create unique user IDs for each follower
    console.log('\n3. Creating unique user IDs...');
    const updates = [];

    for (const follower of allFollowers) {
      const uniqueUserId = uuidv4();
      console.log(`   - ${follower.follower_name}: ${follower.user_id || 'null'} → ${uniqueUserId}`);

      updates.push({
        id: follower.id,
        user_id: uniqueUserId
      });
    }

    // 4. Update all followers with unique user IDs
    console.log('\n4. Updating followers with unique user IDs...');
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

    // 5. Clean up any duplicate followers (keep only active ones)
    console.log('\n5. Cleaning up duplicate followers...');
    const { data: activeFollowers, error: activeError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (activeError) {
      console.log('❌ Error fetching active followers:', activeError);
    } else {
      console.log(`✅ Found ${activeFollowers.length} active followers`);
      
      // Check for duplicates by name
      const nameCounts = {};
      activeFollowers.forEach(follower => {
        nameCounts[follower.follower_name] = (nameCounts[follower.follower_name] || 0) + 1;
      });

      const duplicateNames = Object.entries(nameCounts).filter(([name, count]) => count > 1);
      console.log(`   Found ${duplicateNames.length} duplicate names`);

      // Keep only the first occurrence of each name
      for (const [name, count] of duplicateNames) {
        const duplicates = activeFollowers.filter(f => f.follower_name === name);
        const toKeep = duplicates[0];
        const toDelete = duplicates.slice(1);

        console.log(`   - Keeping first ${name} (${toKeep.id}), deleting ${toDelete.length} duplicates`);

        for (const duplicate of toDelete) {
          const { error } = await supabase
            .from('followers')
            .delete()
            .eq('id', duplicate.id);

          if (error) {
            console.log(`❌ Error deleting duplicate ${duplicate.id}:`, error);
          } else {
            console.log(`✅ Deleted duplicate follower ${duplicate.id}`);
          }
        }
      }
    }

    // 6. Verify the fix
    console.log('\n6. Verifying the fix...');
    const { data: finalFollowers, error: verifyError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (verifyError) {
      console.log('❌ Error verifying followers:', verifyError);
      return;
    }

    const finalUserIds = new Set();
    finalFollowers.forEach(follower => {
      finalUserIds.add(follower.user_id);
      console.log(`   - ${follower.follower_name}: ${follower.user_id}`);
    });

    console.log(`   Unique user IDs after fix: ${finalUserIds.size}`);
    console.log(`   Total active followers: ${finalFollowers.length}`);

    if (finalUserIds.size === finalFollowers.length) {
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
fixAllFollowerIssues().catch(console.error); 