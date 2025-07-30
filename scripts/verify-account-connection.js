const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function verifyAccountConnection() {
  console.log('🔍 Verifying Account Connection...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const brokerId = 'f1bff339-23e2-4763-9aad-a3a02d18cf22';

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

    console.log('✅ Current Broker Account Configuration:');
    console.log('   ID:', brokerAccount.id);
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Broker:', brokerAccount.broker_name);
    console.log('   Profile ID:', brokerAccount.account_uid);
    console.log('   API Key Length:', brokerAccount.api_key?.length || 0);
    console.log('   API Secret Length:', brokerAccount.api_secret?.length || 0);

    console.log('\n🔍 Your ETHUSD Position Details:');
    console.log('   Symbol: ETHUSD');
    console.log('   Size: +0.01 ETH');
    console.log('   Side: Long (Buy)');
    console.log('   Profile ID where opened: 54678948');

    console.log('\n📋 Verification Steps:');
    console.log('1. ✅ Profile ID matches: Your position is in profile 54678948');
    console.log('2. ✅ Account is active: Broker account is active');
    console.log('3. ✅ API credentials: Present and valid length');
    console.log('4. ❓ Position format: Need to verify if ETHUSD is futures or spot');

    console.log('\n🔧 Possible Solutions:');

    console.log('\nOption 1: Check Position Format');
    console.log('   - Go to Delta Exchange');
    console.log('   - Check if ETHUSD is a futures contract (should show as ETH-PERP or similar)');
    console.log('   - If it\'s spot trading, the system only monitors futures positions');

    console.log('\nOption 2: Update Broker Account');
    console.log('   - Go to http://localhost:3000/connect-broker');
    console.log('   - Delete the current broker account');
    console.log('   - Create a new one with the same API credentials');
    console.log('   - Make sure to enter Profile ID: 54678948');

    console.log('\nOption 3: Check API Permissions');
    console.log('   - Go to Delta Exchange API settings');
    console.log('   - Ensure the API key has "Read" permissions for:');
    console.log('     * Positions');
    console.log('     * Fills');
    console.log('     * Orders');

    console.log('\nOption 4: Try Different Position');
    console.log('   - Open a position in BTC-PERP (futures)');
    console.log('   - Size: 0.01 BTC or larger');
    console.log('   - This should definitely be detected');

    console.log('\nOption 5: Manual Database Update');
    console.log('   - Go to Supabase Dashboard');
    console.log('   - Navigate to Table Editor > broker_accounts');
    console.log('   - Find the record with ID:', brokerId);
    console.log('   - Update account_uid to: 54678948');
    console.log('   - Save changes');

    console.log('\n📋 Quick Test:');
    console.log('1. Open a BTC-PERP position (0.01 BTC)');
    console.log('2. Wait 2-3 minutes');
    console.log('3. Check if it gets detected');
    console.log('4. If BTC works but ETH doesn\'t, it\'s a symbol format issue');

    console.log('\n💡 Most Likely Issue:');
    console.log('   ETHUSD might be a spot trading pair, but the system only monitors futures positions.');
    console.log('   Try opening a position in ETH-PERP (futures) instead of ETHUSD (spot).');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

verifyAccountConnection().catch(console.error); 