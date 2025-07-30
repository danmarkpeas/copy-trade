const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixEdgeFunction() {
  console.log('🔧 DIAGNOSING EDGE FUNCTION BOOT ERROR\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the most recent broker account
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    const brokerAccount = brokerAccounts[0];
    console.log('📋 BROKER ACCOUNT:');
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);
    console.log('   API Key:', brokerAccount.api_key);

    console.log('\n🔍 TESTING EDGE FUNCTION DEPLOYMENT...');

    // Test 1: Check if function exists
    console.log('1️⃣ Checking function deployment...');
    try {
      const { data: functions, error: functionsError } = await supabase.functions.list();
      
      if (functionsError) {
        console.log('❌ Error listing functions:', functionsError);
      } else {
        const realTimeFunction = functions.find(f => f.name === 'real-time-trade-monitor');
        if (realTimeFunction) {
          console.log('✅ Function found:', realTimeFunction.name);
          console.log('   Status:', realTimeFunction.status);
          console.log('   Version:', realTimeFunction.version);
        } else {
          console.log('❌ Function not found in list');
        }
      }
    } catch (error) {
      console.log('❌ Error checking functions:', error.message);
    }

    // Test 2: Try to invoke with minimal payload
    console.log('\n2️⃣ Testing function invocation...');
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke('real-time-trade-monitor', {
        body: { broker_id: brokerAccount.id }
      });

      if (invokeError) {
        console.log('❌ Function invocation failed:', invokeError);
        
        // Check if it's a boot error
        if (invokeError.message && invokeError.message.includes('BOOT_ERROR')) {
          console.log('\n🔧 BOOT ERROR DETECTED - POSSIBLE CAUSES:');
          console.log('1. TypeScript compilation errors');
          console.log('2. Missing dependencies');
          console.log('3. Environment variable issues');
          console.log('4. Deno runtime compatibility issues');
          
          console.log('\n🛠️ RECOMMENDED FIXES:');
          console.log('1. Check Supabase dashboard logs');
          console.log('2. Redeploy with verbose logging');
          console.log('3. Simplify the function temporarily');
        }
      } else {
        console.log('✅ Function invocation successful:', result);
      }
    } catch (error) {
      console.log('❌ Invocation error:', error.message);
    }

    // Test 3: Check environment variables
    console.log('\n3️⃣ Checking environment variables...');
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (value) {
        console.log(`✅ ${envVar}: Set (${value.substring(0, 10)}...)`);
      } else {
        console.log(`❌ ${envVar}: Missing`);
      }
    }

    // Test 4: Check Delta API configuration
    console.log('\n4️⃣ Checking Delta API configuration...');
    const deltaConfig = {
      apiKey: process.env.DELTA_API_KEY || brokerAccount.api_key,
      apiSecret: process.env.DELTA_API_SECRET || brokerAccount.api_secret,
      useTestnet: process.env.USE_TESTNET === 'true',
      baseUrl: process.env.DELTA_BASE_URL || 'https://api.delta.exchange'
    };

    console.log('   API Key:', deltaConfig.apiKey ? '✅ Set' : '❌ Missing');
    console.log('   API Secret:', deltaConfig.apiSecret ? '✅ Set' : '❌ Missing');
    console.log('   Testnet:', deltaConfig.useTestnet ? '✅ Enabled' : '❌ Disabled');
    console.log('   Base URL:', deltaConfig.baseUrl);

    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Check Supabase dashboard for function logs');
    console.log('2. Try redeploying: npx supabase functions deploy real-time-trade-monitor');
    console.log('3. Check if Docker is running (required for deployment)');
    console.log('4. Verify environment variables are set correctly');
    console.log('5. Test with a simpler function first');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

fixEdgeFunction().catch(console.error); 