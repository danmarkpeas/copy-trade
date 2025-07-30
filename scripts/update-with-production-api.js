const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateWithProductionAPI() {
  console.log('🔑 UPDATING WITH DELTA EXCHANGE PRODUCTION API KEYS');
  console.log('==================================================\n');

  console.log('🌐 API Endpoint: https://api.india.delta.exchange ✅');
  console.log('🔐 Signature Format: method + timestamp + requestPath + queryParams + body ✅\n');

  try {
    // Get all broker accounts
    const { data: brokers, error } = await supabase
      .from('broker_accounts')
      .select('id, account_name, api_key, account_status, user_id');

    if (error) {
      console.error('❌ Error fetching broker accounts:', error);
      return;
    }

    if (!brokers || brokers.length === 0) {
      console.log('❌ No broker accounts found in database');
      console.log('💡 Please create broker accounts first through the frontend');
      return;
    }

    console.log(`📊 Found ${brokers.length} broker account(s):\n`);

    brokers.forEach((broker, index) => {
      console.log(`${index + 1}. ${broker.account_name} (${broker.account_status})`);
      console.log(`   Current API Key: ${broker.api_key.substring(0, 8)}...`);
      
      // Check if using test keys
      const isTestKey = broker.api_key.includes('test') || 
                       broker.api_key.startsWith('cuwbQBcYN2') ||
                       broker.api_key.length < 20;
      
      if (isTestKey) {
        console.log(`   ⚠️  STATUS: Using test API key (needs update)`);
      } else {
        console.log(`   ✅ STATUS: Using production API key`);
      }
      console.log('');
    });

    console.log('🔧 UPDATE METHODS:');
    console.log('==================\n');

    console.log('Method 1: Frontend Update (Recommended)');
    console.log('----------------------------------------');
    console.log('1. Open http://localhost:3000');
    console.log('2. Login with your account');
    console.log('3. Go to Broker Accounts page');
    console.log('4. Edit each broker account');
    console.log('5. Replace API keys with your real Delta Exchange credentials');
    console.log('6. Save changes\n');

    console.log('Method 2: Direct Database Update');
    console.log('--------------------------------');
    console.log('1. Access your Supabase database');
    console.log('2. Go to broker_accounts table');
    console.log('3. Update api_key and api_secret fields');
    console.log('4. Set account_status to "active"\n');

    console.log('Method 3: Environment Variables');
    console.log('-------------------------------');
    console.log('1. Create a .env file in the project root');
    console.log('2. Add your API keys:');
    console.log('   DELTA_API_KEY=your_api_key_here');
    console.log('   DELTA_API_SECRET=your_api_secret_here');
    console.log('3. Restart the system\n');

    console.log('📝 REQUIRED INFORMATION:');
    console.log('========================');
    console.log('• Delta Exchange API Key (from your Delta Exchange account)');
    console.log('• Delta Exchange API Secret (from your Delta Exchange account)');
    console.log('• Account Name (can keep existing names like "Master Blaster")\n');

    console.log('⚠️  SECURITY NOTES:');
    console.log('==================');
    console.log('• Never share your API keys');
    console.log('• Use API keys with trading permissions only');
    console.log('• Consider using API keys with limited permissions for safety');
    console.log('• Make sure your Delta Exchange account has sufficient balance\n');

    console.log('🚀 AFTER UPDATING:');
    console.log('==================');
    console.log('1. Restart the copy trading system: npm run server');
    console.log('2. Check authentication status: npm run monitor');
    console.log('3. Test with a small trade on your Delta Exchange account');
    console.log('4. Watch followers automatically copy your trade\n');

    console.log('💡 TROUBLESHOOTING:');
    console.log('==================');
    console.log('• If you get "InvalidSignature" errors: Check your API key/secret');
    console.log('• If you get "bad_schema" errors: Check your API permissions');
    console.log('• If you get "insufficient_margin" errors: Add funds to follower accounts');
    console.log('• Ensure your API keys have trading permissions\n');

    // Count test vs production keys
    const testBrokers = brokers.filter(broker => 
      broker.api_key.includes('test') || 
      broker.api_key.startsWith('cuwbQBcYN2') ||
      broker.api_key.length < 20
    );

    const productionBrokers = brokers.filter(broker => 
      !broker.api_key.includes('test') && 
      !broker.api_key.startsWith('cuwbQBcYN2') &&
      broker.api_key.length >= 20
    );

    console.log('📊 CURRENT STATUS:');
    console.log('==================');
    console.log(`• Test API Keys: ${testBrokers.length}`);
    console.log(`• Production API Keys: ${productionBrokers.length}`);
    
    if (testBrokers.length > 0) {
      console.log('\n❌ ACTION REQUIRED:');
      console.log(`   ${testBrokers.length} broker account(s) need real API keys`);
      console.log('   This is why you see "InvalidSignature" errors in the logs');
    } else {
      console.log('\n✅ All broker accounts have production API keys');
    }

    console.log('\n🎯 READY TO UPDATE?');
    console.log('Open http://localhost:3000 and update your broker accounts now!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateWithProductionAPI(); 