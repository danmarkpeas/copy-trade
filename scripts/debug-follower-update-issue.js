const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugFollowerUpdateIssue() {
  console.log('🔍 DEBUGGING FOLLOWER UPDATE ISSUE');
  console.log('==================================\n');

  try {
    // Step 1: Check current follower data
    console.log('🔄 Step 1: Checking current follower data...');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError.message);
      return;
    }

    if (!followers || followers.length === 0) {
      console.log('❌ No followers found');
      return;
    }

    console.log(`✅ Found ${followers.length} followers:`);
    followers.forEach((follower, index) => {
      console.log(`  ${index + 1}. ${follower.follower_name}:`);
      console.log(`     Copy Mode: ${follower.copy_mode}`);
      console.log(`     Lot Size: ${follower.lot_size}`);
      console.log(`     Multiplier: ${follower.multiplier}`);
      console.log(`     Percentage: ${follower.percentage}`);
      console.log(`     Fixed Lot: ${follower.fixed_lot}`);
      console.log(`     User ID: ${follower.user_id || 'null'}`);
    });

    // Step 2: Test direct database update
    const testFollower = followers[0];
    console.log(`\n🔄 Step 2: Testing direct database update for ${testFollower.follower_name}...`);
    
    const testUpdate = {
      copy_mode: 'percentage',
      percentage: 25.0,
      lot_size: 3.0,
      multiplier: 1.5
    };

    console.log('📊 Test update data:', testUpdate);

    const { data: updateResult, error: updateError } = await supabase
      .from('followers')
      .update(testUpdate)
      .eq('follower_name', testFollower.follower_name)
      .eq('account_status', 'active')
      .select();

    if (updateError) {
      console.log('❌ Direct update error:', updateError.message);
      return;
    }

    if (updateResult && updateResult.length > 0) {
      console.log('✅ Direct update successful');
      console.log('📊 Updated data:', {
        copy_mode: updateResult[0].copy_mode,
        lot_size: updateResult[0].lot_size,
        multiplier: updateResult[0].multiplier,
        percentage: updateResult[0].percentage,
        fixed_lot: updateResult[0].fixed_lot
      });
    } else {
      console.log('❌ No rows were updated');
    }

    // Step 3: Test API endpoint
    console.log('\n🔄 Step 3: Testing API endpoint...');
    const apiUpdate = {
      copy_mode: 'multiplier',
      multiplier: 2.0,
      lot_size: 4.0,
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
    console.log('📊 API response:', result);

    if (response.ok && result.success) {
      console.log('✅ API update successful');
    } else {
      console.log('❌ API update failed:', result.error);
    }

    // Step 4: Verify final state
    console.log('\n🔄 Step 4: Verifying final state...');
    const { data: finalData, error: finalError } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_name', testFollower.follower_name)
      .eq('account_status', 'active')
      .single();

    if (finalError) {
      console.log('❌ Error fetching final data:', finalError.message);
    } else {
      console.log('✅ Final follower data:');
      console.log('📊 Current values:', {
        copy_mode: finalData.copy_mode,
        lot_size: finalData.lot_size,
        multiplier: finalData.multiplier,
        percentage: finalData.percentage,
        fixed_lot: finalData.fixed_lot
      });
    }

    // Step 5: Check table structure
    console.log('\n🔄 Step 5: Checking table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'followers' });

    if (tableError) {
      console.log('⚠️ Could not get table info:', tableError.message);
    } else {
      console.log('📊 Table structure:', tableInfo);
    }

  } catch (error) {
    console.log('❌ Debug error:', error.message);
  }
}

// Run the debug
debugFollowerUpdateIssue().then(() => {
  console.log('\n🎉 DEBUG COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Debug error:', error);
  process.exit(1);
}); 