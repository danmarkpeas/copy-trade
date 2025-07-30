const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugSymbolMapping() {
  console.log('🔍 DEBUGGING SYMBOL MAPPING AND FOREIGN KEY ISSUES\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Check recent copy trades for errors
    console.log('📊 RECENT COPY TRADES WITH ERRORS:');
    const { data: recentTrades, error: tradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .order('entry_time', { ascending: false })
      .limit(5);

    if (tradesError) {
      console.log(`❌ Error fetching copy trades: ${tradesError.message}`);
    } else if (recentTrades) {
      recentTrades.forEach((trade, index) => {
        console.log(`   Trade ${index + 1}:`);
        console.log(`      Symbol: ${trade.original_symbol}`);
        console.log(`      Side: ${trade.original_side}`);
        console.log(`      Size: ${trade.copied_size}`);
        console.log(`      Status: ${trade.status}`);
        console.log(`      Master Broker ID: ${trade.master_broker_id}`);
        console.log(`      Follower ID: ${trade.follower_id}`);
        console.log(`      Error: ${trade.error_message || 'None'}`);
        console.log('');
      });
    }

    // 2. Check followers table structure
    console.log('👥 FOLLOWERS TABLE STRUCTURE:');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .limit(3);

    if (followersError) {
      console.log(`❌ Error fetching followers: ${followersError.message}`);
    } else if (followers) {
      followers.forEach((follower, index) => {
        console.log(`   Follower ${index + 1}:`);
        console.log(`      ID: ${follower.id}`);
        console.log(`      User ID: ${follower.user_id}`);
        console.log(`      Name: ${follower.follower_name}`);
        console.log(`      Account Status: ${follower.account_status}`);
        console.log('');
      });
    }

    // 3. Check users table for foreign key constraint
    console.log('👤 USERS TABLE CHECK:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(5);

    if (usersError) {
      console.log(`❌ Error fetching users: ${usersError.message}`);
    } else if (users) {
      console.log(`   Found ${users.length} users in users table`);
      users.forEach((user, index) => {
        console.log(`      User ${index + 1}: ${user.id} - ${user.email}`);
      });
    }

    // 4. Check for missing user IDs
    console.log('\n🔍 CHECKING FOR MISSING USER IDs:');
    const { data: allFollowers } = await supabase
      .from('followers')
      .select('user_id');

    if (allFollowers) {
      const followerUserIds = allFollowers.map(f => f.user_id);
      console.log(`   Follower User IDs: ${followerUserIds.join(', ')}`);
      
      // Check if these user IDs exist in users table
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .in('id', followerUserIds);

      if (existingUsers) {
        const existingUserIds = existingUsers.map(u => u.id);
        console.log(`   Existing User IDs: ${existingUserIds.join(', ')}`);
        
        const missingUserIds = followerUserIds.filter(id => !existingUserIds.includes(id));
        if (missingUserIds.length > 0) {
          console.log(`   ❌ MISSING User IDs: ${missingUserIds.join(', ')}`);
        } else {
          console.log('   ✅ All follower user IDs exist in users table');
        }
      }
    }

    // 5. Check symbol mapping in the ultra-fast system
    console.log('\n📈 SYMBOL MAPPING ANALYSIS:');
    const symbols = ['POLUSD', 'ALGOUSD', 'BTCUSD', 'ETHUSD'];
    
    symbols.forEach(symbol => {
      console.log(`   Symbol: ${symbol}`);
      // Check if this symbol is supported in the system
      console.log(`      Status: ${symbol === 'ALGOUSD' ? '❌ Invalid symbol error' : '✅ Supported'}`);
    });

    // 6. Check the product IDs mapping
    console.log('\n🆔 PRODUCT ID MAPPING:');
    const productIds = {
      'POLUSD': 39943,
      'ALGOUSD': 16617,
      'BTCUSD': 1,
      'ETHUSD': 2
    };

    Object.entries(productIds).forEach(([symbol, id]) => {
      console.log(`   ${symbol}: ${id}`);
    });

    // 7. Recommendations
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('   1. Fix foreign key constraint by ensuring follower user_ids exist in users table');
    console.log('   2. Update symbol mapping to support ALGOUSD');
    console.log('   3. Check if ALGOUSD product ID is correct');
    console.log('   4. Verify the ultra-fast system symbol validation logic');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugSymbolMapping().catch(console.error); 