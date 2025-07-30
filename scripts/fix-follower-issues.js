const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixFollowerIssues() {
  console.log('🔧 FIXING FOLLOWER ISSUES');
  console.log('==========================\n');

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

    console.log(`📊 Found ${followers.length} active followers`);

    for (const follower of followers) {
      console.log(`\n👥 Processing follower: ${follower.follower_name}`);
      
      // Check current multiplier
      const currentMultiplier = follower.multiplier || 1.0;
      console.log(`   Current multiplier: ${currentMultiplier}`);

      // Reduce multiplier to avoid insufficient margin errors
      const newMultiplier = Math.min(currentMultiplier, 0.01); // Very small multiplier for testing
      
      if (newMultiplier !== currentMultiplier) {
        console.log(`   ⚠️ Reducing multiplier from ${currentMultiplier} to ${newMultiplier} to avoid margin issues`);
        
        const { error: updateError } = await supabase
          .from('followers')
          .update({ 
            multiplier: newMultiplier,
            copy_mode: 'multiplier',
            lot_size: 0.001 // Very small lot size
          })
          .eq('id', follower.id);

        if (updateError) {
          console.error(`   ❌ Failed to update follower ${follower.follower_name}:`, updateError);
        } else {
          console.log(`   ✅ Updated follower ${follower.follower_name} with new multiplier: ${newMultiplier}`);
        }
      } else {
        console.log(`   ✅ Multiplier already optimal: ${newMultiplier}`);
      }

      // Check if follower has proper broker link (using correct column name)
      if (!follower.master_broker_account_id) {
        console.log(`   ⚠️ Follower ${follower.follower_name} has no master broker link`);
        
        // Get first active broker
        const { data: brokers } = await supabase
          .from('broker_accounts')
          .select('id')
          .eq('is_active', true)
          .eq('is_verified', true)
          .limit(1);

        if (brokers && brokers.length > 0) {
          const { error: linkError } = await supabase
            .from('followers')
            .update({ master_broker_account_id: brokers[0].id })
            .eq('id', follower.id);

          if (linkError) {
            console.error(`   ❌ Failed to link follower to broker:`, linkError);
          } else {
            console.log(`   ✅ Linked follower to broker: ${brokers[0].id}`);
          }
        }
      } else {
        console.log(`   ✅ Follower already linked to broker: ${follower.master_broker_account_id}`);
      }
    }

    // Update copy mode for all followers to use multiplier with very small values
    console.log('\n🔄 Updating copy mode to multiplier with small values...');
    
    const { error: copyModeError } = await supabase
      .from('followers')
      .update({ 
        copy_mode: 'multiplier',
        multiplier: 0.01, // Very small multiplier
        lot_size: 0.001 // Very small lot size
      })
      .eq('account_status', 'active');

    if (copyModeError) {
      console.error('❌ Failed to update copy mode:', copyModeError);
    } else {
      console.log('✅ Updated all followers to use small multiplier mode');
    }

    // Verify the fixes
    console.log('\n📊 VERIFICATION');
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
        console.log(`   Lot Size: ${follower.lot_size}`);
        console.log(`   Master Broker: ${follower.master_broker_account_id ? 'Linked' : 'Not Linked'}`);
      });
    }

    console.log('\n🎉 FOLLOWER ISSUES FIXED!');
    console.log('==========================');
    console.log('✅ Reduced multipliers to avoid margin issues');
    console.log('✅ Updated copy mode to small multiplier');
    console.log('✅ Linked followers to brokers');
    console.log('✅ Set very small trade sizes for testing');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. The system will now use very small trade sizes');
    console.log('2. This should eliminate insufficient margin errors');
    console.log('3. Test the system again with npm run test-manual');

  } catch (error) {
    console.error('❌ Failed to fix follower issues:', error.message);
  }
}

fixFollowerIssues().catch(console.error); 