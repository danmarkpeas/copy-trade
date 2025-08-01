const axios = require('axios');
const crypto = require('crypto');

class DeltaExchangeAPITester {
    constructor(apiKey, apiSecret, environment = 'production') {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        
        // Set base URL based on environment - CORRECTED FOR INDIA
        if (environment.toLowerCase() === 'testnet') {
            this.baseUrl = 'https://cdn-ind.testnet.deltaex.org';
        } else {
            this.baseUrl = 'https://api.india.delta.exchange'; // INDIA API URL
        }
    }
    
    generateSignature(secret, message) {
        const messageBytes = Buffer.from(message, 'utf-8');
        const secretBytes = Buffer.from(secret, 'utf-8');
        const hash = crypto.createHmac('sha256', secretBytes);
        hash.update(messageBytes);
        return hash.digest('hex');
    }
    
    getHeaders(method, path, queryString = '', payload = '') {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signatureData = method + timestamp + path + queryString + payload;
        const signature = this.generateSignature(this.apiSecret, signatureData);
        
        return {
            'api-key': this.apiKey,
            'timestamp': timestamp,
            'signature': signature,
            'User-Agent': 'node-api-tester',
            'Content-Type': 'application/json'
        };
    }
    
    async testPublicEndpoint() {
        console.log('='.repeat(60));
        console.log('1. TESTING PUBLIC ENDPOINT (No Authentication)');
        console.log('='.repeat(60));
        
        try {
            const url = `${this.baseUrl}/v2/products`;
            const response = await axios.get(url, { timeout: 10000 });
            
            console.log(`URL: ${url}`);
            console.log(`Status Code: ${response.status}`);
            
            if (response.status === 200) {
                const data = response.data;
                console.log('✅ PUBLIC ENDPOINT SUCCESS');
                console.log(`Found ${data.result?.length || 0} products`);
                return true;
            } else {
                console.log('❌ PUBLIC ENDPOINT FAILED');
                console.log(`Response: ${JSON.stringify(response.data)}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ PUBLIC ENDPOINT ERROR: ${error.message}`);
            return false;
        }
    }
    
    async testAuthentication() {
        console.log('\n' + '='.repeat(60));
        console.log('2. TESTING AUTHENTICATION');
        console.log('='.repeat(60));
        
        try {
            const method = 'GET';
            const path = '/v2/wallet/balances';
            const url = `${this.baseUrl}${path}`;
            
            const headers = this.getHeaders(method, path);
            
            console.log(`URL: ${url}`);
            console.log(`API Key: ${this.apiKey.substring(0, 8)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
            console.log(`Timestamp: ${headers.timestamp}`);
            console.log(`Signature: ${headers.signature.substring(0, 16)}...`);
            
            const response = await axios.get(url, { headers, timeout: 10000 });
            
            console.log(`Status Code: ${response.status}`);
            
            if (response.status === 200) {
                console.log('✅ AUTHENTICATION SUCCESS');
                console.log('Wallet balances retrieved successfully');
                return true;
            } else {
                console.log('❌ AUTHENTICATION FAILED');
                console.log(`Error: ${JSON.stringify(response.data, null, 2)}`);
                return false;
            }
        } catch (error) {
            console.log('❌ AUTHENTICATION FAILED');
            if (error.response) {
                console.log(`Status: ${error.response.status}`);
                console.log(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
            } else {
                console.log(`Error: ${error.message}`);
            }
            return false;
        }
    }
    
    async testIpWhitelist() {
        console.log('\n' + '='.repeat(60));
        console.log('3. TESTING IP WHITELIST');
        console.log('='.repeat(60));
        
        try {
            // Get public IP
            const ipResponse = await axios.get('https://api.ipify.org', { timeout: 5000 });
            const publicIp = ipResponse.data;
            console.log(`Your Public IP: ${publicIp}`);
            
            // Test with a simple authenticated endpoint
            const method = 'GET';
            const path = '/v2/profile';
            const url = `${this.baseUrl}${path}`;
            
            const headers = this.getHeaders(method, path);
            const response = await axios.get(url, { headers, timeout: 10000 });
            
            if (response.status === 200) {
                console.log('✅ IP WHITELIST SUCCESS');
                return true;
            } else {
                console.log('❌ IP WHITELIST TEST INCONCLUSIVE');
                console.log(`Error: ${JSON.stringify(response.data, null, 2)}`);
                return false;
            }
        } catch (error) {
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                if (errorData.error && errorData.error.code === 'ip_not_whitelisted_for_api_key') {
                    console.log('❌ IP NOT WHITELISTED');
                    console.log(`Your IP ${errorData.error.context?.client_ip || 'unknown'} is not whitelisted for this API key`);
                    console.log('Add this IP to your API key whitelist at:');
                    console.log('https://www.delta.exchange/app/account/manageapikeys');
                    return false;
                }
            }
            console.log(`❌ IP WHITELIST ERROR: ${error.message}`);
            return false;
        }
    }
    
    async testEnvironmentMismatch() {
        console.log('\n' + '='.repeat(60));
        console.log('4. TESTING ENVIRONMENT MISMATCH');
        console.log('='.repeat(60));
        
        console.log(`Current Environment: ${this.baseUrl}`);
        
        const environments = {
            'Production (India)': 'https://api.india.delta.exchange',
            'Testnet': 'https://cdn-ind.testnet.deltaex.org'
        };
        
        let workingEnv = null;
        
        for (const [envName, envUrl] of Object.entries(environments)) {
            try {
                console.log(`\nTesting ${envName}: ${envUrl}`);
                
                // Test public endpoint first
                const publicResponse = await axios.get(`${envUrl}/v2/products`, { timeout: 5000 });
                if (publicResponse.status !== 200) {
                    console.log(`  ❌ ${envName} - Public endpoint failed`);
                    continue;
                }
                
                // Test authentication
                const method = 'GET';
                const path = '/v2/profile';
                const timestamp = Math.floor(Date.now() / 1000).toString();
                const signatureData = method + timestamp + path;
                const signature = this.generateSignature(this.apiSecret, signatureData);
                
                const headers = {
                    'api-key': this.apiKey,
                    'timestamp': timestamp,
                    'signature': signature,
                    'User-Agent': 'node-api-tester',
                    'Content-Type': 'application/json'
                };
                
                const authResponse = await axios.get(`${envUrl}${path}`, { headers, timeout: 5000 });
                
                if (authResponse.status === 200) {
                    console.log(`  ✅ ${envName} - Authentication SUCCESS`);
                    workingEnv = envName;
                } else {
                    console.log(`  ❌ ${envName} - HTTP ${authResponse.status}`);
                }
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    const errorData = error.response.data;
                    if (errorData && errorData.error && errorData.error.code === 'InvalidApiKey') {
                        console.log(`  ❌ ${envName} - Invalid API Key (wrong environment)`);
                    } else {
                        console.log(`  ❌ ${envName} - Authentication failed: ${JSON.stringify(errorData)}`);
                    }
                } else {
                    console.log(`  ❌ ${envName} - Error: ${error.message}`);
                }
            }
        }
        
        if (workingEnv) {
            console.log(`\n✅ ENVIRONMENT CHECK: Your API key works with ${workingEnv}`);
            const currentEnv = this.baseUrl.includes('india') ? 'Production (India)' : 'Testnet';
            if (workingEnv !== currentEnv) {
                console.log('⚠️  WARNING: You\'re using the wrong environment!');
                console.log(`   Your API key works with ${workingEnv}`);
                console.log(`   But you're connecting to ${this.baseUrl}`);
            }
            return true;
        } else {
            console.log('\n❌ ENVIRONMENT CHECK: API key doesn\'t work with any environment');
            return false;
        }
    }
    
    async runAllTests() {
        console.log(`DELTA EXCHANGE API TESTER (INDIA)`);
        console.log(`Environment: ${this.baseUrl}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);
        
        const results = {
            publicEndpoint: await this.testPublicEndpoint(),
            ipWhitelist: await this.testIpWhitelist(),
            environmentMismatch: await this.testEnvironmentMismatch(),
            authentication: await this.testAuthentication()
        };
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('TEST SUMMARY');
        console.log('='.repeat(60));
        
        const passed = Object.values(results).filter(Boolean).length;
        const total = Object.keys(results).length;
        
        for (const [testName, result] of Object.entries(results)) {
            const status = result ? '✅ PASS' : '❌ FAIL';
            console.log(`${testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${status}`);
        }
        
        console.log(`\nOverall: ${passed}/${total} tests passed`);
        
        // Recommendations
        console.log('\n' + '='.repeat(60));
        console.log('RECOMMENDATIONS');
        console.log('='.repeat(60));
        
        if (!results.publicEndpoint) {
            console.log('❌ Network connectivity issue. Check your internet connection.');
        }
        
        if (!results.environmentMismatch) {
            console.log('❌ Environment mismatch. Your API key may be for a different environment.');
            console.log('   - Production keys: Created at https://www.delta.exchange/');
            console.log('   - Testnet keys: Created at testnet environment');
        }
        
        if (!results.ipWhitelist) {
            console.log('❌ IP not whitelisted. Add your IP to the API key whitelist.');
            console.log('   - Go to: https://www.delta.exchange/app/account/manageapikeys');
        }
        
        if (!results.authentication) {
            console.log('❌ Authentication failed. Check API key, secret, and environment.');
            console.log('   - Verify you\'re using the correct India API URL');
            console.log('   - Ensure API key and secret are correct');
            console.log('   - Check system time synchronization');
        }
        
        if (Object.values(results).every(Boolean)) {
            console.log('✅ All tests passed! Your API key is working correctly with India API.');
        }
        
        return results;
    }
}

async function main() {
    console.log('Delta Exchange API Key Tester (INDIA)');
    console.log('='.repeat(40));
    
    // Get API credentials from environment or use placeholders
    const apiKey = process.env.DELTA_API_KEY || 'your_api_key_here';
    const apiSecret = process.env.DELTA_API_SECRET || 'your_api_secret_here';
    const environment = process.env.DELTA_ENVIRONMENT || 'production';
    
    if (apiKey === 'your_api_key_here' || apiSecret === 'your_api_secret_here') {
        console.log('⚠️  Please set your API credentials as environment variables:');
        console.log('   DELTA_API_KEY=your_actual_api_key');
        console.log('   DELTA_API_SECRET=your_actual_api_secret');
        console.log('   DELTA_ENVIRONMENT=production (or testnet)');
        console.log('\nTo get your API credentials:');
        console.log('1. Go to https://www.delta.exchange/app/account/manageapikeys');
        console.log('2. Create a new API key');
        console.log('3. Copy the API key and secret');
        console.log('4. Set them as environment variables');
        console.log('\n📍 IMPORTANT: This tester uses the INDIA API URL:');
        console.log('   Production: https://api.india.delta.exchange');
        console.log('   Testnet: https://cdn-ind.testnet.deltaex.org');
        return;
    }
    
    // Initialize tester
    const tester = new DeltaExchangeAPITester(apiKey, apiSecret, environment);
    
    // Run all tests
    const results = await tester.runAllTests();
    
    return results;
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DeltaExchangeAPITester; 