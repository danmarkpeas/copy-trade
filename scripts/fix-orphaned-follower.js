const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixOrphanedFollower() {
  console.log('🔧 FIXING ORPHANED FOLLOWER');
  console.log('============================\n');

  try {
    // Get the current user (gauravcrd@gmail.com)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'gauravcrd@gmail.com')
      .single();

    if (userError) {
      console.error('❌ Error finding user:', userError);
      return;
    }

    console.log(`👤 Found user: ${user.email} (${user.id})`);

    // Find the orphaned follower (Gau)
    const { data: orphanedFollower, error: followerError } = await supabase
      .from('followers')
      .select('id, follower_name, user_id')
      .is('user_id', null)
      .single();

    if (followerError) {
      console.error('❌ Error finding orphaned follower:', followerError);
      return;
    }

    console.log(`👥 Found orphaned follower: ${orphanedFollower.follower_name} (${orphanedFollower.id})`);

    // Update the follower to assign it to the current user
    const { data: updatedFollower, error: updateError } = await supabase
      .from('followers')
      .update({ user_id: user.id })
      .eq('id', orphanedFollower.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating follower:', updateError);
      return;
    }

    console.log(`✅ Successfully assigned ${updatedFollower.follower_name} to ${user.email}`);

    // Verify the fix
    const { data: allFollowers, error: verifyError } = await supabase
      .from('followers')
      .select(`
        id,
        follower_name,
        user_id,
        account_status,
        users!followers_user_id_fkey(email)
      `)
      .eq('user_id', user.id);

    if (verifyError) {
      console.error('❌ Error verifying fix:', verifyError);
      return;
    }

    console.log(`\n📊 Verification - ${user.email} now has ${allFollowers?.length || 0} followers:`);
    allFollowers?.forEach((follower, index) => {
      console.log(`   ${index + 1}. ${follower.follower_name} (${follower.account_status})`);
    });

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }

  console.log('\n🎉 Orphaned follower fix completed!');
}

fixOrphanedFollower().catch(console.error); 