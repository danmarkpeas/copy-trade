const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkCurrentUser() {
  console.log('🔍 CHECKING CURRENT USER AND COPY TRADES\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');

    console.log('👥 ALL USERS:');
    if (users && users.length > 0) {
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email || user.id} (${user.id})`);
      });
    }

    // Get all copy trades
    const { data: copyTrades, error: tradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('\n📊 ALL COPY TRADES:');
    if (copyTrades && copyTrades.length > 0) {
      copyTrades.forEach((trade, index) => {
        const timeAgo = Math.floor((Date.now() - new Date(trade.created_at).getTime()) / (1000 * 60));
        console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size} (${trade.status})`);
        console.log(`      Follower ID: ${trade.follower_id}`);
        console.log(`      Master Broker ID: ${trade.master_broker_id}`);
        console.log(`      Time: ${timeAgo} min ago`);
        console.log('');
      });
    } else {
      console.log('   ⏳ No copy trades found');
    }

    // Get all followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    console.log('👥 ACTIVE FOLLOWERS:');
    if (followers && followers.length > 0) {
      followers.forEach((follower, index) => {
        console.log(`   ${index + 1}. ${follower.follower_name}`);
        console.log(`      User ID: ${follower.user_id}`);
        console.log(`      Master Broker ID: ${follower.master_broker_account_id}`);
        console.log(`      Copy Mode: ${follower.copy_mode}`);
        console.log('');
      });
    }

    // Check which copy trades belong to which followers
    console.log('🔗 COPY TRADES BY FOLLOWER:');
    if (followers && followers.length > 0) {
      for (const follower of followers) {
        const followerTrades = copyTrades?.filter(t => t.follower_id === follower.user_id) || [];
        console.log(`\n📊 ${follower.follower_name} (${follower.user_id}):`);
        console.log(`   Copy trades: ${followerTrades.length}`);
        
        if (followerTrades.length > 0) {
          followerTrades.forEach((trade, index) => {
            const timeAgo = Math.floor((Date.now() - new Date(trade.created_at).getTime()) / (1000 * 60));
            console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size} (${trade.status}) - ${timeAgo} min ago`);
          });
        }
      }
    }

    console.log('\n🎯 DIAGNOSIS:');
    console.log('1. Check which user is currently logged in');
    console.log('2. Verify that copy trades are associated with the correct follower user_id');
    console.log('3. Ensure the UI is querying for the right user_id');

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. The UI should show copy trades for the currently logged-in user');
    console.log('2. If no user is logged in, show all copy trades');
    console.log('3. Update the UI query to handle both cases');

  } catch (error) {
    console.log('❌ Error checking current user:', error.message);
  }
}

checkCurrentUser().catch(console.error); 