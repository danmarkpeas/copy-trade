const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllFollowersStatus() {
  console.log('🔍 CHECKING ALL FOLLOWERS STATUS');
  console.log('=================================\n');

  try {
    // Get all followers
    const { data: allFollowers, error: allError } = await supabase
      .from('followers')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      console.log('❌ Error fetching followers:', allError.message);
      return;
    }

    console.log(`📊 Total followers found: ${allFollowers?.length || 0}\n`);

    // Group followers by status
    const activeFollowers = allFollowers?.filter(f => f.account_status === 'active') || [];
    const inactiveFollowers = allFollowers?.filter(f => f.account_status !== 'active') || [];

    console.log(`✅ Active followers: ${activeFollowers.length}`);
    console.log(`⚠️ Inactive followers: ${inactiveFollowers.length}\n`);

    // Display all active followers
    console.log('📋 ACTIVE FOLLOWERS:');
    console.log('====================');
    activeFollowers.forEach((follower, index) => {
      console.log(`${index + 1}. ${follower.follower_name}`);
      console.log(`   ID: ${follower.id}`);
      console.log(`   User: ${follower.user_id || 'System (no user)'}`);
      console.log(`   Status: ${follower.account_status}`);
      console.log(`   Verified: ${follower.is_verified}`);
      console.log(`   Created: ${follower.created_at}`);
      console.log(`   Copy Mode: ${follower.copy_mode}`);
      console.log(`   Lot Size: ${follower.lot_size}`);
      console.log(`   Multiplier: ${follower.multiplier}`);
      console.log(`   Percentage: ${follower.percentage}`);
      console.log(`   Fixed Lot: ${follower.fixed_lot}`);
      console.log('');
    });

    // Display inactive followers if any
    if (inactiveFollowers.length > 0) {
      console.log('📋 INACTIVE FOLLOWERS:');
      console.log('=====================');
      inactiveFollowers.forEach((follower, index) => {
        console.log(`${index + 1}. ${follower.follower_name}`);
        console.log(`   ID: ${follower.id}`);
        console.log(`   User: ${follower.user_id || 'System (no user)'}`);
        console.log(`   Status: ${follower.account_status}`);
        console.log(`   Verified: ${follower.is_verified}`);
        console.log(`   Created: ${follower.created_at}`);
        console.log('');
      });
    }

    // Test API access for each active follower
    console.log('🧪 TESTING API ACCESS FOR EACH ACTIVE FOLLOWER:');
    console.log('===============================================');

    for (let i = 0; i < activeFollowers.length; i++) {
      const follower = activeFollowers[i];
      console.log(`\n${i + 1}. Testing: ${follower.follower_name}`);
      
      try {
        // Test GET API
        const getResponse = await fetch(`http://localhost:3000/api/follower-details?follower_name=${encodeURIComponent(follower.follower_name)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        const getResult = await getResponse.json();
        
        if (getResponse.ok && getResult.success) {
          console.log(`   ✅ GET API: Working`);
        } else {
          console.log(`   ❌ GET API: Failed - ${getResult.error}`);
        }

        // Test PUT API with a simple update
        const testUpdate = {
          copy_mode: follower.copy_mode === 'percentage' ? 'multiplier' : 'percentage',
          percentage: follower.percentage + 1,
          lot_size: follower.lot_size + 0.1,
          multiplier: follower.multiplier + 0.1
        };

        const putResponse = await fetch(`http://localhost:3000/api/follower-details?follower_name=${encodeURIComponent(follower.follower_name)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testUpdate)
        });

        const putResult = await putResponse.json();
        
        if (putResponse.ok && putResult.success) {
          console.log(`   ✅ PUT API: Working`);
          console.log(`   📊 Updated: copy_mode=${putResult.data.copy_mode}, lot_size=${putResult.data.lot_size}`);
        } else {
          console.log(`   ❌ PUT API: Failed - ${putResult.error}`);
        }

      } catch (error) {
        console.log(`   ❌ API Test Error: ${error.message}`);
      }
    }

    // Summary
    console.log('\n🎯 SUMMARY:');
    console.log('===========');
    console.log(`📊 Total followers: ${allFollowers?.length || 0}`);
    console.log(`✅ Active followers: ${activeFollowers.length}`);
    console.log(`⚠️ Inactive followers: ${inactiveFollowers.length}`);
    console.log(`🔗 System followers (no user): ${activeFollowers.filter(f => !f.user_id).length}`);
    console.log(`👤 User-specific followers: ${activeFollowers.filter(f => f.user_id).length}`);

    // Check for any potential issues
    const followersWithoutBroker = activeFollowers.filter(f => !f.master_broker_account_id);
    const followersWithoutVerification = activeFollowers.filter(f => !f.is_verified);

    if (followersWithoutBroker.length > 0) {
      console.log(`⚠️ Followers without broker account: ${followersWithoutBroker.length}`);
      followersWithoutBroker.forEach(f => console.log(`   - ${f.follower_name}`));
    }

    if (followersWithoutVerification.length > 0) {
      console.log(`⚠️ Followers without verification: ${followersWithoutVerification.length}`);
      followersWithoutVerification.forEach(f => console.log(`   - ${f.follower_name}`));
    }

    console.log('\n🎉 ALL FOLLOWERS STATUS CHECK COMPLETE!');

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run the check
checkAllFollowersStatus().then(() => {
  console.log('\n🎉 CHECK COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Check error:', error);
  process.exit(1);
}); 