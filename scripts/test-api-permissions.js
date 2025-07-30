const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testApiPermissions() {
  console.log('🔍 TESTING API KEY PERMISSIONS\n');

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

    const API_KEY = brokerAccount.api_key;
    const API_SECRET = brokerAccount.api_secret;
    const BASE_URL = 'https://api.delta.exchange'; // Using main domain

    function generateSignature(secret, message) {
      return crypto.createHmac('sha256', secret).update(message).digest('hex');
    }

    async function makeAuthenticatedRequest(endpoint, params = {}) {
      const method = 'GET';
      const timestamp = Math.floor(Date.now() / 1000) + 1; // Add 1 second buffer
      const path = `/v2/${endpoint}`;
      
      // Build query string
      let queryString = '';
      if (Object.keys(params).length > 0) {
        queryString = '?' + Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
      }
      
      const payload = '';
      const signatureData = method + timestamp + path + queryString + payload;
      const signature = generateSignature(API_SECRET, signatureData);
      
      const headers = {
        'api-key': API_KEY,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'User-Agent': 'permission-test',
        'Content-Type': 'application/json'
      };
      
      try {
        const url = `${BASE_URL}${path}${queryString}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: headers
        });
        
        return response;
      } catch (error) {
        console.log(`Request error: ${error.message}`);
        return null;
      }
    }

    // Test endpoints that require trading permission
    const tests = [
      { endpoint: 'orders', params: { state: 'open' }, description: 'Open Orders' },
      { endpoint: 'fills', params: {}, description: 'Trade History' },
      { endpoint: 'positions/margined', params: {}, description: 'Futures Positions' },
      { endpoint: 'positions/cash', params: {}, description: 'Spot Positions' },
      { endpoint: 'wallet/balances', params: {}, description: 'Wallet Balances' },
      { endpoint: 'orders', params: { state: 'filled' }, description: 'Filled Orders' }
    ];

    console.log('🧪 Testing API Key Permissions...\n');

    for (const test of tests) {
      console.log(`Testing /${test.endpoint} (${test.description})...`);
      const response = await makeAuthenticatedRequest(test.endpoint, test.params);
      
      if (response) {
        if (response.status === 200) {
          const data = await response.json();
          const resultCount = data.result?.length || 0;
          console.log(`   ✅ ${test.endpoint}: Permission OK (${resultCount} results)`);
        } else if (response.status === 401) {
          const errorText = await response.text();
          console.log(`   ❌ ${test.endpoint}: Authentication Error`);
          
          if (errorText.includes('UnauthorizedApiAccess')) {
            console.log(`      🔧 Issue: Missing trading permission`);
            console.log(`      💡 Solution: Enable 'Trade' permission in Delta Exchange`);
          } else if (errorText.includes('ip_blocked_for_api_key')) {
            console.log(`      🔧 Issue: IP not whitelisted`);
            console.log(`      💡 Solution: Add your IP to API key whitelist`);
          } else if (errorText.includes('invalid_api_key')) {
            console.log(`      🔧 Issue: Invalid API key`);
            console.log(`      💡 Solution: Check API key activation and permissions`);
          } else {
            console.log(`      🔧 Issue: ${errorText}`);
          }
        } else if (response.status === 403) {
          console.log(`   ❌ ${test.endpoint}: Forbidden - Insufficient permissions`);
        } else {
          const errorText = await response.text();
          console.log(`   ❌ ${test.endpoint}: HTTP ${response.status} - ${errorText}`);
        }
      } else {
        console.log(`   ❌ ${test.endpoint}: Request failed`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Test public endpoints for comparison
    console.log('\n🌐 Testing Public Endpoints (for comparison)...');
    
    const publicTests = [
      { endpoint: 'products', description: 'Available Products' },
      { endpoint: 'assets', description: 'Available Assets' }
    ];

    for (const test of publicTests) {
      try {
        const response = await fetch(`${BASE_URL}/v2/${test.endpoint}`);
        if (response.ok) {
          const data = await response.json();
          const resultCount = data.result?.length || 0;
          console.log(`   ✅ ${test.endpoint}: Public access OK (${resultCount} results)`);
        } else {
          console.log(`   ❌ ${test.endpoint}: HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ ${test.endpoint}: ${error.message}`);
      }
    }

    console.log('\n📋 PERMISSION ANALYSIS:');
    console.log('✅ If public endpoints work but authenticated fail:');
    console.log('   - API key needs additional permissions');
    console.log('   - Check Read, Trade, Futures, Spot permissions');
    console.log('   - Wait 5-15 minutes after enabling permissions');
    console.log('');
    console.log('✅ If all endpoints fail:');
    console.log('   - API key may not be activated');
    console.log('   - Check API key generation and activation');
    console.log('');
    console.log('✅ If some authenticated endpoints work:');
    console.log('   - Specific permissions may be missing');
    console.log('   - Check individual endpoint requirements');

    console.log('\n🔧 IMMEDIATE ACTIONS:');
    console.log('1. Go to: https://www.delta.exchange/');
    console.log('2. Login with Profile ID: 54678948');
    console.log('3. Navigate to: Settings → API Keys');
    console.log('4. Find API key: sDgClQCDmQCxcUzi8LINo6WRuoRItu');
    console.log('5. Enable these permissions:');
    console.log('   - ✅ Read (for viewing data)');
    console.log('   - ✅ Trade (for executing trades)');
    console.log('   - ✅ Futures (if trading futures)');
    console.log('   - ✅ Spot (if trading spot)');
    console.log('6. Wait 5-15 minutes for activation');
    console.log('7. Run this test again: node scripts/test-api-permissions.js');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testApiPermissions().catch(console.error); 