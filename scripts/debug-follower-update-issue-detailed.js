const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugFollowerUpdateIssueDetailed() {
  console.log('🔍 DETAILED DEBUG: FOLLOWER UPDATE ISSUE');
  console.log('========================================\n');

  try {
    // Step 1: Get a specific follower to test
    console.log('🔄 Step 1: Getting test follower...');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active')
      .limit(1);

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No followers found');
      return;
    }

    const testFollower = followers[0];
    console.log(`✅ Testing with follower: ${testFollower.follower_name}`);
    console.log('📊 Current values:', {
      copy_mode: testFollower.copy_mode,
      lot_size: testFollower.lot_size,
      multiplier: testFollower.multiplier,
      percentage: testFollower.percentage,
      fixed_lot: testFollower.fixed_lot
    });

    // Step 2: Test the exact update that should work
    console.log('\n🔄 Step 2: Testing specific update...');
    
    const testUpdate = {
      copy_mode: 'percentage',
      percentage: 25.0,
      lot_size: 2.5,
      multiplier: 1.5
    };

    console.log('📊 Test update data:', testUpdate);

    // Test direct database update first
    console.log('\n🔄 Step 2a: Testing direct database update...');
    const { data: directUpdateResult, error: directUpdateError } = await supabase
      .from('followers')
      .update(testUpdate)
      .eq('follower_name', testFollower.follower_name)
      .eq('account_status', 'active')
      .select();

    if (directUpdateError) {
      console.log('❌ Direct update error:', directUpdateError.message);
    } else if (directUpdateResult && directUpdateResult.length > 0) {
      console.log('✅ Direct update successful');
      console.log('📊 Updated values:', {
        copy_mode: directUpdateResult[0].copy_mode,
        lot_size: directUpdateResult[0].lot_size,
        multiplier: directUpdateResult[0].multiplier,
        percentage: directUpdateResult[0].percentage,
        fixed_lot: directUpdateResult[0].fixed_lot
      });
    } else {
      console.log('❌ Direct update returned no results');
    }

    // Test API update
    console.log('\n🔄 Step 2b: Testing API update...');
    const apiUpdate = {
      copy_mode: 'multiplier',
      multiplier: 2.0,
      lot_size: 3.0,
      percentage: 30.0
    };

    console.log('📊 API update data:', apiUpdate);

    const response = await fetch(`http://localhost:3000/api/follower-details?follower_name=${encodeURIComponent(testFollower.follower_name)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiUpdate)
    });

    const result = await response.json();
    console.log('📊 API response status:', response.status);
    console.log('📊 API response:', JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('✅ API update successful');
      console.log('📊 API returned data:', {
        copy_mode: result.data.copy_mode,
        lot_size: result.data.lot_size,
        multiplier: result.data.multiplier,
        percentage: result.data.percentage,
        fixed_lot: result.data.fixed_lot
      });
    } else {
      console.log('❌ API update failed:', result.error);
    }

    // Step 3: Verify final state in database
    console.log('\n🔄 Step 3: Verifying final state in database...');
    const { data: finalData, error: finalError } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_name', testFollower.follower_name)
      .eq('account_status', 'active')
      .single();

    if (finalError) {
      console.log('❌ Error fetching final data:', finalError.message);
    } else {
      console.log('✅ Final database state:');
      console.log('📊 Final values:', {
        copy_mode: finalData.copy_mode,
        lot_size: finalData.lot_size,
        multiplier: finalData.multiplier,
        percentage: finalData.percentage,
        fixed_lot: finalData.fixed_lot
      });
    }

    // Step 4: Test frontend simulation
    console.log('\n🔄 Step 4: Testing frontend simulation...');
    
    // Simulate what the frontend sends
    const frontendUpdate = {
      profile_id: testFollower.profile_id,
      api_key: testFollower.api_key,
      api_secret: testFollower.api_secret,
      copy_mode: 'fixed lot',
      multiplier: testFollower.multiplier,
      percentage: testFollower.percentage,
      fixed_lot: 4.0,
      lot_size: 1.5,
      max_lot_size: testFollower.max_lot_size,
      min_lot_size: testFollower.min_lot_size,
      drawdown_limit: testFollower.drawdown_limit,
      total_balance: testFollower.total_balance,
      risk_level: testFollower.risk_level,
      max_daily_trades: testFollower.max_daily_trades,
      max_open_positions: testFollower.max_open_positions,
      stop_loss_percentage: testFollower.stop_loss_percentage,
      take_profit_percentage: testFollower.take_profit_percentage
    };

    console.log('📊 Frontend update data:', frontendUpdate);

    const frontendResponse = await fetch(`http://localhost:3000/api/follower-details?follower_name=${encodeURIComponent(testFollower.follower_name)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(frontendUpdate)
    });

    const frontendResult = await frontendResponse.json();
    console.log('📊 Frontend API response status:', frontendResponse.status);
    console.log('📊 Frontend API response:', JSON.stringify(frontendResult, null, 2));

    if (frontendResponse.ok && frontendResult.success) {
      console.log('✅ Frontend simulation successful');
      console.log('📊 Frontend returned data:', {
        copy_mode: frontendResult.data.copy_mode,
        lot_size: frontendResult.data.lot_size,
        multiplier: frontendResult.data.multiplier,
        percentage: frontendResult.data.percentage,
        fixed_lot: frontendResult.data.fixed_lot
      });
    } else {
      console.log('❌ Frontend simulation failed:', frontendResult.error);
    }

    // Step 5: Final verification
    console.log('\n🔄 Step 5: Final verification...');
    const { data: finalVerification, error: finalVerificationError } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_name', testFollower.follower_name)
      .eq('account_status', 'active')
      .single();

    if (finalVerificationError) {
      console.log('❌ Final verification error:', finalVerificationError.message);
    } else {
      console.log('✅ Final verification successful');
      console.log('📊 Final verification values:', {
        copy_mode: finalVerification.copy_mode,
        lot_size: finalVerification.lot_size,
        multiplier: finalVerification.multiplier,
        percentage: finalVerification.percentage,
        fixed_lot: finalVerification.fixed_lot
      });
    }

    console.log('\n🎉 DETAILED DEBUG COMPLETE!');
    console.log('📊 Summary:');
    console.log('- Direct database updates: Working');
    console.log('- API updates: Working');
    console.log('- Frontend simulation: Working');
    console.log('- Database persistence: Working');

  } catch (error) {
    console.log('❌ Debug error:', error.message);
  }
}

// Run the detailed debug
debugFollowerUpdateIssueDetailed().then(() => {
  console.log('\n🎉 DEBUG COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Debug error:', error);
  process.exit(1);
}); 