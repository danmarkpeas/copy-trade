const crypto = require('crypto');
const axios = require('axios');

class DeltaExchangeAPITester {
    constructor(apiKey, apiSecret, baseUrl = 'https://api.india.delta.exchange') {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.baseUrl = baseUrl;
    }

    generateSignature(secret, message) {
        return crypto
            .createHmac('sha256', secret)
            .update(message)
            .digest('hex');
    }

    async makeRequest(method, path, queryParams = {}, body = null) {
        try {
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const url = `${this.baseUrl}${path}`;
            
            // Build query string
            const queryString = Object.keys(queryParams).length > 0 
                ? '?' + new URLSearchParams(queryParams).toString()
                : '';
            
            // Prepare payload
            const payload = body ? JSON.stringify(body) : '';
            
            // Create signature data: method + timestamp + requestPath + queryParams + body
            const signatureData = method + timestamp + path + queryString + payload;
            const signature = this.generateSignature(this.apiSecret, signatureData);
            
            // Set headers
            const headers = {
                'api-key': this.apiKey,
                'timestamp': timestamp,
                'signature': signature,
                'User-Agent': 'nodejs-rest-client',
                'Content-Type': 'application/json'
            };

            // Make request
            const config = {
                method: method.toLowerCase(),
                url: url + queryString,
                headers: headers,
                timeout: 30000
            };

            if (payload) {
                config.data = payload;
            }

            console.log(`🔍 Testing ${method} ${path}`);
            console.log(`   Timestamp: ${timestamp}`);
            console.log(`   Signature Data: ${signatureData}`);
            console.log(`   Generated Signature: ${signature}`);

            const response = await axios(config);
            console.log(`✅ Success: ${response.status}`);
            return response.data;

        } catch (error) {
            if (error.response) {
                console.log(`❌ Error: ${error.response.status}`);
                console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
                throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            } else if (error.request) {
                console.log(`❌ Network Error: No response received`);
                throw new Error('Network Error: No response received');
            } else {
                console.log(`❌ Request Error: ${error.message}`);
                throw new Error(`Request Error: ${error.message}`);
            }
        }
    }

    // Test different API endpoints
    async testGetPositions() {
        return await this.makeRequest('GET', '/v2/positions');
    }

    async testGetBalance() {
        return await this.makeRequest('GET', '/v2/wallet/balances');
    }

    async testGetOpenOrders() {
        return await this.makeRequest('GET', '/v2/orders', {
            state: 'open'
        });
    }
}

async function testAPIKeys() {
    console.log('🧪 TESTING DELTA EXCHANGE API SIGNATURE');
    console.log('=======================================\n');

    console.log('📝 INSTRUCTIONS:');
    console.log('1. Enter your Delta Exchange API key and secret');
    console.log('2. The system will test the signature format');
    console.log('3. This will verify if your credentials work correctly\n');

    console.log('⚠️  SECURITY NOTE:');
    console.log('   Your API keys will be used only for testing');
    console.log('   They will not be stored or logged\n');

    // For testing purposes, you can replace these with your actual API keys
    const testAPIKey = 'your_api_key_here';
    const testAPISecret = 'your_api_secret_here';

    if (testAPIKey === 'your_api_key_here' || testAPISecret === 'your_api_secret_here') {
        console.log('❌ Please update the script with your real API keys');
        console.log('   Edit scripts/test-api-signature.js');
        console.log('   Replace "your_api_key_here" and "your_api_secret_here"');
        console.log('   with your actual Delta Exchange API credentials');
        return;
    }

    const api = new DeltaExchangeAPITester(testAPIKey, testAPISecret);

    try {
        console.log('🔍 Testing API endpoints...\n');

        // Test 1: Get positions
        console.log('📊 Test 1: Get Positions');
        console.log('------------------------');
        const positions = await api.testGetPositions();
        console.log('✅ Positions retrieved successfully\n');

        // Test 2: Get balance
        console.log('💰 Test 2: Get Balance');
        console.log('----------------------');
        const balance = await api.testGetBalance();
        console.log('✅ Balance retrieved successfully\n');

        // Test 3: Get open orders
        console.log('📋 Test 3: Get Open Orders');
        console.log('--------------------------');
        const orders = await api.testGetOpenOrders();
        console.log('✅ Open orders retrieved successfully\n');

        console.log('🎉 ALL TESTS PASSED!');
        console.log('====================');
        console.log('✅ API signature format is correct');
        console.log('✅ Your API credentials are valid');
        console.log('✅ Ready to use with copy trading system');

    } catch (error) {
        console.log('\n❌ TEST FAILED');
        console.log('==============');
        console.log(`Error: ${error.message}`);
        console.log('');
        console.log('💡 TROUBLESHOOTING:');
        console.log('   - Check if your API keys are correct');
        console.log('   - Verify your API keys have trading permissions');
        console.log('   - Ensure your Delta Exchange account is active');
    }
}

testAPIKeys(); 