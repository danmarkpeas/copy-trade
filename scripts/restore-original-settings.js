const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function restoreOriginalSettings() {
  console.log('🔄 RESTORING ORIGINAL FOLLOWER SETTINGS');
  console.log('========================================\n');

  try {
    // Restore original settings for each follower
    const followerSettings = [
      {
        name: 'Anneshan',
        copy_mode: 'multiplier',
        multiplier: 0.5,
        fixed_lot: 0.1,
        min_lot_size: 0.001,
        max_lot_size: 1.0,
        lot_size: 0.1
      },
      {
        name: 'Gau',
        copy_mode: 'multiplier',
        multiplier: 0.25,
        fixed_lot: 0.05,
        min_lot_size: 0.001,
        max_lot_size: 0.5,
        lot_size: 0.05
      },
      {
        name: 'Test User 2 Follower',
        copy_mode: 'fixed_lot',
        multiplier: 0.1,
        fixed_lot: 0.01,
        min_lot_size: 0.001,
        max_lot_size: 0.1,
        lot_size: 0.01
      }
    ];

    for (const setting of followerSettings) {
      console.log(`👥 Restoring ${setting.name}:`);
      console.log(`   Copy Mode: ${setting.copy_mode}`);
      console.log(`   Multiplier: ${setting.multiplier}`);
      console.log(`   Fixed Lot: ${setting.fixed_lot}`);
      console.log(`   Min Lot: ${setting.min_lot_size}`);
      console.log(`   Max Lot: ${setting.max_lot_size}`);

      const { error: updateError } = await supabase
        .from('followers')
        .update({
          copy_mode: setting.copy_mode,
          multiplier: setting.multiplier,
          fixed_lot: setting.fixed_lot,
          min_lot_size: setting.min_lot_size,
          max_lot_size: setting.max_lot_size,
          lot_size: setting.lot_size
        })
        .eq('follower_name', setting.name);

      if (updateError) {
        console.error(`   ❌ Failed to update ${setting.name}:`, updateError);
      } else {
        console.log(`   ✅ Restored ${setting.name} settings`);
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
        console.log(`   Multiplier: ${follower.multiplier}`);
        console.log(`   Fixed Lot: ${follower.fixed_lot}`);
        console.log(`   Min Lot: ${follower.min_lot_size}`);
        console.log(`   Max Lot: ${follower.max_lot_size}`);
        console.log(`   Lot Size: ${follower.lot_size}`);
      });
    }

    console.log('\n🎉 ORIGINAL SETTINGS RESTORED!');
    console.log('==============================');
    console.log('✅ Each follower now has their individual configuration');
    console.log('✅ Multiplier-based copying for Anneshan and Gau');
    console.log('✅ Fixed lot copying for Test User 2 Follower');
    console.log('✅ Proper risk management with min/max limits');
    console.log('');
    console.log('📋 Configuration Summary:');
    console.log('1. Anneshan: 0.5x multiplier (50% of broker size)');
    console.log('2. Gau: 0.25x multiplier (25% of broker size)');
    console.log('3. Test User 2 Follower: Fixed 0.01 lot size');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Test the system with npm run test-manual');
    console.log('2. Monitor results with npm run monitor');
    console.log('3. Each follower will execute according to their settings');

  } catch (error) {
    console.error('❌ Failed to restore settings:', error.message);
  }
}

restoreOriginalSettings().catch(console.error); 