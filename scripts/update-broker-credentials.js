const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function updateBrokerCredentials() {
  console.log('🔧 Broker Credentials Update Tool\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the broker account being used by the real-time monitor
    const brokerId = 'f1bff339-23e2-4763-9aad-a3a02d18cf22';
    
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', brokerId)
      .single();

    if (brokerError) {
      console.log('❌ Error getting broker account:', brokerError.message);
      return;
    }

    console.log('✅ Current broker account:');
    console.log('   ID:', brokerAccount.id);
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Broker:', brokerAccount.broker_name);
    console.log('   Current API Key:', brokerAccount.api_key ? 'Present' : 'Missing');
    console.log('   Current API Secret:', brokerAccount.api_secret ? 'Present' : 'Missing');

    if (brokerAccount.api_key) {
      console.log('   API Key Preview:', brokerAccount.api_key.substring(0, 10) + '...' + brokerAccount.api_key.substring(brokerAccount.api_key.length - 10));
    }

    console.log('\n📋 Instructions:');
    console.log('1. Go to Delta Exchange and get your API credentials');
    console.log('2. Make sure the API key has these permissions:');
    console.log('   - Read permissions for positions, fills, orders');
    console.log('   - Trading permissions (if you want to copy trades)');
    console.log('3. Enter the new credentials below');

    // For now, we'll provide a template for manual update
    console.log('\n🔧 To update credentials manually:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Table Editor > broker_accounts');
    console.log('3. Find the record with ID:', brokerId);
    console.log('4. Update the api_key and api_secret fields');
    console.log('5. Save the changes');

    console.log('\n🔧 Or use this SQL command (replace with your actual credentials):');
    console.log(`UPDATE broker_accounts SET api_key = 'YOUR_NEW_API_KEY', api_secret = 'YOUR_NEW_API_SECRET' WHERE id = '${brokerId}';`);

    console.log('\n⚠️ Important:');
    console.log('- Make sure your API key has the right permissions');
    console.log('- The API key should be 30 characters long');
    console.log('- The API secret should be 60 characters long');
    console.log('- After updating, test the API again');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }

  console.log('\n📋 After updating credentials:');
  console.log('1. Run: node scripts/test-delta-with-credentials.js');
  console.log('2. Check if the API works correctly');
  console.log('3. Open a position in Delta Exchange');
  console.log('4. Check if the system detects and copies the trade');
}

updateBrokerCredentials().catch(console.error); 