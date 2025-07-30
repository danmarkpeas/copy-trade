const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugFrontendFollowers() {
  console.log('🔍 DEBUGGING FRONTEND FOLLOWERS ISSUE');
  console.log('=====================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the user gauravcrd@gmail.com
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'gauravcrd@gmail.com')
      .single();

    if (userError || !users) {
      console.log('❌ User not found:', userError);
      return;
    }

    console.log(`👤 User: ${users.email} (${users.id})`);

    // Check followers for this user
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select(`
        id,
        follower_name,
        copy_mode,
        lot_size,
        multiplier,
        fixed_lot,
        min_lot_size,
        max_lot_size,
        account_status,
        is_verified,
        created_at,
        user_id
      `)
      .eq('user_id', users.id);

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }

    console.log(`✅ Found ${followers?.length || 0} followers for user`);
    
    if (followers && followers.length > 0) {
      followers.forEach((follower, index) => {
        console.log(`\n📊 Follower ${index + 1}:`);
        console.log(`   ID: ${follower.id}`);
        console.log(`   Name: ${follower.follower_name}`);
        console.log(`   User ID: ${follower.user_id}`);
        console.log(`   Copy Mode: ${follower.copy_mode}`);
        console.log(`   Lot Size: ${follower.lot_size}`);
        console.log(`   Status: ${follower.account_status}`);
        console.log(`   Verified: ${follower.is_verified}`);
      });
    }

    // Test the exact query the frontend uses
    console.log('\n🔍 Testing frontend query...');
    
    const { data: frontendData, error: frontendError } = await supabase
      .from('followers')
      .select(`
        id,
        follower_name,
        copy_mode,
        lot_size,
        multiplier,
        fixed_lot,
        min_lot_size,
        max_lot_size,
        account_status,
        is_verified,
        created_at,
        master_broker_account_id
      `)
      .eq('user_id', users.id)
      .order('created_at', { ascending: false });

    if (frontendError) {
      console.log('❌ Frontend query error:', frontendError);
    } else {
      console.log(`✅ Frontend query returned ${frontendData?.length || 0} followers`);
      
      if (frontendData && frontendData.length > 0) {
        console.log('📋 First follower data:');
        console.log(JSON.stringify(frontendData[0], null, 2));
      }
    }

    // Check if there are any followers without user_id
    const { data: orphanedFollowers, error: orphanedError } = await supabase
      .from('followers')
      .select('id, follower_name, user_id')
      .is('user_id', null);

    if (orphanedError) {
      console.log('❌ Error checking orphaned followers:', orphanedError);
    } else if (orphanedFollowers && orphanedFollowers.length > 0) {
      console.log(`⚠️  Found ${orphanedFollowers.length} followers without user_id:`);
      orphanedFollowers.forEach(f => {
        console.log(`   - ${f.follower_name} (${f.id})`);
      });
    } else {
      console.log('✅ No orphaned followers found');
    }

    // Check broker accounts for this user
    const { data: brokers, error: brokersError } = await supabase
      .from('broker_accounts')
      .select('id, account_name, broker_name, is_active')
      .eq('user_id', users.id);

    if (brokersError) {
      console.log('❌ Error fetching brokers:', brokersError);
    } else {
      console.log(`\n📊 Broker accounts for user: ${brokers?.length || 0}`);
      brokers?.forEach(broker => {
        console.log(`   - ${broker.account_name} (${broker.broker_name}) - Active: ${broker.is_active}`);
      });
    }

    console.log('\n🎯 DIAGNOSIS:');
    console.log('=============');
    
    if (followers && followers.length > 0) {
      console.log('✅ Followers exist in database');
      console.log('✅ User ID relationships are correct');
      console.log('✅ Frontend query should work');
      console.log('\n🔧 POSSIBLE ISSUES:');
      console.log('   1. Frontend authentication not working');
      console.log('   2. Frontend not using correct user ID');
      console.log('   3. Frontend query filtering issue');
    } else {
      console.log('❌ No followers found for user');
      console.log('🔧 SOLUTION: Create followers for this user');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugFrontendFollowers(); 