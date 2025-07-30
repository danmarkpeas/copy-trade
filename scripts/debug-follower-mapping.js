const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugFollowerMapping() {
  console.log('🔍 DEBUGGING FOLLOWER MAPPING\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Check copy_trades follower IDs
    console.log('📋 COPY_TRADES FOLLOWER IDS:');
    const { data: copyTrades, error: copyTradesError } = await supabase
      .from('copy_trades')
      .select('follower_id')
      .limit(10);

    if (copyTradesError) {
      console.log(`❌ Error fetching copy trades: ${copyTradesError.message}`);
      return;
    }

    if (copyTrades) {
      const uniqueFollowerIds = [...new Set(copyTrades.map(trade => trade.follower_id).filter(Boolean))];
      console.log(`✅ Found ${uniqueFollowerIds.length} unique follower IDs in copy_trades:`);
      uniqueFollowerIds.forEach(id => {
        console.log(`   - ${id}`);
      });
    }

    // 2. Check followers table
    console.log('\n👥 FOLLOWERS TABLE:');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('id, user_id, follower_name');

    if (followersError) {
      console.log(`❌ Error fetching followers: ${followersError.message}`);
      return;
    }

    if (followers) {
      console.log(`✅ Found ${followers.length} followers:`);
      followers.forEach(follower => {
        console.log(`   - ID: ${follower.id}`);
        console.log(`     User ID: ${follower.user_id}`);
        console.log(`     Name: ${follower.follower_name}`);
        console.log('');
      });
    }

    // 3. Check if there's a mismatch
    console.log('\n🔍 ID MAPPING ANALYSIS:');
    if (copyTrades && followers) {
      const copyTradeFollowerIds = [...new Set(copyTrades.map(trade => trade.follower_id).filter(Boolean))];
      const followerIds = followers.map(f => f.id);
      const followerUserIds = followers.map(f => f.user_id);

      console.log('Copy trades use follower_id field');
      console.log('Followers table has id and user_id fields');
      
      copyTradeFollowerIds.forEach(copyTradeId => {
        const foundInFollowers = followerIds.includes(copyTradeId);
        const foundInUserIds = followerUserIds.includes(copyTradeId);
        
        console.log(`   Copy Trade Follower ID: ${copyTradeId}`);
        console.log(`     Found in followers.id: ${foundInFollowers ? '✅' : '❌'}`);
        console.log(`     Found in followers.user_id: ${foundInUserIds ? '✅' : '❌'}`);
        
        if (foundInUserIds) {
          const follower = followers.find(f => f.user_id === copyTradeId);
          console.log(`     Corresponding follower: ${follower?.follower_name} (ID: ${follower?.id})`);
        }
        console.log('');
      });
    }

    // 4. Solution
    console.log('\n💡 SOLUTION:');
    console.log('The copy_trades table uses follower_id which matches followers.user_id, not followers.id');
    console.log('We need to update the frontend query to use user_id instead of id for followers');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugFollowerMapping().catch(console.error); 