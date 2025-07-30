const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkApiStatus() {
  console.log('🔍 CHECKING API KEY STATUS\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
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
    console.log('📋 BROKER ACCOUNT DETAILS:');
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);
    console.log('   API Key:', brokerAccount.api_key);
    console.log('   API Secret Length:', brokerAccount.api_secret?.length || 0);
    console.log('   Status:', brokerAccount.account_status);
    console.log('   Verified:', brokerAccount.is_verified);
    console.log('   Created:', brokerAccount.created_at);

    // Test different signature formats
    console.log('\n🔐 TESTING DIFFERENT SIGNATURE FORMATS...');
    const crypto = require('crypto');
    const serverTime = Math.floor(Date.now() / 1000) + 1;

    const testCases = [
      {
        name: 'Standard Format (timestamp + method + endpoint)',
        message: `${serverTime}GET/v2/fills`,
        description: 'Most common format'
      },
      {
        name: 'Alternative Format (method + endpoint + timestamp)',
        message: `GET/v2/fills${serverTime}`,
        description: 'Alternative format'
      },
      {
        name: 'Simple Format (endpoint + timestamp)',
        message: `/v2/fills${serverTime}`,
        description: 'Simplified format'
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);
      
      const signature = crypto.createHmac('sha256', brokerAccount.api_secret).update(testCase.message).digest('hex');
      
      try {
        const response = await fetch('https://api.delta.exchange/v2/fills', {
          method: 'GET',
          headers: {
            'api-key': brokerAccount.api_key,
            'timestamp': serverTime.toString(),
            'signature': signature,
          }
        });

        console.log(`   Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ SUCCESS! Found ${data.result?.length || 0} fills`);
          console.log(`   🎉 Working signature format: ${testCase.name}`);
          return; // Exit on success
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Failed: ${errorText}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // Test with Delta server time
    console.log('\n🕐 TESTING WITH DELTA SERVER TIME...');
    try {
      const timeResponse = await fetch('https://api.delta.exchange/v2/time');
      if (timeResponse.ok) {
        const timeData = await timeResponse.json();
        const deltaTime = timeData.result.server_time;
        console.log(`   Delta server time: ${deltaTime}`);
        console.log(`   Local time: ${Math.floor(Date.now() / 1000)}`);
        console.log(`   Time difference: ${Math.floor(Date.now() / 1000) - deltaTime} seconds`);

        // Test with Delta server time
        const deltaMessage = `${deltaTime}GET/v2/fills`;
        const deltaSignature = crypto.createHmac('sha256', brokerAccount.api_secret).update(deltaMessage).digest('hex');

        const deltaResponse = await fetch('https://api.delta.exchange/v2/fills', {
          method: 'GET',
          headers: {
            'api-key': brokerAccount.api_key,
            'timestamp': deltaTime.toString(),
            'signature': deltaSignature,
          }
        });

        console.log(`   Status with Delta time: ${deltaResponse.status}`);
        
        if (deltaResponse.ok) {
          const data = await deltaResponse.json();
          console.log(`   ✅ SUCCESS with Delta server time! Found ${data.result?.length || 0} fills`);
          return;
        } else {
          const errorText = await deltaResponse.text();
          console.log(`   ❌ Failed with Delta time: ${errorText}`);
        }
      } else {
        console.log('   ❌ Could not get Delta server time');
      }
    } catch (error) {
      console.log(`   ❌ Error getting Delta time: ${error.message}`);
    }

    // Test products endpoint (usually doesn't require authentication)
    console.log('\n📊 TESTING PRODUCTS ENDPOINT...');
    try {
      const productsResponse = await fetch('https://api.delta.exchange/v2/products');
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        console.log(`   ✅ Products endpoint working: ${productsData.result?.length || 0} products found`);
      } else {
        console.log(`   ❌ Products endpoint failed: ${productsResponse.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Error testing products: ${error.message}`);
    }

    console.log('\n🚨 TROUBLESHOOTING STEPS:');
    console.log('1. 🔑 ACTIVATE API KEY:');
    console.log('   - Go to Delta Exchange → Settings → API Keys');
    console.log('   - Find your API key and click "Activate" or "Enable"');
    console.log('   - Ensure all permissions are checked (Read, Trade)');
    
    console.log('\n2. ⏰ WAIT FOR ACTIVATION:');
    console.log('   - API keys may take 5-10 minutes to activate');
    console.log('   - Check the status in Delta Exchange dashboard');
    
    console.log('\n3. 🔍 VERIFY PERMISSIONS:');
    console.log('   - Read permission: Required for fetching trades');
    console.log('   - Trade permission: Required for copy trading');
    console.log('   - IP restrictions: Make sure your IP is allowed');
    
    console.log('\n4. 📧 CHECK EMAIL:');
    console.log('   - Delta Exchange may send activation confirmation email');
    console.log('   - Check spam folder if not received');
    
    console.log('\n5. 🔄 RETRY AFTER ACTIVATION:');
    console.log('   - Wait 10 minutes after activation');
    console.log('   - Run this script again to test');

    console.log('\n📞 DELTA EXCHANGE SUPPORT:');
    console.log('   - If issues persist, contact Delta Exchange support');
    console.log('   - Provide your Profile ID: 54678948');
    console.log('   - Mention API key activation issues');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkApiStatus().catch(console.error); 