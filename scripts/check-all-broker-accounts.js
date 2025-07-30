const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkAllBrokerAccounts() {
  console.log('🔍 Checking All Broker Accounts...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get all broker accounts
    const { data: allBrokers, error: brokersError } = await supabase
      .from('broker_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (brokersError) {
      console.log('❌ Error getting broker accounts:', brokersError.message);
      return;
    }

    console.log(`✅ Found ${allBrokers?.length || 0} broker accounts:`);
    
    if (allBrokers && allBrokers.length > 0) {
      allBrokers.forEach((broker, index) => {
        console.log(`\n${index + 1}. ${broker.account_name} (${broker.id})`);
        console.log(`   Broker: ${broker.broker_name}`);
        console.log(`   Profile ID: ${broker.account_uid || 'Not set'}`);
        console.log(`   Active: ${broker.is_active}`);
        console.log(`   API Key Length: ${broker.api_key?.length || 0}`);
        console.log(`   API Secret Length: ${broker.api_secret?.length || 0}`);
        console.log(`   Created: ${broker.created_at}`);
        console.log(`   Updated: ${broker.updated_at}`);
        
        if (broker.account_uid === '54678948') {
          console.log(`   🎯 MATCHES YOUR PROFILE!`);
        }
      });
    } else {
      console.log('   No broker accounts found');
    }

    // Check which broker account is being used by the real-time monitor
    console.log('\n🔍 Current Active Broker Account:');
    const activeBroker = allBrokers?.find(broker => broker.is_active);
    
    if (activeBroker) {
      console.log(`   ID: ${activeBroker.id}`);
      console.log(`   Name: ${activeBroker.account_name}`);
      console.log(`   Profile ID: ${activeBroker.account_uid}`);
      console.log(`   API Key Preview: ${activeBroker.api_key?.substring(0, 10)}...`);
      console.log(`   API Secret Preview: ${activeBroker.api_secret?.substring(0, 10)}...`);
    } else {
      console.log('   No active broker account found');
    }

    // Check if there are multiple accounts with the same profile ID
    console.log('\n🔍 Profile ID Analysis:');
    const profileGroups = {};
    allBrokers?.forEach(broker => {
      const profileId = broker.account_uid || 'unknown';
      if (!profileGroups[profileId]) {
        profileGroups[profileId] = [];
      }
      profileGroups[profileId].push(broker);
    });

    Object.entries(profileGroups).forEach(([profileId, brokers]) => {
      console.log(`   Profile ${profileId}: ${brokers.length} account(s)`);
      brokers.forEach(broker => {
        console.log(`     - ${broker.account_name} (${broker.id}) - Active: ${broker.is_active}`);
      });
    });

    console.log('\n💡 Recommendations:');
    
    if (allBrokers && allBrokers.length > 1) {
      console.log('1. Multiple broker accounts detected');
      console.log('2. Check if the correct account is active');
      console.log('3. Consider deleting duplicate accounts');
    }

    const targetProfile = '54678948';
    const matchingBrokers = allBrokers?.filter(broker => broker.account_uid === targetProfile);
    
    if (matchingBrokers && matchingBrokers.length > 0) {
      console.log(`4. Found ${matchingBrokers.length} account(s) matching your profile (${targetProfile})`);
      matchingBrokers.forEach(broker => {
        console.log(`   - ${broker.account_name} (${broker.id}) - Active: ${broker.is_active}`);
      });
    } else {
      console.log(`4. No accounts found matching your profile (${targetProfile})`);
      console.log('   You may need to update the profile ID or create a new account');
    }

    console.log('\n🔧 Quick Fix Options:');
    console.log('1. Update profile ID: Go to Supabase and update account_uid to 54678948');
    console.log('2. Create new account: Go to /connect-broker and create fresh account');
    console.log('3. Refresh credentials: Update API key/secret in existing account');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkAllBrokerAccounts().catch(console.error); 