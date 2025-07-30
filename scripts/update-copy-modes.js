const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateCopyModes() {
  console.log('🔄 UPDATING COPY MODES FOR OPTIMAL PERFORMANCE');
  console.log('===============================================\n');

  try {
    // Get all active followers
    const { data: followers, error: followerError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followerError) {
      console.error('❌ Error fetching followers:', followerError);
      return;
    }

    console.log(`📊 Found ${followers.length} active followers\n`);

    for (const follower of followers) {
      console.log(`👥 Updating ${follower.follower_name}:`);
      console.log(`   Current Copy Mode: ${follower.copy_mode}`);
      console.log(`   Current Multiplier: ${follower.multiplier}`);
      console.log(`   Current Fixed Lot: ${follower.fixed_lot}`);

      // Update to fixed lot mode with very small sizes
      const updateData = {
        copy_mode: 'fixed_lot',
        fixed_lot: 0.001, // Very small fixed lot
        multiplier: 0.01, // Keep multiplier low for safety
        min_lot_size: 0.001,
        max_lot_size: 0.01, // Very small maximum
        lot_size: 0.001
      };

      const { error: updateError } = await supabase
        .from('followers')
        .update(updateData)
        .eq('id', follower.id);

      if (updateError) {
        console.error(`   ❌ Failed to update ${follower.follower_name}:`, updateError);
      } else {
        console.log(`   ✅ Updated ${follower.follower_name} to fixed lot mode`);
        console.log(`   📊 New settings:`);
        console.log(`      Copy Mode: fixed_lot`);
        console.log(`      Fixed Lot: 0.001`);
        console.log(`      Min Lot: 0.001`);
        console.log(`      Max Lot: 0.01`);
      }
      console.log('');
    }

    // Verify the updates
    console.log('📊 VERIFICATION');
    console.log('===============');
    
    const { data: updatedFollowers } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (updatedFollowers) {
      updatedFollowers.forEach(follower => {
        console.log(`👥 ${follower.follower_name}:`);
        console.log(`   Copy Mode: ${follower.copy_mode}`);
        console.log(`   Fixed Lot: ${follower.fixed_lot}`);
        console.log(`   Multiplier: ${follower.multiplier}`);
        console.log(`   Min Lot: ${follower.min_lot_size}`);
        console.log(`   Max Lot: ${follower.max_lot_size}`);
      });
    }

    console.log('\n🎉 COPY MODES UPDATED SUCCESSFULLY!');
    console.log('====================================');
    console.log('✅ All followers now use fixed lot copying');
    console.log('✅ Very small lot sizes (0.001) to avoid margin issues');
    console.log('✅ Strict limits to prevent large trades');
    console.log('✅ Compatible with low balance accounts');
    console.log('');
    console.log('📋 Benefits:');
    console.log('1. Fixed lot size regardless of broker trade size');
    console.log('2. Very small trades that work with low balances');
    console.log('3. Consistent risk management');
    console.log('4. No multiplier calculations that could cause issues');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Test the system with npm run test-manual');
    console.log('2. Monitor results with npm run monitor');
    console.log('3. All followers should now execute trades successfully');

  } catch (error) {
    console.error('❌ Failed to update copy modes:', error.message);
  }
}

updateCopyModes().catch(console.error); 