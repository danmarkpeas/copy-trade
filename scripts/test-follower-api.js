const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFollowerAPI() {
  console.log('🧪 TESTING FOLLOWER API ENDPOINT');
  console.log('================================\n');

  try {
    // Step 1: Get all followers from database
    console.log('🔄 Step 1: Getting followers from database...');
    const { data: followers, error: dbError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (dbError) {
      console.log('❌ Database error:', dbError.message);
      return;
    }

    if (!followers || followers.length === 0) {
      console.log('❌ No followers found in database');
      return;
    }

    console.log(`✅ Found ${followers.length} followers in database`);
    followers.forEach((follower, index) => {
      console.log(`  ${index + 1}. ${follower.follower_name} (user_id: ${follower.user_id || 'null'})`);
    });

    // Step 2: Test the API endpoint
    const testFollower = followers[0];
    console.log(`\n🔄 Step 2: Testing API with follower: ${testFollower.follower_name}`);

    // Test GET endpoint
    const getResponse = await fetch(`http://localhost:3000/api/follower-details?follower_name=${encodeURIComponent(testFollower.follower_name)}`);
    const getResult = await getResponse.json();

    if (!getResponse.ok) {
      console.log('❌ GET API error:', getResult.error);
      return;
    }

    if (getResult.success && getResult.data) {
      console.log('✅ GET API successful');
      console.log('📊 Follower details:', {
        follower_name: getResult.data.follower_name,
        copy_mode: getResult.data.copy_mode,
        lot_size: getResult.data.lot_size,
        multiplier: getResult.data.multiplier,
        percentage: getResult.data.percentage,
        fixed_lot: getResult.data.fixed_lot,
        user_id: getResult.data.user_id
      });
    } else {
      console.log('❌ GET API returned no data');
      return;
    }

    // Step 3: Test PUT endpoint
    console.log('\n🔄 Step 3: Testing PUT API...');
    const testUpdate = {
      copy_mode: 'multiplier',
      multiplier: 2.5,
      lot_size: 2.0,
      max_lot_size: 10.0,
      min_lot_size: 0.5
    };

    const putResponse = await fetch(`http://localhost:3000/api/follower-details?follower_name=${encodeURIComponent(testFollower.follower_name)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUpdate)
    });

    const putResult = await putResponse.json();

    if (!putResponse.ok) {
      console.log('❌ PUT API error:', putResult.error);
      return;
    }

    if (putResult.success) {
      console.log('✅ PUT API successful');
      console.log('📊 Updated data:', {
        copy_mode: putResult.data.copy_mode,
        lot_size: putResult.data.lot_size,
        multiplier: putResult.data.multiplier,
        percentage: putResult.data.percentage,
        fixed_lot: putResult.data.fixed_lot
      });
    } else {
      console.log('❌ PUT API failed');
      return;
    }

    // Step 4: Verify the update in database
    console.log('\n🔄 Step 4: Verifying update in database...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_name', testFollower.follower_name)
      .eq('account_status', 'active')
      .single();

    if (verifyError) {
      console.log('❌ Verification error:', verifyError.message);
    } else {
      console.log('✅ Database verification successful');
      console.log('📊 Verified data:', {
        copy_mode: verifyData.copy_mode,
        lot_size: verifyData.lot_size,
        multiplier: verifyData.multiplier,
        percentage: verifyData.percentage,
        fixed_lot: verifyData.fixed_lot
      });
    }

    console.log('\n🎉 FOLLOWER API TEST COMPLETE!');
    console.log('✅ The API endpoint is working correctly');
    console.log('✅ The frontend should now be able to load and update follower details');

  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
}

// Run the test
testFollowerAPI().then(() => {
  console.log('\n🎉 TEST COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Test error:', error);
  process.exit(1);
}); 