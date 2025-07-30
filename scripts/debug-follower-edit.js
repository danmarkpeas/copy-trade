const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugFollowerEdit() {
  console.log('🔍 DEBUGGING FOLLOWER EDIT ISSUES');
  console.log('==================================\n');

  try {
    // Get all followers
    console.log('📋 Getting all followers...');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError.message);
      return;
    }

    console.log(`✅ Found ${followers?.length || 0} followers:`);
    if (followers && followers.length > 0) {
      followers.forEach((follower, index) => {
        console.log(`  ${index + 1}. ${follower.follower_name}`);
        console.log(`     User ID: ${follower.user_id}`);
        console.log(`     Copy Mode: ${follower.copy_mode}`);
        console.log(`     Lot Size: ${follower.lot_size}`);
        console.log(`     Multiplier: ${follower.multiplier}`);
        console.log(`     Percentage: ${follower.percentage}`);
        console.log(`     Fixed Lot: ${follower.fixed_lot}`);
        console.log('');
      });

      // Test with the first follower
      const testFollower = followers[0];
      console.log(`🎯 Testing with follower: ${testFollower.follower_name}`);

      // Test RPC function
      console.log('\n🔄 Testing RPC function...');
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_follower_account_complete_details_with_platform',
        {
          user_uuid: testFollower.user_id,
          follower_name_input: testFollower.follower_name
        }
      );

      if (rpcError) {
        console.log('❌ RPC function error:', rpcError.message);
      } else {
        console.log(`✅ RPC function working - Found ${rpcData?.length || 0} results`);
        if (rpcData && rpcData.length > 0) {
          console.log('📊 RPC Data:', rpcData[0]);
        }
      }

      // Test direct query
      console.log('\n🔄 Testing direct query...');
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
        console.log('✅ Direct query working');
        console.log('📊 Direct Data:', {
          follower_name: directData.follower_name,
          copy_mode: directData.copy_mode,
          lot_size: directData.lot_size,
          multiplier: directData.multiplier,
          percentage: directData.percentage,
          fixed_lot: directData.fixed_lot,
          broker_name: directData.broker_accounts?.broker_name
        });
      }

      // Test update functionality
      console.log('\n🔄 Testing update functionality...');
      const testUpdate = {
        copy_mode: 'multiplier',
        multiplier: 2.0,
        lot_size: 1.5,
        max_lot_size: 5.0,
        min_lot_size: 0.1
      };

      const { data: updateResult, error: updateError } = await supabase
        .from('followers')
        .update(testUpdate)
        .eq('id', testFollower.id)
        .select();

      if (updateError) {
        console.log('❌ Update error:', updateError.message);
      } else {
        console.log('✅ Update successful');
        console.log('📊 Updated Data:', updateResult[0]);
      }

      // Verify the update
      console.log('\n🔍 Verifying update...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('followers')
        .select('*')
        .eq('id', testFollower.id)
        .single();

      if (verifyError) {
        console.log('❌ Verification error:', verifyError.message);
      } else {
        console.log('✅ Verification successful');
        console.log('📊 Verified Data:', {
          copy_mode: verifyData.copy_mode,
          lot_size: verifyData.lot_size,
          multiplier: verifyData.multiplier,
          percentage: verifyData.percentage,
          fixed_lot: verifyData.fixed_lot
        });
      }

    } else {
      console.log('❌ No followers found');
    }

  } catch (error) {
    console.log('❌ Debug error:', error.message);
  }
}

// Run the debug
debugFollowerEdit().then(() => {
  console.log('\n🎉 DEBUG COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Debug error:', error);
  process.exit(1);
}); 