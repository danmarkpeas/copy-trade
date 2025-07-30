const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkApiCredentials() {
  console.log('🔑 CHECKING API CREDENTIALS\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const brokerId = '332f4927-8f66-46a3-bb4f-252a8c5373e3';

    // Get broker account details
    console.log('🔍 Getting broker account details...');
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', brokerId)
      .single();

    if (brokerError || !brokerAccount) {
      console.log('❌ Error getting broker account:', brokerError?.message || 'Not found');
      return;
    }

    console.log('✅ Broker Account Found:');
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);
    console.log('   Status:', brokerAccount.account_status);
    console.log('   Verified:', brokerAccount.is_verified);
    console.log('   Active:', brokerAccount.is_active);
    console.log('   API Key Length:', brokerAccount.api_key?.length || 0);
    console.log('   API Secret Length:', brokerAccount.api_secret?.length || 0);
    console.log('   API Key Preview:', brokerAccount.api_key ? `${brokerAccount.api_key.substring(0, 10)}...` : 'Not set');
    console.log('   API Secret Preview:', brokerAccount.api_secret ? `${brokerAccount.api_secret.substring(0, 10)}...` : 'Not set');

    // Test the current credentials
    console.log('\n🔑 Testing current API credentials...');
    try {
      const serverTime = Math.floor(Date.now() / 1000) + 1;
      const message = `${serverTime}GET/v2/fills`;
      
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', brokerAccount.api_secret)
        .update(message)
        .digest('hex');

      const fillsResponse = await fetch('https://api.delta.exchange/v2/fills', {
        method: 'GET',
        headers: {
          'api-key': brokerAccount.api_key,
          'timestamp': serverTime.toString(),
          'signature': signature,
        }
      });

      if (fillsResponse.ok) {
        console.log('✅ API credentials are working!');
        const fillsData = await fillsResponse.json();
        console.log('   Total fills:', fillsData.result?.length || 0);
      } else {
        const errorText = await fillsResponse.text();
        console.log('❌ API credentials failed:', errorText);
        
        if (errorText.includes('invalid_api_key')) {
          console.log('\n🚨 ISSUE IDENTIFIED: Invalid API Key');
          console.log('   The stored API credentials are incorrect or expired.');
          console.log('   You need to update them with valid Delta Exchange API credentials.');
        }
      }
    } catch (error) {
      console.log('❌ Error testing API credentials:', error.message);
    }

    // Check if there are other broker accounts
    console.log('\n🔍 Checking for other broker accounts...');
    const { data: allBrokerAccounts, error: allAccountsError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true);

    if (allAccountsError) {
      console.log('❌ Error getting all broker accounts:', allAccountsError.message);
    } else {
      console.log(`✅ Found ${allBrokerAccounts?.length || 0} active broker accounts:`);
      allBrokerAccounts?.forEach((account, index) => {
        console.log(`   ${index + 1}. ${account.account_name} (${account.account_uid})`);
        console.log(`      Status: ${account.account_status}`);
        console.log(`      API Key Length: ${account.api_key?.length || 0}`);
        console.log(`      API Secret Length: ${account.api_secret?.length || 0}`);
      });
    }

    console.log('\n🚨 SOLUTION: Update API Credentials');
    console.log('The API credentials stored in the database are invalid.');
    console.log('You need to update them with valid Delta Exchange API credentials.');

    console.log('\n📋 STEPS TO FIX:');
    console.log('1. Go to your Delta Exchange account');
    console.log('2. Generate new API key and secret');
    console.log('3. Update the broker account in the database');
    console.log('4. Or use the connect-broker page to reconnect');

    console.log('\n🔧 MANUAL UPDATE (if needed):');
    console.log('You can manually update the credentials in Supabase:');
    console.log('1. Go to: https://supabase.com/dashboard/project/urjgxetnqogwryhpafma/table-editor');
    console.log('2. Navigate to broker_accounts table');
    console.log('3. Find the record with ID: 332f4927-8f66-46a3-bb4f-252a8c5373e3');
    console.log('4. Update api_key and api_secret fields');
    console.log('5. Set is_verified to true');

    console.log('\n🌐 EASIER METHOD:');
    console.log('1. Go to: http://localhost:3000/connect-broker');
    console.log('2. Delete the current broker account');
    console.log('3. Add a new broker account with valid credentials');
    console.log('4. This will automatically update the database');

    console.log('\n💡 API CREDENTIALS REQUIREMENTS:');
    console.log('- API Key: Should be 30 characters long');
    console.log('- API Secret: Should be 60 characters long');
    console.log('- Both should be generated from Delta Exchange dashboard');
    console.log('- Make sure they have trading permissions');

    console.log('\n🎯 EXPECTED RESULT:');
    console.log('Once you update the credentials:');
    console.log('✅ API calls will work');
    console.log('✅ Positions will be detected');
    console.log('✅ Copy trading will function');
    console.log('✅ Real-time monitoring will work');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkApiCredentials().catch(console.error); 