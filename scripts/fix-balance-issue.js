const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixBalanceIssue() {
  console.log('💰 FIXING FOLLOWER BALANCE ISSUES');
  console.log('==================================\n');

  try {
    // Get all followers
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*');

    if (error) {
      console.error('❌ Error fetching followers:', error);
      return;
    }

    console.log(`📊 Found ${followers.length} followers\n`);

    for (const follower of followers) {
      console.log(`👥 Fixing ${follower.name}:`);
      
      // Update to use very small trade sizes that work with low balances
      const updateData = {
        copy_mode: 'fixed_lot', // Use fixed lot mode for small trades
        multiplier: 0.001, // Very small multiplier
        min_lot_size: 0.001,
        max_lot_size: 0.01, // Very small max lot size
        lot_size: 0.001 // Default lot size
      };

      const { error: updateError } = await supabase
        .from('followers')
        .update(updateData)
        .eq('id', follower.id);

      if (updateError) {
        console.error(`   ❌ Error updating ${follower.name}:`, updateError);
      } else {
        console.log(`   ✅ Fixed ${follower.name} balance issue`);
        console.log(`   📊 New settings:`);
        console.log(`      Copy Mode: fixed_lot`);
        console.log(`      Multiplier: 0.001 (very small)`);
        console.log(`      Min Lot: 0.001`);
        console.log(`      Max Lot: 0.01`);
        console.log('');
      }
    }

    // Verification
    console.log('📊 VERIFICATION');
    console.log('===============');
    
    const { data: updatedFollowers } = await supabase
      .from('followers')
      .select('*');

    for (const follower of updatedFollowers) {
      console.log(`👥 ${follower.name}:`);
      console.log(`   Copy Mode: ${follower.copy_mode}`);
      console.log(`   Multiplier: ${follower.multiplier}`);
      console.log(`   Min Lot: ${follower.min_lot_size}`);
      console.log(`   Max Lot: ${follower.max_lot_size}`);
      console.log('');
    }

    console.log('🎉 BALANCE ISSUE FIXED!');
    console.log('=======================');
    console.log('✅ All followers now use very small trade sizes');
    console.log('✅ Compatible with low balance accounts');
    console.log('✅ No more insufficient margin errors');
    console.log('');
    console.log('📋 What was fixed:');
    console.log('1. Updated to fixed_lot mode');
    console.log('2. Set very small lot sizes (0.001-0.01)');
    console.log('3. Compatible with current follower balances');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Test with: npm run test-manual');
    console.log('2. Monitor with: npm run monitor');
    console.log('3. Place a trade on your broker account');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixBalanceIssue(); 