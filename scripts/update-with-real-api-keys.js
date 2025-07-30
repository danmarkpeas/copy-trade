const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateWithRealAPIKeys() {
  console.log('🔑 UPDATING WITH REAL DELTA EXCHANGE API KEYS');
  console.log('=============================================\n');

  console.log('📋 INSTRUCTIONS:');
  console.log('1. You need to provide your Delta Exchange API keys');
  console.log('2. The system will create a broker account with your credentials');
  console.log('3. This will enable real copy trading functionality\n');

  console.log('🔧 SETUP OPTIONS:');
  console.log('Option 1: Update through Frontend (Recommended)');
  console.log('   - Go to http://localhost:3000');
  console.log('   - Login and go to Broker Accounts page');
  console.log('   - Add your Delta Exchange API keys there\n');

  console.log('Option 2: Manual Database Update');
  console.log('   - You can manually update the database with your API keys');
  console.log('   - This requires direct database access\n');

  console.log('Option 3: Use Environment Variables');
  console.log('   - Create a .env file with your API keys');
  console.log('   - The system will use them automatically\n');

  console.log('📝 REQUIRED API CREDENTIALS:');
  console.log('   - API Key: Your Delta Exchange API key');
  console.log('   - API Secret: Your Delta Exchange API secret');
  console.log('   - Account Name: A name for your broker account (e.g., "My Delta Account")');

  console.log('\n⚠️  SECURITY NOTES:');
  console.log('   - Never share your API keys');
  console.log('   - Use API keys with trading permissions only');
  console.log('   - Consider using API keys with limited permissions for safety');

  console.log('\n🚀 NEXT STEPS:');
  console.log('1. Choose your preferred setup method above');
  console.log('2. Add your Delta Exchange API credentials');
  console.log('3. Restart the copy trading system');
  console.log('4. Test with a small trade');

  console.log('\n💡 TROUBLESHOOTING:');
  console.log('   - If you get "InvalidSignature" errors, check your API key/secret');
  console.log('   - If you get "bad_schema" errors, check your API permissions');
  console.log('   - Make sure your Delta Exchange account has sufficient balance');

  // Check if there are any existing broker accounts
  const { data: existingBrokers } = await supabase
    .from('broker_accounts')
    .select('id, account_name, api_key');

  if (existingBrokers && existingBrokers.length > 0) {
    console.log('\n📊 EXISTING BROKER ACCOUNTS:');
    existingBrokers.forEach(broker => {
      console.log(`   - ${broker.account_name} (API Key: ${broker.api_key.substring(0, 8)}...)`);
    });
    console.log('\n💡 You can update these existing accounts with your real API keys');
  } else {
    console.log('\n📊 No existing broker accounts found');
    console.log('💡 You need to create new broker accounts with your API keys');
  }
}

updateWithRealAPIKeys(); 