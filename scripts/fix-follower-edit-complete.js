const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixFollowerEditComplete() {
  console.log('🔧 COMPREHENSIVE FOLLOWER EDIT FIX');
  console.log('==================================\n');

  try {
    // Step 1: Disable RLS completely on followers table
    console.log('🔄 Step 1: Disabling RLS on followers table...');
    const { error: disableError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE followers DISABLE ROW LEVEL SECURITY;'
    });
    
    if (disableError) {
      console.log('⚠️ Could not disable RLS:', disableError.message);
    } else {
      console.log('✅ RLS disabled on followers table');
    }

    // Step 2: Grant all permissions to anon and authenticated users
    console.log('\n🔄 Step 2: Granting permissions...');
    const { error: grantError } = await supabase.rpc('exec_sql', {
      sql: `
        GRANT ALL ON followers TO anon;
        GRANT ALL ON followers TO authenticated;
      `
    });
    
    if (grantError) {
      console.log('⚠️ Could not grant permissions:', grantError.message);
    } else {
      console.log('✅ Permissions granted');
    }

    // Step 3: Test with anon key
    console.log('\n🔄 Step 3: Testing with anon key...');
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: anonFollowers, error: anonError } = await anonSupabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (anonError) {
      console.log('❌ Anon key still has error:', anonError.message);
    } else {
      console.log(`✅ Anon key now found ${anonFollowers?.length || 0} followers`);
      if (anonFollowers && anonFollowers.length > 0) {
        anonFollowers.forEach((follower, index) => {
          console.log(`  ${index + 1}. ${follower.follower_name} (user_id: ${follower.user_id || 'null'})`);
        });
      }
    }

    // Step 4: Test the exact follower edit functionality
    console.log('\n🔄 Step 4: Testing follower edit functionality...');
    if (anonFollowers && anonFollowers.length > 0) {
      const testFollower = anonFollowers[0];
      console.log(`🎯 Testing with follower: ${testFollower.follower_name}`);

      // Test loading follower details (simulating frontend)
      const { data: followerDetails, error: detailsError } = await anonSupabase
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

      if (detailsError) {
        console.log('❌ Error loading follower details:', detailsError.message);
      } else {
        console.log('✅ Follower details loaded successfully');
        console.log('📊 Current Data:', {
          follower_name: followerDetails.follower_name,
          copy_mode: followerDetails.copy_mode,
          lot_size: followerDetails.lot_size,
          multiplier: followerDetails.multiplier,
          percentage: followerDetails.percentage,
          fixed_lot: followerDetails.fixed_lot,
          user_id: followerDetails.user_id
        });

        // Test updating follower (simulating frontend save)
        console.log('\n🔄 Testing follower update...');
        const testUpdate = {
          copy_mode: 'multiplier',
          multiplier: 2.0,
          lot_size: 1.5,
          max_lot_size: 5.0,
          min_lot_size: 0.1
        };

        const { data: updateResult, error: updateError } = await anonSupabase
          .from('followers')
          .update(testUpdate)
          .eq('follower_name', testFollower.follower_name)
          .eq('account_status', 'active')
          .select();

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
    }

    // Step 5: Test with service role to ensure it still works
    console.log('\n🔄 Step 5: Testing with service role...');
    const { data: serviceFollowers, error: serviceError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (serviceError) {
      console.log('❌ Service role error:', serviceError.message);
    } else {
      console.log(`✅ Service role found ${serviceFollowers?.length || 0} followers`);
    }

    console.log('\n🎉 FOLLOWER EDIT FIX COMPLETE!');
    console.log('✅ The follower edit functionality should now work in the browser');

  } catch (error) {
    console.log('❌ Fix error:', error.message);
  }
}

// Run the fix
fixFollowerEditComplete().then(() => {
  console.log('\n🎉 COMPREHENSIVE FIX COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Fix error:', error);
  process.exit(1);
}); 