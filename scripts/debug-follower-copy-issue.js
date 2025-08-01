const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugFollowerCopyIssue() {
  console.log('🔍 DEBUGGING FOLLOWER COPY ISSUE');
  console.log('=' .repeat(60));
  
  try {
    // 1. Check broker accounts
    console.log('1. Checking Broker Accounts...');
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true);
    
    if (brokerError) {
      console.log('❌ Error fetching broker accounts:', brokerError);
      return;
    }
    
    console.log(`✅ Found ${brokerAccounts.length} active broker accounts:`);
    brokerAccounts.forEach(broker => {
      console.log(`   - ${broker.account_name} (${broker.id})`);
    });
    
    // 2. Check followers
    console.log('\n2. Checking Followers...');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');
    
    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }
    
    console.log(`✅ Found ${followers.length} active followers:`);
    followers.forEach(follower => {
      console.log(`   - ${follower.follower_name} (User ID: ${follower.user_id})`);
      console.log(`     Master Broker: ${follower.master_broker_account_id}`);
      console.log(`     Copy Mode: ${follower.copy_mode}`);
      console.log(`     Copy Ratio: ${follower.copy_ratio}`);
    });
    
    // 3. Check copy relationships
    console.log('\n3. Checking Copy Relationships...');
    const { data: copyRelationships, error: relationshipsError } = await supabase
      .from('copy_relationships')
      .select('*');
    
    if (relationshipsError) {
      console.log('❌ Error fetching copy relationships:', relationshipsError);
    } else {
      console.log(`✅ Found ${copyRelationships.length} copy relationships:`);
      copyRelationships.forEach(rel => {
        console.log(`   - Follower ${rel.follower_id} -> Master ${rel.master_broker_id}`);
      });
    }
    
    // 4. Check recent copy trades
    console.log('\n4. Checking Recent Copy Trades...');
    const { data: copyTrades, error: tradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .order('entry_time', { ascending: false })
      .limit(5);
    
    if (tradesError) {
      console.log('❌ Error fetching copy trades:', tradesError);
    } else {
      console.log(`✅ Found ${copyTrades.length} recent copy trades:`);
      copyTrades.forEach(trade => {
        console.log(`   - ${trade.original_symbol} ${trade.original_side} ${trade.original_size}`);
        console.log(`     Status: ${trade.status}, Follower: ${trade.follower_id}`);
      });
    }
    
    // 5. Identify the issue
    console.log('\n' + '=' .repeat(60));
    console.log('🔍 ISSUE ANALYSIS');
    console.log('=' .repeat(60));
    
    if (followers.length === 0) {
      console.log('❌ ISSUE: No active followers found in database');
      console.log('   Solution: Create followers in the database');
    } else {
      const nullUserFollowers = followers.filter(f => !f.user_id);
      if (nullUserFollowers.length > 0) {
        console.log('❌ ISSUE: Found followers with null user_id:');
        nullUserFollowers.forEach(f => {
          console.log(`   - ${f.follower_name} (ID: ${f.id})`);
        });
        console.log('   Solution: Update followers with proper user_id');
      }
      
      const missingRelationships = followers.filter(f => {
        return !copyRelationships.some(r => r.follower_id === f.user_id);
      });
      
      if (missingRelationships.length > 0) {
        console.log('❌ ISSUE: Found followers without copy relationships:');
        missingRelationships.forEach(f => {
          console.log(`   - ${f.follower_name} (User ID: ${f.user_id})`);
        });
        console.log('   Solution: Create copy relationships for these followers');
      }
    }
    
    // 6. Provide fix recommendations
    console.log('\n' + '=' .repeat(60));
    console.log('🛠️  FIX RECOMMENDATIONS');
    console.log('=' .repeat(60));
    
    if (followers.length > 0) {
      console.log('1. Update followers with proper user_id:');
      followers.forEach(follower => {
        if (!follower.user_id) {
          console.log(`   UPDATE followers SET user_id = '${follower.id}' WHERE id = '${follower.id}';`);
        }
      });
      
      console.log('\n2. Create copy relationships:');
      followers.forEach(follower => {
        const userId = follower.user_id || follower.id;
        console.log(`   INSERT INTO copy_relationships (follower_id, master_broker_id) VALUES ('${userId}', '${follower.master_broker_account_id}');`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error in debug script:', error);
  }
}

// Run the debug script
debugFollowerCopyIssue().catch(console.error); 