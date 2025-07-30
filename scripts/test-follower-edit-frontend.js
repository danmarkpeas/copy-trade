const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFollowerEditFrontend() {
  console.log('🧪 TESTING FOLLOWER EDIT FRONTEND FUNCTIONALITY');
  console.log('===============================================\n');

  try {
    // Get all followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError.message);
      return;
    }

    console.log(`📋 Found ${followers?.length || 0} followers:`);
    if (followers && followers.length > 0) {
      followers.forEach((follower, index) => {
        console.log(`  ${index + 1}. ${follower.follower_name}`);
        console.log(`     User ID: ${follower.user_id || 'null'}`);
        console.log(`     Copy Mode: ${follower.copy_mode}`);
        console.log(`     Lot Size: ${follower.lot_size}`);
        console.log(`     Multiplier: ${follower.multiplier}`);
        console.log(`     Percentage: ${follower.percentage}`);
        console.log(`     Fixed Lot: ${follower.fixed_lot}`);
        console.log('');
      });

      // Test with both followers (one with user_id, one without)
      for (const testFollower of followers) {
        console.log(`🎯 Testing frontend simulation for: ${testFollower.follower_name}`);
        console.log(`   User ID: ${testFollower.user_id || 'null'}`);

        // Simulate the frontend loadFollowerDetails function
        console.log('\n🔄 Simulating loadFollowerDetails...');
        const { data: directData, error: directError } = await supabase
          .from('followers')
          .select(`
            *,
            broker_accounts!followers_master_broker_account_id_fkey (
              broker_name,
              account_name
            )
          `)
          .eq('follower_name', testFollower.follower_name)
          .eq('account_status', 'active')
          .single();

        if (directError) {
          console.log('❌ Direct query error:', directError.message);
        } else {
          console.log('✅ Direct query successful');
          console.log('📊 Loaded Data:', {
            follower_name: directData.follower_name,
            copy_mode: directData.copy_mode,
            lot_size: directData.lot_size,
            multiplier: directData.multiplier,
            percentage: directData.percentage,
            fixed_lot: directData.fixed_lot,
            user_id: directData.user_id,
            broker_name: directData.broker_accounts?.broker_name
          });

          // Simulate form field population
          console.log('\n🔄 Simulating form field population...');
          const formFields = {
            profileId: directData.profile_id || "",
            apiKey: directData.api_key || "",
            apiSecret: directData.api_secret || "",
            copyMode: directData.copy_mode || "fixed lot",
            multiplier: directData.multiplier || 1.0,
            percentage: directData.percentage || 10.0,
            fixedLot: directData.fixed_lot || 1.0,
            lotSize: directData.lot_size || 1.0,
            maxLotSize: directData.max_lot_size || 10.0,
            minLotSize: directData.min_lot_size || 0.01,
            drawdownLimit: directData.drawdown_limit || 20.0,
            totalBalance: directData.total_balance || 10000.0,
            riskLevel: directData.risk_level || "medium",
            maxDailyTrades: directData.max_daily_trades || 50,
            maxOpenPositions: directData.max_open_positions || 10,
            stopLossPercentage: directData.stop_loss_percentage || 5.0,
            takeProfitPercentage: directData.take_profit_percentage || 10.0
          };

          console.log('✅ Form fields populated:', {
            copyMode: formFields.copyMode,
            lotSize: formFields.lotSize,
            multiplier: formFields.multiplier,
            percentage: formFields.percentage,
            fixedLot: formFields.fixedLot
          });

          // Simulate update
          console.log('\n🔄 Simulating update...');
          const testUpdate = {
            copy_mode: 'multiplier',
            multiplier: 1.5,
            lot_size: 2.0,
            max_lot_size: 8.0,
            min_lot_size: 0.05
          };

          const updateQuery = supabase
            .from('followers')
            .update(testUpdate)
            .eq('follower_name', testFollower.follower_name)
            .eq('account_status', 'active');

          // Only add user_id filter if the follower has a user_id
          if (directData.user_id) {
            updateQuery.eq('user_id', directData.user_id);
          }

          const { data: updateResult, error: updateError } = await updateQuery.select();

          if (updateError) {
            console.log('❌ Update error:', updateError.message);
          } else {
            console.log('✅ Update successful');
            console.log('📊 Updated Data:', {
              copy_mode: updateResult[0].copy_mode,
              lot_size: updateResult[0].lot_size,
              multiplier: updateResult[0].multiplier,
              percentage: updateResult[0].percentage,
              fixed_lot: updateResult[0].fixed_lot
            });
          }
        }

        console.log('\n' + '='.repeat(50) + '\n');
      }
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testFollowerEditFrontend().then(() => {
  console.log('\n🎉 FRONTEND TEST COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Test error:', error);
  process.exit(1);
}); 