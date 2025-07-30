const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function quickAPIUpdate() {
  console.log('🔑 QUICK API KEY UPDATE');
  console.log('=======================\n');

  try {
    // Get all broker accounts
    const { data: brokers, error } = await supabase
      .from('broker_accounts')
      .select('id, account_name, api_key, account_status');

    if (error) {
      console.error('❌ Error fetching broker accounts:', error);
      rl.close();
      return;
    }

    if (!brokers || brokers.length === 0) {
      console.log('❌ No broker accounts found');
      console.log('💡 Please create broker accounts first through the frontend');
      rl.close();
      return;
    }

    console.log(`📊 Found ${brokers.length} broker account(s):\n`);

    brokers.forEach((broker, index) => {
      console.log(`${index + 1}. ${broker.account_name} (${broker.account_status})`);
      console.log(`   Current API Key: ${broker.api_key.substring(0, 8)}...`);
      console.log('');
    });

    console.log('🔧 UPDATE INSTRUCTIONS:');
    console.log('=======================');
    console.log('');
    console.log('To update your broker accounts with real Delta Exchange API keys:');
    console.log('');
    console.log('1. Go to http://localhost:3000');
    console.log('2. Login with your account');
    console.log('3. Navigate to Broker Accounts page');
    console.log('4. Edit each broker account');
    console.log('5. Replace the API keys with your real Delta Exchange credentials');
    console.log('');
    console.log('📝 REQUIRED INFORMATION:');
    console.log('   - Delta Exchange API Key');
    console.log('   - Delta Exchange API Secret');
    console.log('');
    console.log('⚠️  SECURITY NOTES:');
    console.log('   - Never share your API keys');
    console.log('   - Use API keys with trading permissions only');
    console.log('   - Consider using API keys with limited permissions for safety');
    console.log('');
    console.log('🚀 AFTER UPDATING:');
    console.log('1. Restart the copy trading system: npm run server');
    console.log('2. Test with a small trade');
    console.log('3. Monitor the results');
    console.log('');
    console.log('💡 TROUBLESHOOTING:');
    console.log('   - If you get "InvalidSignature" errors, check your API key/secret');
    console.log('   - If you get "bad_schema" errors, check your API permissions');
    console.log('   - Make sure your Delta Exchange account has sufficient balance');

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

    console.log('\n🎯 READY TO UPDATE?');
    console.log('Open http://localhost:3000 and update your broker accounts now!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
  }
}

quickAPIUpdate(); 