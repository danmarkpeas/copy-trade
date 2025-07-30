const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkExistingFunctions() {
  console.log('🔍 Checking existing database functions...\n');

  try {
    // Get all followers directly from the table
    console.log('📋 Getting followers from table...');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError.message);
      return;
    }

    console.log(`✅ Found ${followers?.length || 0} active followers:`);
    if (followers && followers.length > 0) {
      followers.forEach((follower, index) => {
        console.log(`  ${index + 1}. ${follower.follower_name}`);
        console.log(`     Copy Mode: ${follower.copy_mode}`);
        console.log(`     Lot Size: ${follower.lot_size}`);
        console.log(`     Multiplier: ${follower.multiplier}`);
        console.log(`     Percentage: ${follower.percentage}`);
        console.log(`     Fixed Lot: ${follower.fixed_lot}`);
        console.log(`     User ID: ${follower.user_id}`);
        console.log('');
      });

      // Test getting details for the first follower
      const testFollower = followers[0];
      console.log(`🎯 Testing details for: ${testFollower.follower_name}`);
      
      const { data: details, error: detailsError } = await supabase
        .from('followers')
        .select(`
          *,
          broker_accounts!followers_master_broker_account_id_fkey (
            broker_name,
            account_name,
            broker_platform
          )
        `)
        .eq('follower_name', testFollower.follower_name)
        .eq('account_status', 'active')
        .single();

      if (detailsError) {
        console.log('❌ Error getting follower details:', detailsError.message);
      } else {
        console.log('✅ Follower details loaded successfully:');
        console.log(`   Copy Mode: ${details.copy_mode}`);
        console.log(`   Lot Size: ${details.lot_size}`);
        console.log(`   Multiplier: ${details.multiplier}`);
        console.log(`   Percentage: ${details.percentage}`);
        console.log(`   Fixed Lot: ${details.fixed_lot}`);
        console.log(`   Broker: ${details.broker_accounts?.broker_name || 'N/A'}`);
        console.log(`   Platform: ${details.broker_accounts?.broker_platform || 'N/A'}`);
      }
    }

    // Check if the RPC functions exist
    console.log('\n🔍 Testing RPC functions...');
    
    const functionNames = [
      'get_all_followers',
      'get_follower_account_complete_details_with_platform',
      'update_follower_account_complete'
    ];

    for (const funcName of functionNames) {
      try {
        const { error } = await supabase.rpc(funcName, {});
        if (error && error.message.includes('function') && error.message.includes('not found')) {
          console.log(`❌ ${funcName} - NOT FOUND`);
        } else {
          console.log(`✅ ${funcName} - EXISTS`);
        }
      } catch (err) {
        console.log(`❌ ${funcName} - ERROR: ${err.message}`);
      }
    }

  } catch (error) {
    console.log('❌ Error checking functions:', error.message);
  }
}

// Run the check
checkExistingFunctions().then(() => {
  console.log('\n🎉 FUNCTION CHECK COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Check error:', error);
  process.exit(1);
}); 