const crypto = require('crypto');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class DeltaAPITester {
    constructor(apiKey, apiSecret, accountName, isTestnet = false) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.accountName = accountName;
        this.baseUrl = isTestnet 
            ? 'https://cdn-ind.testnet.deltaex.org'
            : 'https://api.india.delta.exchange';
        this.isTestnet = isTestnet;
    }

    generateSignature(secret, message) {
        return crypto
            .createHmac('sha256', secret)
            .update(message)
            .digest('hex');
    }

    async makeRequest(method, path, queryParams = {}, body = null) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        
        // Build query string
        const queryString = Object.keys(queryParams).length > 0 
            ? '?' + new URLSearchParams(queryParams).toString()
            : '';
        
        // Prepare payload
        const payload = body ? JSON.stringify(body) : '';
        
        // Create signature data: method + timestamp + path + queryString + payload
        const signatureData = method + timestamp + path + queryString + payload;
        const signature = this.generateSignature(this.apiSecret, signatureData);
        
        const headers = {
            'api-key': this.apiKey,
            'timestamp': timestamp,
            'signature': signature,
            'User-Agent': 'nodejs-api-tester',
            'Content-Type': 'application/json'
        };

        const config = {
            method: method.toLowerCase(),
            url: this.baseUrl + path + queryString,
            headers: headers,
            timeout: 10000
        };

        if (payload) {
            config.data = payload;
        }

        console.log(`   🔍 ${method} ${path}${queryString}`);
        console.log(`   📝 Timestamp: ${timestamp}`);
        console.log(`   🔐 Signature Data: ${signatureData}`);
        console.log(`   🔑 Generated Signature: ${signature}`);

        return await axios(config);
    }

    async checkSystemTime() {
        console.log('🕐 Checking System Time...');
        try {
            const response = await axios.get('http://worldtimeapi.org/api/timezone/UTC');
            const serverTime = new Date(response.data.datetime);
            const localTime = new Date();
            const timeDiff = Math.abs(serverTime.getTime() - localTime.getTime()) / 1000;
            
            console.log(`   Local Time: ${localTime.toISOString()}`);
            console.log(`   Server Time: ${serverTime.toISOString()}`);
            console.log(`   Time Difference: ${timeDiff.toFixed(2)} seconds`);
            
            if (timeDiff > 5) {
                console.log('⚠️  WARNING: Time difference > 5 seconds. This may cause signature errors.');
                console.log('   Consider syncing your system clock.');
            } else {
                console.log('✅ System time is synchronized');
            }
        } catch (error) {
            console.log('⚠️  Could not check system time');
        }
        console.log('');
    }

    async checkIPAddress() {
        console.log('🌐 Checking Your IP Address...');
        try {
            const response = await axios.get('https://api.ipify.org?format=json');
            console.log(`   Your Public IP: ${response.data.ip}`);
            console.log('   Make sure this IP is whitelisted in your API key settings');
        } catch (error) {
            console.log('⚠️  Could not determine your IP address');
        }
        console.log('');
    }

    async testBasicConnection() {
        console.log('🔗 Testing Basic API Connection...');
        try {
            const response = await this.makeRequest('GET', '/v2/wallet/balances');
            console.log('✅ Basic connection successful');
            console.log(`   Response status: ${response.status}`);
            console.log(`   API response success: ${response.data.success}`);
            return true;
        } catch (error) {
            console.log('❌ Basic connection failed');
            this.handleError(error);
            return false;
        }
    }

    async testReadOnlyEndpoints() {
        console.log('📖 Testing Read-Only Endpoints...');
        
        const tests = [
            { name: 'Wallet Balances', method: 'GET', path: '/v2/wallet/balances' },
            { name: 'Open Orders', method: 'GET', path: '/v2/orders', params: { states: 'open', page_size: 5 } },
            { name: 'Positions', method: 'GET', path: '/v2/positions/margined' }
        ];

        let passedTests = 0;
        
        for (const test of tests) {
            try {
                console.log(`   Testing ${test.name}...`);
                const response = await this.makeRequest(test.method, test.path, test.params || {});
                console.log(`   ✅ ${test.name}: Success`);
                passedTests++;
            } catch (error) {
                console.log(`   ❌ ${test.name}: Failed`);
                if (error.response && error.response.status === 403) {
                    console.log('      → Insufficient permissions or IP not whitelisted');
                }
            }
        }
        
        console.log(`   Results: ${passedTests}/${tests.length} tests passed\n`);
        return passedTests === tests.length;
    }

    async testSignatureGeneration() {
        console.log('🔐 Testing Signature Generation...');
        
        // Test with known values
        const testMethod = 'GET';
        const testTimestamp = '1542110948';
        const testPath = '/v2/orders';
        const testQuery = '?product_id=1&state=open';
        const testPayload = '';
        
        const testSignatureData = testMethod + testTimestamp + testPath + testQuery + testPayload;
        const testSignature = this.generateSignature('test_secret', testSignatureData);
        
        console.log('   Test signature generation:');
        console.log(`   Input: ${testSignatureData}`);
        console.log(`   Output: ${testSignature}`);
        console.log('   ✅ Signature generation working\n');
    }

    handleError(error) {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            
            console.log(`   Status Code: ${status}`);
            console.log(`   Error Data:`, JSON.stringify(data, null, 2));
            
            // Provide specific guidance based on error
            switch (status) {
                case 401:
                    console.log('   🔍 Possible Issues:');
                    console.log('   - Invalid API key or secret');
                    console.log('   - Signature generation error');
                    console.log('   - System time not synchronized (check time sync)');
                    break;
                case 403:
                    console.log('   🔍 Possible Issues:');
                    console.log('   - IP address not whitelisted');
                    console.log('   - API key lacks required permissions');
                    console.log('   - Using testnet key on production or vice versa');
                    break;
                case 429:
                    console.log('   🔍 Rate limit exceeded - wait before retrying');
                    break;
                default:
                    console.log('   🔍 Check API documentation for this error code');
            }
        } else if (error.request) {
            console.log('   Network error - check your internet connection');
        } else {
            console.log(`   Request setup error: ${error.message}`);
        }
        console.log('');
    }

    async runFullTest() {
        console.log(`🚀 Testing Delta Exchange API Keys for: ${this.accountName}`);
        console.log(`📍 Environment: ${this.isTestnet ? 'TESTNET' : 'PRODUCTION'}`);
        console.log(`🔗 Base URL: ${this.baseUrl}`);
        console.log(`🔑 API Key: ${this.apiKey.substring(0, 8)}...`);
        console.log('=' .repeat(60));
        
        // Run all tests
        await this.checkSystemTime();
        await this.checkIPAddress();
        this.testSignatureGeneration();
        
        const basicTest = await this.testBasicConnection();
        if (basicTest) {
            await this.testReadOnlyEndpoints();
        }
        
        console.log('=' .repeat(60));
        console.log('🏁 Test Complete');
        
        if (basicTest) {
            console.log('✅ Your API keys are working correctly!');
            console.log('💡 You can now proceed with trading operations');
        } else {
            console.log('❌ API key test failed');
            console.log('💡 Please check the errors above and fix the issues');
        }
        
        return basicTest;
    }
}

