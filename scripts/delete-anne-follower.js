const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteAnneFollower() {
  console.log('🗑️  DELETING ANNE FOLLOWER');
  console.log('=' .repeat(60));

  try {
    // 1. Find Anne follower
    console.log('1. Finding Anne follower...');
    
    const { data: anneFollowers, error: anneError } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_name', 'Anne');

    if (anneError) {
      console.log('❌ Error finding Anne:', anneError);
      return;
    }

    if (anneFollowers.length === 0) {
      console.log('✅ Anne has already been deleted');
      return;
    }

    console.log(`✅ Found ${anneFollowers.length} Anne follower(s):`);
    anneFollowers.forEach(follower => {
      console.log(`   - ID: ${follower.id}`);
      console.log(`   - Status: ${follower.account_status}`);
      console.log(`   - Created: ${follower.created_at}`);
    });

    // 2. Delete Anne follower
    console.log('\n2. Deleting Anne follower...');
    
    for (const follower of anneFollowers) {
      const { error: deleteError } = await supabase
        .from('followers')
        .delete()
        .eq('id', follower.id);

      if (deleteError) {
        console.log(`❌ Error deleting Anne (${follower.id}):`, deleteError);
      } else {
        console.log(`✅ Successfully deleted Anne (${follower.id})`);
      }
    }

    // 3. Verify deletion
    console.log('\n3. Verifying deletion...');
    
    const { data: remainingAnne, error: verifyError } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_name', 'Anne');

    if (verifyError) {
      console.log('❌ Error verifying deletion:', verifyError);
      return;
    }

    if (remainingAnne.length === 0) {
      console.log('✅ SUCCESS: Anne has been completely deleted');
    } else {
      console.log(`❌ FAILED: Anne still exists (${remainingAnne.length} records)`);
    }

    // 4. Check remaining followers
    console.log('\n4. Checking remaining followers...');
    
    const { data: remainingFollowers, error: remainingError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (remainingError) {
      console.log('❌ Error checking remaining followers:', remainingError);
      return;
    }

    console.log(`✅ Remaining active followers: ${remainingFollowers.length}`);
    remainingFollowers.forEach(follower => {
      console.log(`   - ${follower.follower_name} (${follower.id})`);
    });

    console.log('\n✅ SUCCESS: Anne follower deletion completed!');
    console.log('');
    console.log('🔄 NEXT STEPS:');
    console.log('   1. Restart the backend server to sync changes');
    console.log('   2. Refresh the frontend to see updated follower list');
    console.log('   3. Verify that only 2 followers remain active');

  } catch (error) {
    console.error('❌ Error in delete script:', error);
  }
}

// Run the delete script
deleteAnneFollower().catch(console.error); 