const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFollowerEdit() {
  console.log('🧪 TESTING FOLLOWER EDIT FUNCTIONALITY');
  console.log('=====================================\n');

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('❌ User not authenticated, using service role');
    }

    // Get all followers directly from table
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

    console.log(`📋 Found ${followers.length} followers:`);
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

    // Test updating the first follower
    const testFollower = followers[0];
    console.log(`🎯 Testing update for: ${testFollower.follower_name}`);

    // Get current details
    const { data: currentDetails, error: detailsError } = await supabase
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
      console.log('❌ Error getting current details:', detailsError.message);
      return;
    }

    if (currentDetails) {
      console.log('📊 Current Settings:');
      console.log(`   Copy Mode: ${currentDetails.copy_mode}`);
      console.log(`   Lot Size: ${currentDetails.lot_size}`);
      console.log(`   Multiplier: ${currentDetails.multiplier}`);
      console.log(`   Percentage: ${currentDetails.percentage}`);
      console.log(`   Fixed Lot: ${currentDetails.fixed_lot}`);
      console.log(`   Min Lot Size: ${currentDetails.min_lot_size}`);
      console.log(`   Max Lot Size: ${currentDetails.max_lot_size}`);
      console.log('');

      // Test different copy modes
      const testCases = [
        {
          name: 'Switch to Multiplier Mode',
          copy_mode: 'multiplier',
          multiplier: 2.5,
          lot_size: 1.5,
          min_lot_size: 0.1,
          max_lot_size: 5.0
        },
        {
          name: 'Switch to Percentage Mode',
          copy_mode: '% balance',
          percentage: 25.0,
          lot_size: 2.0,
          min_lot_size: 0.05,
          max_lot_size: 8.0
        },
        {
          name: 'Switch to Fixed Lot Mode',
          copy_mode: 'fixed lot',
          fixed_lot: 3.0,
          lot_size: 1.0,
          min_lot_size: 0.01,
          max_lot_size: 10.0
        }
      ];

      for (const testCase of testCases) {
        console.log(`🔄 Testing: ${testCase.name}`);
        
        // Update using direct table update
        const { data: updateResult, error: updateError } = await supabase
          .from('followers')
          .update({
            copy_mode: testCase.copy_mode,
            multiplier: testCase.copy_mode === 'multiplier' ? testCase.multiplier : currentDetails.multiplier,
            percentage: testCase.copy_mode === '% balance' ? testCase.percentage : currentDetails.percentage,
            fixed_lot: testCase.copy_mode === 'fixed lot' ? testCase.fixed_lot : currentDetails.fixed_lot,
            lot_size: testCase.lot_size,
            max_lot_size: testCase.max_lot_size,
            min_lot_size: testCase.min_lot_size
          })
          .eq('id', currentDetails.id)
          .select();

        if (updateError) {
          console.log(`❌ Update failed: ${updateError.message}`);
        } else if (updateResult && updateResult.length > 0) {
          const result = updateResult[0];
          console.log(`✅ ${testCase.name} - SUCCESS`);
          console.log(`   New Copy Mode: ${result.copy_mode}`);
          console.log(`   New Lot Size: ${result.lot_size}`);
          if (result.copy_mode === 'multiplier') {
            console.log(`   New Multiplier: ${result.multiplier}x`);
          } else if (result.copy_mode === '% balance') {
            console.log(`   New Percentage: ${result.percentage}%`);
          } else if (result.copy_mode === 'fixed lot') {
            console.log(`   New Fixed Lot: ${result.fixed_lot}`);
          }
          console.log('');
        }

        // Wait a bit between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Verify final state
      console.log('🔍 Verifying final state...');
      const { data: finalDetails, error: finalError } = await supabase
        .from('followers')
        .select('*')
        .eq('id', currentDetails.id)
        .single();

      if (!finalError && finalDetails) {
        console.log('📊 Final Settings:');
        console.log(`   Copy Mode: ${finalDetails.copy_mode}`);
        console.log(`   Lot Size: ${finalDetails.lot_size}`);
        console.log(`   Multiplier: ${finalDetails.multiplier}`);
        console.log(`   Percentage: ${finalDetails.percentage}`);
        console.log(`   Fixed Lot: ${finalDetails.fixed_lot}`);
        console.log(`   Min Lot Size: ${finalDetails.min_lot_size}`);
        console.log(`   Max Lot Size: ${finalDetails.max_lot_size}`);
      }
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testFollowerEdit().then(() => {
  console.log('\n🎉 FOLLOWER EDIT TEST COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Test error:', error);
  process.exit(1);
}); 