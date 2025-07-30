const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkProfileMismatch() {
  console.log('🔍 Checking Profile ID Mismatch...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const brokerId = 'f1bff339-23e2-4763-9aad-a3a02d18cf22';
    const yourProfileId = '54678948';

    // Get broker account details
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', brokerId)
      .single();

    if (brokerError) {
      console.log('❌ Error getting broker account:', brokerError.message);
      return;
    }

    console.log('✅ Current broker account configuration:');
    console.log('   ID:', brokerAccount.id);
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Broker:', brokerAccount.broker_name);
    console.log('   Connected Profile ID:', brokerAccount.account_uid || 'Not set');
    console.log('   Your Position Profile ID:', yourProfileId);

    console.log('\n🔍 Analysis:');
    if (brokerAccount.account_uid === yourProfileId) {
      console.log('   ✅ Profile IDs match! The system should detect your position.');
    } else {
      console.log('   ❌ Profile ID mismatch!');
      console.log('   💡 Your position is in profile:', yourProfileId);
      console.log('   💡 System is monitoring profile:', brokerAccount.account_uid || 'None');
      console.log('   💡 This is why no trades are being detected');
    }

    // Check all broker accounts to see if any match your profile
    console.log('\n🔍 Checking all broker accounts...');
    const { data: allBrokers, error: allBrokersError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('broker_name', 'delta');

    if (allBrokersError) {
      console.log('❌ Error getting all brokers:', allBrokersError.message);
    } else {
      console.log(`✅ Found ${allBrokers?.length || 0} Delta Exchange broker accounts:`);
      if (allBrokers && allBrokers.length > 0) {
        allBrokers.forEach((broker, index) => {
          console.log(`   ${index + 1}. ${broker.account_name} (${broker.id})`);
          console.log(`      Profile ID: ${broker.account_uid || 'Not set'}`);
          console.log(`      Active: ${broker.is_active}`);
          if (broker.account_uid === yourProfileId) {
            console.log(`      🎯 MATCHES YOUR PROFILE!`);
          }
        });
      }
    }

    console.log('\n🔧 Solutions:');

    if (brokerAccount.account_uid === yourProfileId) {
      console.log('   ✅ Profile IDs already match - check other issues');
    } else {
      console.log('   Option 1: Update the current broker account profile ID');
      console.log(`      SQL: UPDATE broker_accounts SET account_uid = '${yourProfileId}' WHERE id = '${brokerId}';`);
      
      console.log('\n   Option 2: Create a new broker account with the correct profile ID');
      console.log('      Go to http://localhost:3000/connect-broker');
      console.log('      Enter the same API credentials but with Profile ID: ' + yourProfileId);
      
      console.log('\n   Option 3: Update via Supabase Dashboard');
      console.log('      1. Go to your Supabase dashboard');
      console.log('      2. Navigate to Table Editor > broker_accounts');
      console.log('      3. Find the record with ID: ' + brokerId);
      console.log('      4. Update the account_uid field to: ' + yourProfileId);
      console.log('      5. Save the changes');
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Update the profile ID to match your position');
    console.log('2. Wait for the next real-time monitor cycle');
    console.log('3. Your position should be detected and copied');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkProfileMismatch().catch(console.error); 