const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function updateApiCredentials() {
  console.log('🔑 UPDATING API CREDENTIALS\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const brokerId = '332f4927-8f66-46a3-bb4f-252a8c5373e3';

    // Get current broker account details
    console.log('🔍 Getting current broker account details...');
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', brokerId)
      .single();

    if (brokerError || !brokerAccount) {
      console.log('❌ Error getting broker account:', brokerError?.message || 'Not found');
      return;
    }

    console.log('✅ Current Broker Account:');
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);
    console.log('   Status:', brokerAccount.account_status);
    console.log('   Verified:', brokerAccount.is_verified);
    console.log('   Active:', brokerAccount.is_active);
    console.log('   Current API Key Preview:', brokerAccount.api_key ? `${brokerAccount.api_key.substring(0, 10)}...` : 'Not set');
    console.log('   Current API Secret Preview:', brokerAccount.api_secret ? `${brokerAccount.api_secret.substring(0, 10)}...` : 'Not set');

    console.log('\n📋 TO UPDATE API CREDENTIALS:');
    console.log('1. Go to your Delta Exchange account');
    console.log('2. Generate new API key and secret');
    console.log('3. Make sure they have the required permissions:');
    console.log('   - Read positions');
    console.log('   - Read fills');
    console.log('   - Read orders');
    console.log('   - Trading (if you want to copy trades)');

    console.log('\n🔧 MANUAL UPDATE INSTRUCTIONS:');
    console.log('1. Go to: https://supabase.com/dashboard/project/urjgxetnqogwryhpafma/table-editor');
    console.log('2. Navigate to broker_accounts table');
    console.log('3. Find the record with ID: 332f4927-8f66-46a3-bb4f-252a8c5373e3');
    console.log('4. Update these fields:');
    console.log('   - api_key: Your new 30-character API key');
    console.log('   - api_secret: Your new 60-character API secret');
    console.log('   - is_verified: true');
    console.log('5. Save the changes');

    console.log('\n🌐 EASIER METHOD:');
    console.log('1. Go to: http://localhost:3000/connect-broker');
    console.log('2. Delete the current broker account');
    console.log('3. Add a new broker account with valid credentials');
    console.log('4. This will automatically update the database');

    console.log('\n💡 API CREDENTIALS FORMAT:');
    console.log('- API Key: Should be exactly 30 characters long');
    console.log('- API Secret: Should be exactly 60 characters long');
    console.log('- Both should be alphanumeric strings');
    console.log('- Example format:');
    console.log('  API Key:  abcdefghijklmnopqrstuvwxyz1234');
    console.log('  API Secret: abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz123456');

    console.log('\n🎯 AFTER UPDATING:');
    console.log('1. Run: node scripts/test-delta-api-direct.js');
    console.log('2. Check if API calls work');
    console.log('3. Open a position to test detection');
    console.log('4. Monitor the trades page for copy trades');

    console.log('\n❓ NEED HELP?');
    console.log('If you need help with the update process, please:');
    console.log('1. Generate new API credentials from Delta Exchange');
    console.log('2. Use the connect-broker page to reconnect');
    console.log('3. Or provide the new credentials for manual update');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

updateApiCredentials().catch(console.error); 