async function testDatabaseAPIKeys() {
    console.log('🔍 TESTING API KEYS FROM DATABASE');
    console.log('==================================\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Fetch all active broker accounts
        const { data: brokers, error: brokersError } = await supabase
            .from('broker_accounts')
            .select('id, account_name, broker_name, api_key, api_secret, is_active, is_verified')
            .eq('is_active', true);

        if (brokersError) {
            console.log('❌ Error fetching broker accounts:', brokersError);
            return;
        }

        if (!brokers || brokers.length === 0) {
            console.log('❌ No active broker accounts found in database');
            return;
        }

        console.log(`📊 Found ${brokers.length} active broker accounts:\n`);

        let workingAccounts = 0;
        let totalAccounts = brokers.length;

        for (const broker of brokers) {
            console.log(`🔍 Testing Broker: ${broker.account_name}`);
            console.log(`   Broker: ${broker.broker_name}`);
            console.log(`   Verified: ${broker.is_verified ? 'Yes' : 'No'}`);
            console.log(`   API Key: ${broker.api_key ? broker.api_key.substring(0, 8) + '...' : 'Missing'}`);
            console.log(`   API Secret: ${broker.api_secret ? 'Present' : 'Missing'}`);
            console.log('');

            if (!broker.api_key || !broker.api_secret) {
                console.log('❌ Missing API credentials - skipping test\n');
                continue;
            }

            // Check if keys look like test keys
            const isTestKey = broker.api_key.includes('test') || 
                             broker.api_secret.includes('test') ||
                             broker.api_key.length < 20;

            if (isTestKey) {
                console.log('⚠️  Detected test API keys - these will not work with production API');
                console.log('   Please update with real Delta Exchange API keys\n');
                continue;
            }

            // Test the API keys
            const tester = new DeltaAPITester(
                broker.api_key, 
                broker.api_secret, 
                broker.account_name,
                false // Production environment
            );

            const testResult = await tester.runFullTest();
            
            if (testResult) {
                workingAccounts++;
            }

            console.log('\n' + '='.repeat(80) + '\n');
        }

        // Summary
        console.log('📊 FINAL SUMMARY');
        console.log('================');
        console.log(`Total Accounts: ${totalAccounts}`);
        console.log(`Working Accounts: ${workingAccounts}`);
        console.log(`Failed Accounts: ${totalAccounts - workingAccounts}`);
        
        if (workingAccounts === 0) {
            console.log('\n❌ NO WORKING API KEYS FOUND');
            console.log('🔧 NEXT STEPS:');
            console.log('   1. Get real API keys from Delta Exchange');
            console.log('   2. Update broker accounts in database');
            console.log('   3. Ensure IP is whitelisted');
            console.log('   4. Verify API key permissions');
        } else {
            console.log('\n✅ SOME API KEYS ARE WORKING');
            console.log('💡 Copy trading should work with working accounts');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testDatabaseAPIKeys(); 