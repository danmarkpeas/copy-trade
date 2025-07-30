const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBrokerAccounts() {
  console.log('🔧 FIXING BROKER ACCOUNTS');
  console.log('========================\n');

  try {
    // Get all broker accounts (not just active ones)
    const { data: allBrokers, error } = await supabase
      .from('broker_accounts')
      .select(`
        id,
        broker_name,
        account_name,
        api_key,
        api_secret,
        account_status,
        is_verified,
        user_id,
        users!inner(email)
      `);

    if (error) {
      console.error('❌ Error fetching broker accounts:', error);
      return;
    }

    console.log(`📊 Found ${allBrokers.length} total broker accounts\n`);

    if (allBrokers.length === 0) {
      console.log('❌ No broker accounts found in database');
      console.log('💡 You need to create broker accounts first');
      return;
    }

    // Show all broker accounts
    for (const broker of allBrokers) {
      console.log(`🏦 BROKER: ${broker.account_name}`);
      console.log(`   User: ${broker.users.email}`);
      console.log(`   Status: ${broker.account_status}`);
      console.log(`   API Key: ${broker.api_key ? broker.api_key.substring(0, 8) + '...' : '❌ Missing'}`);
      console.log(`   API Secret: ${broker.api_secret ? '✅ Set' : '❌ Missing'}`);
      console.log(`   Verified: ${broker.is_verified ? '✅ Yes' : '❌ No'}`);
      console.log('');
    }

    // Check if any are active
    const activeBrokers = allBrokers.filter(b => b.account_status === 'active');
    console.log(`📈 Active brokers: ${activeBrokers.length}/${allBrokers.length}`);

    if (activeBrokers.length === 0) {
      console.log('\n🔧 FIXING: Setting broker accounts to active...');
      
      // Set all broker accounts to active
      const { error: updateError } = await supabase
        .from('broker_accounts')
        .update({ account_status: 'active' })
        .neq('id', null);

      if (updateError) {
        console.error('❌ Error updating broker accounts:', updateError);
        return;
      }

      console.log('✅ All broker accounts set to active');
    }

    // Check if any have valid API keys
    const validBrokers = allBrokers.filter(broker => {
      return broker.api_key && 
             broker.api_key.length >= 20 &&
             !broker.api_key.includes('test') &&
             !broker.api_key.startsWith('cuwbQBcYN2');
    });

    console.log(`\n🔑 Valid API keys: ${validBrokers.length}/${allBrokers.length}`);

    if (validBrokers.length === 0) {
      console.log('\n❌ CRITICAL ISSUE:');
      console.log('   All broker accounts have invalid/test API keys');
      console.log('   This is why WebSocket authentication fails');
      console.log('   The system cannot detect trades without valid credentials\n');
      
      console.log('🔧 IMMEDIATE SOLUTION:');
      console.log('   1. Get real API keys from Delta Exchange');
      console.log('   2. Update the broker accounts in the database');
      console.log('   3. Restart the copy trading system');
      
      console.log('\n📋 To update broker accounts:');
      console.log('   - Go to http://localhost:3000');
      console.log('   - Login and go to Broker Accounts page');
      console.log('   - Update API keys with real Delta Exchange credentials');
    } else {
      console.log('✅ Found brokers with valid API keys');
      console.log('   The system should work once restarted');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixBrokerAccounts(); 