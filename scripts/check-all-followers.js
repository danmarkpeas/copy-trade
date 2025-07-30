const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllFollowers() {
  console.log('🔍 CHECKING ALL FOLLOWERS IN DATABASE');
  console.log('=====================================\n');

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email');

    if (usersError) {
      console.error('❌ Error loading users:', usersError);
      return;
    }

    console.log(`📊 Found ${users?.length || 0} users:`);
    users?.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.id})`);
    });

    // Get all followers
    const { data: allFollowers, error: followersError } = await supabase
      .from('followers')
      .select(`
        id,
        follower_name,
        user_id,
        account_status,
        copy_mode,
        lot_size,
        multiplier,
        fixed_lot,
        created_at,
        users!followers_user_id_fkey(email)
      `)
      .order('created_at', { ascending: false });

    if (followersError) {
      console.error('❌ Error loading all followers:', followersError);
      return;
    }

    console.log(`\n📊 Found ${allFollowers?.length || 0} total followers:`);
    
    if (allFollowers && allFollowers.length > 0) {
      allFollowers.forEach((follower, index) => {
        console.log(`\n   ${index + 1}. ${follower.follower_name || 'Unnamed'}`);
        console.log(`      ID: ${follower.id}`);
        console.log(`      User: ${follower.users?.email || 'Unknown'} (${follower.user_id})`);
        console.log(`      Status: ${follower.account_status}`);
        console.log(`      Copy Mode: ${follower.copy_mode}`);
        console.log(`      Lot Size: ${follower.lot_size}`);
        console.log(`      Multiplier: ${follower.multiplier}`);
        console.log(`      Fixed Lot: ${follower.fixed_lot}`);
        console.log(`      Created: ${follower.created_at}`);
      });
    }

    // Check followers by user
    console.log('\n📊 FOLLOWERS BY USER:');
    console.log('=====================');
    
    for (const user of users || []) {
      const userFollowers = allFollowers?.filter(f => f.user_id === user.id) || [];
      console.log(`\n👤 ${user.email}:`);
      console.log(`   Found ${userFollowers.length} followers`);
      
      if (userFollowers.length > 0) {
        userFollowers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name} (${follower.account_status})`);
        });
      }
    }

    // Check for followers without user_id
    const orphanedFollowers = allFollowers?.filter(f => !f.user_id) || [];
    if (orphanedFollowers.length > 0) {
      console.log('\n⚠️ ORPHANED FOLLOWERS (no user_id):');
      orphanedFollowers.forEach((follower, index) => {
        console.log(`   ${index + 1}. ${follower.follower_name} (${follower.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }

  console.log('\n🎉 All followers check completed!');
}

checkAllFollowers().catch(console.error); 