const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateBrokerAPIKeys() {
  console.log('🔑 UPDATING BROKER API KEYS WITH REAL DELTA EXCHANGE CREDENTIALS');
  console.log('================================================================\n');

  try {
    // Get existing broker accounts
    const { data: brokers, error } = await supabase
      .from('broker_accounts')
      .select('id, account_name, api_key, account_status')
      .eq('account_status', 'active');

    if (error) {
      console.error('❌ Error fetching broker accounts:', error);
      return;
    }

    if (!brokers || brokers.length === 0) {
      console.log('❌ No active broker accounts found');
      console.log('💡 Please create broker accounts first through the frontend');
      return;
    }

    console.log(`📊 Found ${brokers.length} active broker accounts:\n`);

    brokers.forEach((broker, index) => {
      console.log(`${index + 1}. ${broker.account_name}`);
      console.log(`   Current API Key: ${broker.api_key.substring(0, 8)}...`);
      console.log(`   Status: ${broker.account_status}`);
      console.log('');
    });

    console.log('🔧 UPDATE OPTIONS:');
    console.log('==================');
    console.log('');
    console.log('Option 1: Update through Frontend (Recommended)');
    console.log('   - Go to http://localhost:3000');
    console.log('   - Login with your account');
    console.log('   - Navigate to Broker Accounts page');
    console.log('   - Edit the existing broker accounts');
    console.log('   - Replace the API keys with your real Delta Exchange credentials');
    console.log('');
    console.log('Option 2: Direct Database Update');
    console.log('   - You can update the database directly with your API keys');
    console.log('   - This requires your Delta Exchange API key and secret');
    console.log('');
    console.log('Option 3: Environment Variables');
    console.log('   - Create a .env file with your API keys');
    console.log('   - The system will use them automatically');
    console.log('');

    console.log('📝 REQUIRED INFORMATION:');
    console.log('   - Delta Exchange API Key');
    console.log('   - Delta Exchange API Secret');
    console.log('   - Account Name (optional, can keep existing)');
    console.log('');

    console.log('⚠️  SECURITY NOTES:');
    console.log('   - Never share your API keys');
    console.log('   - Use API keys with trading permissions only');
    console.log('   - Consider using API keys with limited permissions for safety');
    console.log('');

    console.log('🚀 NEXT STEPS:');
    console.log('1. Choose your preferred update method above');
    console.log('2. Update the broker accounts with your real API keys');
    console.log('3. Restart the copy trading system: npm run server');
    console.log('4. Test with a small trade');
    console.log('');

    console.log('💡 TROUBLESHOOTING:');
    console.log('   - If you get "InvalidSignature" errors, check your API key/secret');
    console.log('   - If you get "bad_schema" errors, check your API permissions');
    console.log('   - Make sure your Delta Exchange account has sufficient balance');
    console.log('   - Ensure your API keys have trading permissions');

    // Check if any brokers are using test keys
    const testBrokers = brokers.filter(broker => 
      broker.api_key.includes('test') || 
      broker.api_key.startsWith('cuwbQBcYN2') ||
      broker.api_key.length < 20
    );

    if (testBrokers.length > 0) {
      console.log('\n❌ ISSUE IDENTIFIED:');
      console.log(`   ${testBrokers.length} broker account(s) are using test API keys`);
      console.log('   This is why you see "InvalidSignature" errors in the logs');
      console.log('   You need to update these with your real Delta Exchange API keys');
    } else {
      console.log('\n✅ All broker accounts appear to have valid API keys');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateBrokerAPIKeys(); 