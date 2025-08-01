const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function completeSystemFix() {
  console.log('🔧 COMPLETE SYSTEM FIX');
  console.log('=' .repeat(60));

  try {
    // 1. Check current system status
    console.log('1. Checking current system status...');
    
    // Check broker accounts
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true);

    if (brokerError) {
      console.log('❌ Error checking broker accounts:', brokerError);
      return;
    }

    console.log(`✅ Found ${brokerAccounts.length} active broker accounts`);

    // Check followers
    const { data: allFollowers, error: followersError } = await supabase
      .from('followers')
      .select('*');

    if (followersError) {
      console.log('❌ Error checking followers:', followersError);
      return;
    }

    console.log(`✅ Found ${allFollowers.length} total followers`);

    // 2. Fix follower issues
    console.log('\n2. Fixing follower issues...');
    
    // Check for duplicate user IDs
    const userIdCounts = {};
    allFollowers.forEach(follower => {
      if (follower.user_id) {
        userIdCounts[follower.user_id] = (userIdCounts[follower.user_id] || 0) + 1;
      }
    });

    const duplicates = Object.entries(userIdCounts).filter(([id, count]) => count > 1);
    console.log(`   Found ${duplicates.length} duplicate user IDs`);

    if (duplicates.length > 0) {
      console.log('   Fixing duplicate user IDs...');
      
      // Create unique user IDs for each follower
      for (const follower of allFollowers) {
        const uniqueUserId = uuidv4();
        console.log(`   - ${follower.follower_name}: ${follower.user_id || 'null'} → ${uniqueUserId}`);

        // Update follower with unique user ID
        const { error } = await supabase
          .from('followers')
          .update({ user_id: uniqueUserId })
          .eq('id', follower.id);

        if (error) {
          console.log(`❌ Error updating follower ${follower.follower_name}:`, error);
        } else {
          console.log(`✅ Updated ${follower.follower_name} with unique user ID`);
        }
      }
    }

    // 3. Clean up duplicate followers
    console.log('\n3. Cleaning up duplicate followers...');
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

    // 4. Verify the fix
    console.log('\n4. Verifying the fix...');
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
    } else {
      console.log('❌ FAILED: Some followers still have duplicate user IDs');
    }

    // 5. Check copy trade history
    console.log('\n5. Checking copy trade history...');
    const { data: copyTrades, error: copyTradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (copyTradesError) {
      console.log('❌ Error checking copy trades:', copyTradesError);
    } else {
      console.log(`✅ Found ${copyTrades.length} recent copy trades`);
      
      if (copyTrades.length > 0) {
        const successfulTrades = copyTrades.filter(t => t.result && t.result.success).length;
        const failedTrades = copyTrades.filter(t => !t.result || !t.result.success).length;
        
        console.log(`   Successful: ${successfulTrades}`);
        console.log(`   Failed: ${failedTrades}`);
        
        if (failedTrades > 0) {
          console.log('   Recent failed trades:');
          copyTrades.filter(t => !t.result || !t.result.success).slice(0, 3).forEach(trade => {
            console.log(`     - ${trade.master_trade?.symbol} ${trade.master_trade?.side}: ${trade.result?.error || 'Unknown error'}`);
          });
        }
      }
    }

    // 6. System summary
    console.log('\n6. SYSTEM SUMMARY');
    console.log('=' .repeat(30));
    console.log(`✅ Active Broker Accounts: ${brokerAccounts.length}`);
    console.log(`✅ Active Followers: ${finalFollowers.length}`);
    console.log(`✅ Unique User IDs: ${finalUserIds.size}`);
    console.log(`✅ Recent Copy Trades: ${copyTrades?.length || 0}`);

    if (finalUserIds.size === finalFollowers.length && finalFollowers.length > 0) {
      console.log('\n🎉 SYSTEM STATUS: READY FOR COPY TRADING');
      console.log('');
      console.log('🔄 NEXT STEPS:');
      console.log('   1. Start the backend server: node server.js');
      console.log('   2. Start the frontend: npm run dev');
      console.log('   3. Test copy trading functionality');
      console.log('   4. Monitor real-time trade execution');
    } else {
      console.log('\n⚠️  SYSTEM STATUS: ISSUES DETECTED');
      console.log('   Please review the errors above and fix them');
    }

  } catch (error) {
    console.error('❌ Error in complete system fix:', error);
  }
}

// Run the complete system fix
completeSystemFix().catch(console.error); 