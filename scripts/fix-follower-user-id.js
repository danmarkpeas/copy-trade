const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

async function fixFollowerUserId() {
  console.log('🔧 FIXING FOLLOWER USER ID\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
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

    console.log(`📊 Found ${followers?.length || 0} followers with null user_id`);

    if (followers && followers.length > 0) {
      for (const follower of followers) {
        console.log(`\n🔧 Fixing follower: ${follower.follower_name}`);
        console.log(`   Current user_id: ${follower.user_id}`);
        console.log(`   Master broker ID: ${follower.master_broker_account_id}`);

        // Generate a proper UUID
        const newUserId = crypto.randomUUID();
        
        console.log(`   New user_id: ${newUserId}`);

        // Update the follower with the new user_id
        const { data: updatedFollower, error: updateError } = await supabase
          .from('followers')
          .update({ user_id: newUserId })
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
    console.log('❌ Error fixing follower user_id:', error.message);
  }
}

fixFollowerUserId().catch(console.error); 