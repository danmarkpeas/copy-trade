const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function compareDeltaIntegrations() {
  console.log('🔍 COMPARING DELTA EXCHANGE INTEGRATIONS\n');

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
    const BASE_URL = 'https://api.delta.exchange';

    // Implementation based on the provided backend code
    class DeltaExchangeClient {
      constructor(config) {
        this.baseURL = config.baseURL;
        this.apiKey = config.apiKey;
        this.apiSecret = config.apiSecret;
      }

      generateSignature(secret, message) {
        return crypto
          .createHmac('sha256', secret)
          .update(message)
          .digest('hex');
      }

      createAuthHeaders(method, path, queryString = '', payload = '') {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signatureData = method + timestamp + path + queryString + payload;
        const signature = this.generateSignature(this.apiSecret, signatureData);

        return {
          'api-key': this.apiKey,
          'timestamp': timestamp,
          'signature': signature,
          'User-Agent': 'delta-react-client',
          'Content-Type': 'application/json'
        };
      }

      async makeRequest(method, endpoint, params = {}, data = null) {
        try {
          const path = `/v2/${endpoint}`;
          const queryString = Object.keys(params).length > 0 
            ? '?' + new URLSearchParams(params).toString() 
            : '';
          const payload = data ? JSON.stringify(data) : '';

          const headers = this.createAuthHeaders(method, path, queryString, payload);
          
          const config = {
            method,
            url: `${this.baseURL}${path}`,
            headers,
            timeout: 10000
          };

          if (params && Object.keys(params).length > 0) {
            config.params = params;
          }

          if (data) {
            config.data = data;
          }

          const response = await fetch(`${this.baseURL}${path}${queryString}`, {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined
          });

          const responseData = await response.json();
          
          return {
            success: response.ok,
            data: responseData,
            status: response.status
          };

        } catch (error) {
          console.error(`API Error for ${endpoint}:`, error.message);
          return {
            success: false,
            error: { message: error.message },
            status: 500
          };
        }
      }

      async makePublicRequest(endpoint, params = {}) {
        try {
          const queryString = Object.keys(params).length > 0 
            ? '?' + new URLSearchParams(params).toString() 
            : '';
          
          const response = await fetch(`${this.baseURL}/v2/${endpoint}${queryString}`, {
            timeout: 10000
          });
          
          const data = await response.json();
          
          return {
            success: response.ok,
            data: data,
            status: response.status
          };
        } catch (error) {
          return {
            success: false,
            error: { message: error.message },
            status: 500
          };
        }
      }

      async getFills(filters = {}) {
        return await this.makeRequest('GET', 'fills', filters);
      }

      async getPositions() {
        return await this.makeRequest('GET', 'positions/margined');
      }

      async getOrders(filters = {}) {
        return await this.makeRequest('GET', 'orders', filters);
      }

      async getWalletBalances() {
        return await this.makeRequest('GET', 'wallet/balances');
      }

      async getProducts() {
        return await this.makePublicRequest('products');
      }
    }

    // Initialize client with our broker account
    const deltaClient = new DeltaExchangeClient({
      baseURL: BASE_URL,
      apiKey: API_KEY,
      apiSecret: API_SECRET
    });

    console.log('🧪 TESTING IMPROVED DELTA EXCHANGE CLIENT\n');

    // Test 1: Public endpoints
    console.log('🌐 TEST 1: Public Endpoints');
    const productsResult = await deltaClient.getProducts();
    console.log(`   Products: ${productsResult.success ? '✅' : '❌'} (${productsResult.data?.result?.length || 0} items)`);

    // Test 2: Authenticated endpoints
    console.log('\n🔐 TEST 2: Authenticated Endpoints');
    
    const tests = [
      { name: 'Fills', method: () => deltaClient.getFills() },
      { name: 'Positions', method: () => deltaClient.getPositions() },
      { name: 'Orders', method: () => deltaClient.getOrders({ state: 'open' }) },
      { name: 'Wallet', method: () => deltaClient.getWalletBalances() }
    ];

    for (const test of tests) {
      const result = await test.method();
      console.log(`   ${test.name}: ${result.success ? '✅' : '❌'} (${result.status})`);
      
      if (!result.success && result.error) {
        console.log(`      Error: ${result.error.message || result.error.code || 'Unknown'}`);
      }
    }

    // Test 3: Compare with our current implementation
    console.log('\n📊 TEST 3: Comparing Implementations');
    
    // Our current implementation
    function generateSignature(secret, message) {
      return crypto.createHmac('sha256', secret).update(message).digest('hex');
    }

    const timestamp = Math.floor(Date.now() / 1000) + 1;
    const signatureData = `${timestamp}GET/v2/fills`;
    const signature = generateSignature(API_SECRET, signatureData);

    const currentResponse = await fetch(`${BASE_URL}/v2/fills`, {
      method: 'GET',
      headers: {
        'api-key': API_KEY,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'User-Agent': 'copy-trading-platform',
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Current Implementation: ${currentResponse.ok ? '✅' : '❌'} (${currentResponse.status})`);
    console.log(`   Improved Implementation: ${(await deltaClient.getFills()).success ? '✅' : '❌'}`);

    console.log('\n📋 COMPARISON ANALYSIS:');
    console.log('✅ Provided Backend Code Advantages:');
    console.log('   - Better error handling and response structure');
    console.log('   - Consistent API response format');
    console.log('   - Proper timeout handling');
    console.log('   - Cleaner class-based architecture');
    console.log('   - Better separation of concerns');
    console.log('');
    console.log('✅ Our Current Implementation Advantages:');
    console.log('   - Integrated with Supabase Edge Functions');
    console.log('   - Real-time trade monitoring');
    console.log('   - Copy trading logic');
    console.log('   - Database integration');
    console.log('');
    console.log('🔧 RECOMMENDATIONS:');
    console.log('1. Adopt the improved error handling from the backend code');
    console.log('2. Use consistent response format across all endpoints');
    console.log('3. Implement proper timeout handling');
    console.log('4. Keep our Edge Function architecture for real-time monitoring');
    console.log('5. Consider creating a shared Delta client library');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

compareDeltaIntegrations().catch(console.error); 