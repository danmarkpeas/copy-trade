const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function activateFollowerBroker() {
  console.log('🔧 ACTIVATING ANNESHAN BROKER ACCOUNT\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get Anneshan's follower details
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_name', 'Anneshan');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No follower found for Anneshan');
      return;
    }

    const follower = followers[0];
    console.log('✅ Found Anneshan follower:', follower.follower_name);

    // Get Anneshan's broker account
    const { data: followerBrokers, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', follower.user_id);

    if (brokerError || !followerBrokers || followerBrokers.length === 0) {
      console.log('❌ No broker account found for Anneshan');
      return;
    }

    const followerBroker = followerBrokers[0];
    console.log('📋 Current broker account status:');
    console.log(`   Name: ${followerBroker.account_name}`);
    console.log(`   Status: ${followerBroker.account_status}`);
    console.log(`   Is Active: ${followerBroker.is_active}`);
    console.log(`   Is Verified: ${followerBroker.is_verified}`);

    // Update the broker account to active
    console.log('\n🔧 Updating broker account to active...');
    const { data: updatedBroker, error: updateError } = await supabase
      .from('broker_accounts')
      .update({
        account_status: 'active',
        is_active: true,
        is_verified: true
      })
      .eq('id', followerBroker.id)
      .select()
      .single();

    if (updateError) {
      console.log('❌ Error updating broker account:', updateError);
      return;
    }

    console.log('✅ Broker account updated successfully!');
    console.log(`   New Status: ${updatedBroker.account_status}`);
    console.log(`   Is Active: ${updatedBroker.is_active}`);
    console.log(`   Is Verified: ${updatedBroker.is_verified}`);

    // Verify the update
    console.log('\n🔍 Verifying the update...');
    const { data: verifyBroker, error: verifyError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', followerBroker.id)
      .single();

    if (verifyError) {
      console.log('❌ Error verifying update:', verifyError);
    } else {
      console.log('✅ Verification successful:');
      console.log(`   Status: ${verifyBroker.account_status}`);
      console.log(`   Is Active: ${verifyBroker.is_active}`);
      console.log(`   Is Verified: ${verifyBroker.is_verified}`);
    }

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. ✅ Anneshan\'s broker account is now active');
    console.log('2. 🔄 Restart the copy trading engine (if needed)');
    console.log('3. 📊 Place a new trade on the master account');
    console.log('4. 👀 Watch for copy trades to be executed');
    console.log('5. 📈 Check the UI at http://localhost:3000/trades');

    console.log('\n💡 TESTING:');
    console.log('- The next trade on the master account should be copied to Anneshan');
    console.log('- Check the backend logs for "Copy trade executed" messages');
    console.log('- Monitor the UI for real-time updates');

  } catch (error) {
    console.log('❌ Error activating follower broker:', error.message);
  }
}

activateFollowerBroker().catch(console.error); 