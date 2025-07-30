const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixFollowerBalances() {
  console.log('💰 FIXING FOLLOWER BALANCES');
  console.log('============================\n');

  try {
    // Get all active followers
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (error) {
      console.error('❌ Error loading followers:', error);
      return;
    }

    console.log(`📊 Found ${followers?.length || 0} active followers`);

    for (const follower of followers || []) {
      console.log(`\n👥 Processing: ${follower.follower_name}`);
      
      let updateData = {};
      
      // Set very small lot sizes based on current balance
      if (follower.copy_mode === 'multiplier') {
        // For multiplier mode, set a very small multiplier
        updateData = {
          multiplier: 0.001, // 0.1% of broker size
          lot_size: 0.001,
          min_lot_size: 0.001,
          max_lot_size: 0.01
        };
        console.log(`   📊 Setting multiplier to 0.001 (0.1% of broker size)`);
      } else if (follower.copy_mode === 'fixed_lot') {
        // For fixed lot mode, set very small lot size
        updateData = {
          fixed_lot: 0.001,
          lot_size: 0.001,
          min_lot_size: 0.001,
          max_lot_size: 0.01
        };
        console.log(`   📊 Setting fixed lot to 0.001`);
      }

      // Update the follower
      const { error: updateError } = await supabase
        .from('followers')
        .update(updateData)
        .eq('id', follower.id);

      if (updateError) {
        console.error(`   ❌ Error updating ${follower.follower_name}:`, updateError);
      } else {
        console.log(`   ✅ Successfully updated ${follower.follower_name}`);
      }
    }

    // Verify the changes
    console.log('\n📊 VERIFYING CHANGES');
    console.log('=====================\n');

    const { data: updatedFollowers, error: verifyError } = await supabase
      .from('followers')
      .select('follower_name, copy_mode, multiplier, fixed_lot, lot_size, min_lot_size, max_lot_size')
      .eq('account_status', 'active');

    if (verifyError) {
      console.error('❌ Error verifying changes:', verifyError);
      return;
    }

    updatedFollowers?.forEach((follower, index) => {
      console.log(`👥 ${index + 1}. ${follower.follower_name}:`);
      console.log(`   Copy Mode: ${follower.copy_mode}`);
      if (follower.copy_mode === 'multiplier') {
        console.log(`   Multiplier: ${follower.multiplier} (${follower.multiplier * 100}% of broker size)`);
      } else {
        console.log(`   Fixed Lot: ${follower.fixed_lot}`);
      }
      console.log(`   Lot Size: ${follower.lot_size}`);
      console.log(`   Min/Max: ${follower.min_lot_size} / ${follower.max_lot_size}`);
    });

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }

  console.log('\n🎉 Follower balance fix completed!');
  console.log('💡 Followers now have very small lot sizes that should work with low balances.');
}

fixFollowerBalances().catch(console.error); 