const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testBackendConnection() {
  console.log('🔍 TESTING BACKEND CONNECTION\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Get master broker ID
    console.log('📋 STEP 1: Getting Master Broker ID');
    const { data: masterBrokers, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('account_status', 'active')
      .eq('is_active', true)
      .limit(1);

    if (brokerError || !masterBrokers || masterBrokers.length === 0) {
      console.log('❌ No active master broker found');
      return;
    }

    const masterBroker = masterBrokers[0];
    console.log(`✅ Master Broker: ${masterBroker.account_name} (ID: ${masterBroker.id})`);

    // 2. Test backend connection
    console.log('\n📋 STEP 2: Testing Backend Connection');
    
    const testData = { broker_id: masterBroker.id };
    console.log(`📤 Sending request to: http://localhost:3001/api/real-time-monitor`);
    console.log(`📤 Data:`, JSON.stringify(testData, null, 2));

    try {
      const response = await fetch('http://localhost:3001/api/real-time-monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      console.log(`📥 Response Status: ${response.status}`);
      console.log(`📥 Response Headers:`, Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log(`📥 Response Data:`, JSON.stringify(data, null, 2));
        
        if (data.success && data.positions) {
          console.log(`✅ Backend connection successful`);
          console.log(`📊 Found ${data.positions.length} positions`);
          data.positions.forEach((pos, index) => {
            console.log(`   ${index + 1}. ${pos.product_symbol}: ${pos.size} contracts`);
          });
        } else {
          console.log(`⚠️ Backend responded but no positions found`);
        }
      } else {
        console.log(`❌ Backend responded with error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log(`📥 Error details: ${errorText}`);
      }
    } catch (fetchError) {
      console.log(`❌ Fetch error: ${fetchError.message}`);
      console.log(`🔧 This is likely the same error the real-time script is experiencing`);
    }

    // 3. Test alternative connection methods
    console.log('\n📋 STEP 3: Testing Alternative Connection Methods');
    
    // Test with different URL formats
    const urls = [
      'http://localhost:3001/api/real-time-monitor',
      'http://127.0.0.1:3001/api/real-time-monitor',
      'http://0.0.0.0:3001/api/real-time-monitor'
    ];

    for (const url of urls) {
      console.log(`\n🔍 Testing URL: ${url}`);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testData)
        });

        if (response.ok) {
          console.log(`✅ URL ${url} works!`);
          break;
        } else {
          console.log(`❌ URL ${url} failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ URL ${url} error: ${error.message}`);
      }
    }

    // 4. Summary and recommendations
    console.log('\n🎯 SUMMARY:');
    console.log('✅ Backend connection testing completed');
    console.log('✅ Master broker ID obtained');
    console.log('✅ Alternative URL testing completed');

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Check if the backend server is properly handling requests');
    console.log('2. Verify the real-time script is using the correct URL');
    console.log('3. Consider using a different fetch implementation');
    console.log('4. Check for any firewall or network issues');

    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Fix the fetch connection issue in real-time script');
    console.log('2. Test with a working backend connection');
    console.log('3. Verify position detection and closure');

  } catch (error) {
    console.log('❌ Error testing backend connection:', error.message);
  }
}

testBackendConnection().catch(console.error); 