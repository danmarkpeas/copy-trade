const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBrokerAuth() {
  console.log('🔍 CHECKING BROKER AUTHENTICATION STATUS');
  console.log('=====================================\n');

  try {
    // Get all broker accounts
    const { data: brokers, error } = await supabase
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
      `)
      .eq('account_status', 'active');

    if (error) {
      console.error('❌ Error fetching broker accounts:', error);
      return;
    }

    console.log(`📊 Found ${brokers.length} active broker accounts\n`);

    for (const broker of brokers) {
      console.log(`🏦 BROKER: ${broker.account_name}`);
      console.log(`   User: ${broker.users.email}`);
      console.log(`   API Key: ${broker.api_key.substring(0, 8)}...`);
      console.log(`   API Secret: ${broker.api_secret ? '✅ Set' : '❌ Missing'}`);
      console.log(`   Status: ${broker.account_status}`);
      console.log(`   Verified: ${broker.is_verified ? '✅ Yes' : '❌ No'}`);
      
      // Check if API key looks like test credentials
      const isTestKey = broker.api_key.includes('test') || 
                       broker.api_key.length < 20 ||
                       broker.api_key.startsWith('cuwbQBcYN2');
      
      if (isTestKey) {
        console.log(`   ⚠️  WARNING: This appears to be a test API key`);
        console.log(`   💡 Solution: Update with real Delta Exchange API credentials`);
      }
      
      console.log('');
    }

    // Check if any brokers have real API keys
    const realBrokers = brokers.filter(broker => {
      return !broker.api_key.includes('test') && 
             broker.api_key.length >= 20 &&
             !broker.api_key.startsWith('cuwbQBcYN2');
    });

    if (realBrokers.length === 0) {
      console.log('❌ PROBLEM IDENTIFIED:');
      console.log('   All broker accounts are using test API keys');
      console.log('   This is why WebSocket authentication is failing');
      console.log('   The system cannot detect trades with invalid credentials\n');
      
      console.log('🔧 SOLUTION:');
      console.log('   1. Get real API keys from Delta Exchange');
      console.log('   2. Update broker accounts in the database');
      console.log('   3. Restart the copy trading system');
    } else {
      console.log('✅ Found brokers with real API keys');
      console.log('   The authentication issue might be temporary');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkBrokerAuth(); 