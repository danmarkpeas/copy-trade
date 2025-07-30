const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkUsersAndFixFollower() {
  console.log('🔍 CHECKING USERS AND FIXING FOLLOWER\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');

    if (usersError) {
      console.log('❌ Error fetching users:', usersError);
      return;
    }

    console.log('👥 EXISTING USERS:');
    if (users && users.length > 0) {
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email || user.id} (${user.id})`);
      });
    } else {
      console.log('   ❌ No users found');
    }

    // Get followers with null user_id
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .is('user_id', null)
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }

    console.log(`\n📊 Found ${followers?.length || 0} followers with null user_id`);

    if (followers && followers.length > 0 && users && users.length > 0) {
      for (const follower of followers) {
        console.log(`\n🔧 Fixing follower: ${follower.follower_name}`);
        console.log(`   Current user_id: ${follower.user_id}`);
        console.log(`   Master broker ID: ${follower.master_broker_account_id}`);

        // Use the first available user ID
        const availableUserId = users[0].id;
        console.log(`   Using user_id: ${availableUserId} (${users[0].email || 'No email'})`);

        // Update the follower with the existing user_id
        const { data: updatedFollower, error: updateError } = await supabase
          .from('followers')
          .update({ user_id: availableUserId })
          .eq('id', follower.id)
          .select()
          .single();

        if (updateError) {
          console.log(`   ❌ Error updating follower: ${updateError.message}`);
        } else {
          console.log(`   ✅ Successfully updated follower user_id`);
          console.log(`   New user_id: ${updatedFollower.user_id}`);
        }
      }
    } else if (followers && followers.length > 0) {
      console.log('❌ No users available to assign to followers');
    } else {
      console.log('✅ No followers with null user_id found');
    }

    // Verify the fix
    console.log('\n🔍 VERIFYING FIX...');
    const { data: allFollowers, error: verifyError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (verifyError) {
      console.log('❌ Error verifying fix:', verifyError);
      return;
    }

    console.log('📊 All active followers:');
    allFollowers?.forEach((follower, index) => {
      console.log(`   ${index + 1}. ${follower.follower_name}`);
      console.log(`      User ID: ${follower.user_id || 'NULL'}`);
      console.log(`      Master Broker ID: ${follower.master_broker_account_id}`);
      console.log(`      Copy Mode: ${follower.copy_mode}`);
      console.log('');
    });

    // Check for any remaining null user_ids
    const nullUserIds = allFollowers?.filter(f => f.user_id === null) || [];
    if (nullUserIds.length > 0) {
      console.log(`⚠️  Warning: ${nullUserIds.length} followers still have null user_id`);
    } else {
      console.log('✅ All followers now have valid user_ids');
    }

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Restart the backend server to reload the copy relationships');
    console.log('2. Test copy trading with a new trade');
    console.log('3. Monitor the logs for successful copy trade execution');

  } catch (error) {
    console.log('❌ Error checking users and fixing follower:', error.message);
  }
}

checkUsersAndFixFollower().catch(console.error); 