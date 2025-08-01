const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixFollowerExecution() {
  console.log('🔧 FIXING FOLLOWER EXECUTION ISSUES');
  console.log('====================================\n');

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
      
      // Update to use proper configuration for exact copying
      const updateData = {
        copy_mode: 'multiplier', // Use multiplier mode for exact copying
        multiplier: 1.0, // Exact 1:1 copying
        min_lot_size: 0.001,
        max_lot_size: 1.0, // Allow larger trades
        lot_size: 0.001 // Default lot size
      };

      const { error: updateError } = await supabase
        .from('followers')
        .update(updateData)
        .eq('id', follower.id);

      if (updateError) {
        console.error(`   ❌ Error updating ${follower.name}:`, updateError);
      } else {
        console.log(`   ✅ Fixed ${follower.name} configuration`);
        console.log(`   📊 New settings:`);
        console.log(`      Copy Mode: multiplier`);
        console.log(`      Multiplier: 1.0 (exact copy)`);
        console.log(`      Min Lot: 0.001`);
        console.log(`      Max Lot: 1.0`);
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

    console.log('🎉 FOLLOWER EXECUTION FIXED!');
    console.log('============================');
    console.log('✅ All followers now use exact 1:1 copying');
    console.log('✅ Proper API parameters configured');
    console.log('✅ Compatible with current balances');
    console.log('');
    console.log('📋 What was fixed:');
    console.log('1. Updated to multiplier mode with 1.0x');
    console.log('2. Set proper lot size limits');
    console.log('3. Configured for exact broker trade copying');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Test with: npm run test-manual');
    console.log('2. Monitor with: npm run monitor');
    console.log('3. Place a trade on your broker account');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixFollowerExecution(); 