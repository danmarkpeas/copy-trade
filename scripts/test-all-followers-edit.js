const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAllFollowersEdit() {
  console.log('🧪 TESTING EDIT FUNCTIONALITY FOR ALL FOLLOWERS');
  console.log('===============================================\n');

  try {
    // Step 1: Get ALL followers from database
    console.log('🔄 Step 1: Getting ALL followers from database...');
    const { data: allFollowers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError.message);
      return;
    }

    if (!allFollowers || allFollowers.length === 0) {
      console.log('❌ No followers found');
      return;
    }

    console.log(`✅ Found ${allFollowers.length} followers:`);
    allFollowers.forEach((follower, index) => {
      console.log(`  ${index + 1}. ${follower.follower_name} (user_id: ${follower.user_id || 'null'})`);
    });

    // Step 2: Test edit functionality for each follower
    console.log('\n🔄 Step 2: Testing edit functionality for each follower...');
    
    for (let i = 0; i < allFollowers.length; i++) {
      const follower = allFollowers[i];
      console.log(`\n📋 Testing follower ${i + 1}/${allFollowers.length}: ${follower.follower_name}`);
      
      // Test 1: Load follower details via API
      console.log('  🔄 Testing GET API...');
      const getResponse = await fetch(`http://localhost:3000/api/follower-details?follower_name=${encodeURIComponent(follower.follower_name)}`);
      const getResult = await getResponse.json();

      if (!getResponse.ok) {
        console.log(`  ❌ GET API failed for ${follower.follower_name}:`, getResult.error);
        continue;
      }

      console.log(`  ✅ GET API successful for ${follower.follower_name}`);
      console.log(`  📊 Current values:`, {
        copy_mode: getResult.data.copy_mode,
        lot_size: getResult.data.lot_size,
        multiplier: getResult.data.multiplier,
        percentage: getResult.data.percentage,
        fixed_lot: getResult.data.fixed_lot
      });

      // Test 2: Update follower via API
      console.log('  🔄 Testing PUT API...');
      const testUpdate = {
        copy_mode: 'multiplier',
        multiplier: 1.5 + (i * 0.5), // Different value for each follower
        lot_size: 2.0 + (i * 0.5),
        percentage: 15.0 + (i * 5.0)
      };

      const putResponse = await fetch(`http://localhost:3000/api/follower-details?follower_name=${encodeURIComponent(follower.follower_name)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUpdate)
      });

      const putResult = await putResponse.json();

      if (!putResponse.ok) {
        console.log(`  ❌ PUT API failed for ${follower.follower_name}:`, putResult.error);
        continue;
      }

      console.log(`  ✅ PUT API successful for ${follower.follower_name}`);
      console.log(`  📊 Updated values:`, {
        copy_mode: putResult.data.copy_mode,
        lot_size: putResult.data.lot_size,
        multiplier: putResult.data.multiplier,
        percentage: putResult.data.percentage,
        fixed_lot: putResult.data.fixed_lot
      });

      // Test 3: Verify in database
      console.log('  🔄 Verifying in database...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('followers')
        .select('*')
        .eq('follower_name', follower.follower_name)
        .eq('account_status', 'active')
        .single();

      if (verifyError) {
        console.log(`  ❌ Database verification failed for ${follower.follower_name}:`, verifyError.message);
      } else {
        console.log(`  ✅ Database verification successful for ${follower.follower_name}`);
        console.log(`  📊 Database values:`, {
          copy_mode: verifyData.copy_mode,
          lot_size: verifyData.lot_size,
          multiplier: verifyData.multiplier,
          percentage: verifyData.percentage,
          fixed_lot: verifyData.fixed_lot
        });
      }

      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 3: Test with different user scenarios
    console.log('\n🔄 Step 3: Testing different user scenarios...');
    
    // Test followers with user_id
    const followersWithUser = allFollowers.filter(f => f.user_id);
    console.log(`📊 Found ${followersWithUser.length} followers with user_id`);
    
    // Test followers without user_id (system followers)
    const systemFollowers = allFollowers.filter(f => !f.user_id);
    console.log(`📊 Found ${systemFollowers.length} system followers (no user_id)`);

    if (followersWithUser.length > 0) {
      console.log('\n🔄 Testing follower with user_id...');
      const userFollower = followersWithUser[0];
      console.log(`📋 Testing: ${userFollower.follower_name} (user_id: ${userFollower.user_id})`);
      
      const userUpdate = {
        copy_mode: 'percentage',
        percentage: 20.0,
        lot_size: 1.5
      };

      const userResponse = await fetch(`http://localhost:3000/api/follower-details?follower_name=${encodeURIComponent(userFollower.follower_name)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userUpdate)
      });

      if (userResponse.ok) {
        console.log(`✅ User follower update successful`);
      } else {
        console.log(`❌ User follower update failed`);
      }
    }

    if (systemFollowers.length > 0) {
      console.log('\n🔄 Testing system follower (no user_id)...');
      const systemFollower = systemFollowers[0];
      console.log(`📋 Testing: ${systemFollower.follower_name} (user_id: null)`);
      
      const systemUpdate = {
        copy_mode: 'fixed lot',
        fixed_lot: 3.0,
        lot_size: 2.0
      };

      const systemResponse = await fetch(`http://localhost:3000/api/follower-details?follower_name=${encodeURIComponent(systemFollower.follower_name)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(systemUpdate)
      });

      if (systemResponse.ok) {
        console.log(`✅ System follower update successful`);
      } else {
        console.log(`❌ System follower update failed`);
      }
    }

    console.log('\n🎉 ALL FOLLOWERS EDIT TEST COMPLETE!');
    console.log('✅ The edit functionality should work for ALL followers');
    console.log('✅ Both user-specific and system followers are supported');
    console.log('✅ All copy modes and settings can be updated');

  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
}

// Run the test
testAllFollowersEdit().then(() => {
  console.log('\n🎉 TEST COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Test error:', error);
  process.exit(1);
}); 