const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFollowerDeletion() {
  console.log('🧪 TESTING FOLLOWER DELETION');
  console.log('=' .repeat(60));

  try {
    // 1. Check current followers
    console.log('1. Checking current followers...');
    
    const { data: currentFollowers, error: currentError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (currentError) {
      console.log('❌ Error fetching current followers:', currentError);
      return;
    }

    console.log(`✅ Found ${currentFollowers.length} active followers:`);
    currentFollowers.forEach(follower => {
      console.log(`   - ${follower.follower_name} (${follower.id})`);
    });

    if (currentFollowers.length === 0) {
      console.log('❌ No followers to test deletion with');
      return;
    }

    // 2. Test the RPC function
    console.log('\n2. Testing delete_follower_account RPC function...');
    
    const testFollower = currentFollowers[0];
    console.log(`   Testing with: ${testFollower.follower_name} (${testFollower.id})`);

    const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_follower_account', {
      follower_id: testFollower.id
    });

    if (rpcError) {
      console.log('❌ RPC function error:', rpcError);
      
      // 3. Try direct deletion as fallback
      console.log('\n3. Trying direct deletion as fallback...');
      
      const { error: directError } = await supabase
        .from('followers')
        .delete()
        .eq('id', testFollower.id);

      if (directError) {
        console.log('❌ Direct deletion error:', directError);
      } else {
        console.log('✅ Direct deletion successful');
      }
    } else {
      console.log('✅ RPC function successful:', rpcResult);
    }

    // 4. Verify deletion
    console.log('\n4. Verifying deletion...');
    
    const { data: remainingFollowers, error: verifyError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (verifyError) {
      console.log('❌ Error verifying deletion:', verifyError);
      return;
    }

    console.log(`✅ Remaining active followers: ${remainingFollowers.length}`);
    remainingFollowers.forEach(follower => {
      console.log(`   - ${follower.follower_name} (${follower.id})`);
    });

    // 5. Check if the deleted follower still exists
    const { data: deletedFollower, error: checkError } = await supabase
      .from('followers')
      .select('*')
      .eq('id', testFollower.id);

    if (checkError) {
      console.log('❌ Error checking deleted follower:', checkError);
    } else if (deletedFollower.length === 0) {
      console.log('✅ SUCCESS: Follower was properly deleted');
    } else {
      console.log('❌ FAILED: Follower still exists in database');
      console.log('   Status:', deletedFollower[0].account_status);
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Error in test script:', error);
  }
}

// Run the test
testFollowerDeletion().catch(console.error); 