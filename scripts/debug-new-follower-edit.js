const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugNewFollowerEdit() {
  console.log('🔍 DEBUG: NEW FOLLOWER EDIT ISSUE');
  console.log('==================================\n');

  try {
    // Step 1: Get the most recently created followers
    console.log('🔄 Step 1: Getting recently created followers...');
    const { data: recentFollowers, error: recentError } = await supabase
      .from('followers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.log('❌ Error fetching recent followers:', recentError.message);
      return;
    }

    console.log(`✅ Found ${recentFollowers?.length || 0} recent followers:`);
    recentFollowers?.forEach((follower, index) => {
      console.log(`  ${index + 1}. ${follower.follower_name} (Created: ${follower.created_at})`);
      console.log(`     Status: ${follower.account_status}, User: ${follower.user_id || 'System'}`);
    });

    // Step 2: Test with the most recent follower
    if (recentFollowers && recentFollowers.length > 0) {
      const newestFollower = recentFollowers[0];
      console.log(`\n🔄 Step 2: Testing with newest follower: ${newestFollower.follower_name}`);
      
      console.log('📊 Current values:', {
        copy_mode: newestFollower.copy_mode,
        lot_size: newestFollower.lot_size,
        multiplier: newestFollower.multiplier,
        percentage: newestFollower.percentage,
        fixed_lot: newestFollower.fixed_lot,
        account_status: newestFollower.account_status
      });

      // Step 3: Test API GET request
      console.log('\n🔄 Step 3: Testing API GET request...');
      const getResponse = await fetch(`http://localhost:3000/api/follower-details?follower_name=${encodeURIComponent(newestFollower.follower_name)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const getResult = await getResponse.json();
      console.log('📊 GET API response status:', getResponse.status);
      console.log('📊 GET API response:', JSON.stringify(getResult, null, 2));

      if (getResponse.ok && getResult.success) {
        console.log('✅ GET API working for new follower');
      } else {
        console.log('❌ GET API failed for new follower:', getResult.error);
      }

      // Step 4: Test API PUT request
      console.log('\n🔄 Step 4: Testing API PUT request...');
      const testUpdate = {
        copy_mode: 'percentage',
        percentage: 35.0,
        lot_size: 2.0,
        multiplier: 1.8
      };

      console.log('📊 Test update data:', testUpdate);

      const putResponse = await fetch(`http://localhost:3000/api/follower-details?follower_name=${encodeURIComponent(newestFollower.follower_name)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUpdate)
      });

      const putResult = await putResponse.json();
      console.log('📊 PUT API response status:', putResponse.status);
      console.log('📊 PUT API response:', JSON.stringify(putResult, null, 2));

      if (putResponse.ok && putResult.success) {
        console.log('✅ PUT API working for new follower');
        console.log('📊 Updated values:', {
          copy_mode: putResult.data.copy_mode,
          lot_size: putResult.data.lot_size,
          multiplier: putResult.data.multiplier,
          percentage: putResult.data.percentage,
          fixed_lot: putResult.data.fixed_lot
        });
      } else {
        console.log('❌ PUT API failed for new follower:', putResult.error);
      }

      // Step 5: Verify database state after update
      console.log('\n🔄 Step 5: Verifying database state after update...');
      const { data: finalData, error: finalError } = await supabase
        .from('followers')
        .select('*')
        .eq('follower_name', newestFollower.follower_name)
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
          fixed_lot: finalData.fixed_lot,
          account_status: finalData.account_status
        });
      }

      // Step 6: Check if there are any issues with the follower creation
      console.log('\n🔄 Step 6: Checking follower creation details...');
      console.log('📊 Follower details:', {
        id: newestFollower.id,
        follower_name: newestFollower.follower_name,
        user_id: newestFollower.user_id,
        master_broker_account_id: newestFollower.master_broker_account_id,
        account_status: newestFollower.account_status,
        is_verified: newestFollower.is_verified,
        created_at: newestFollower.created_at
      });

      // Check if the follower has proper associations
      if (newestFollower.master_broker_account_id) {
        const { data: brokerAccount, error: brokerError } = await supabase
          .from('broker_accounts')
          .select('*')
          .eq('id', newestFollower.master_broker_account_id)
          .single();

        if (brokerError) {
          console.log('❌ Broker account not found:', brokerError.message);
        } else {
          console.log('✅ Broker account found:', brokerAccount.broker_name);
        }
      }

      if (newestFollower.user_id) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', newestFollower.user_id)
          .single();

        if (userError) {
          console.log('❌ User not found:', userError.message);
        } else {
          console.log('✅ User found:', user.email);
        }
      }

    } else {
      console.log('❌ No recent followers found');
    }

    // Step 7: Check for any followers with potential issues
    console.log('\n🔄 Step 7: Checking for followers with potential issues...');
    const { data: problematicFollowers, error: problematicError } = await supabase
      .from('followers')
      .select('*')
      .or('account_status.is.null,account_status.eq.inactive')
      .order('created_at', { ascending: false })
      .limit(5);

    if (problematicError) {
      console.log('❌ Error checking problematic followers:', problematicError.message);
    } else if (problematicFollowers && problematicFollowers.length > 0) {
      console.log(`⚠️ Found ${problematicFollowers.length} followers with potential issues:`);
      problematicFollowers.forEach(follower => {
        console.log(`  - ${follower.follower_name}: status=${follower.account_status}, user=${follower.user_id || 'System'}`);
      });
    } else {
      console.log('✅ No problematic followers found');
    }

    console.log('\n🎉 NEW FOLLOWER DEBUG COMPLETE!');

  } catch (error) {
    console.log('❌ Debug error:', error.message);
  }
}

// Run the debug
debugNewFollowerEdit().then(() => {
  console.log('\n🎉 DEBUG COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Debug error:', error);
  process.exit(1);
}); 