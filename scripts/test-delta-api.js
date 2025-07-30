const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// Test API credentials
const testCredentials = {
  api_key: 'bv2sGwTUIX...', // Replace with actual API key
  api_secret: 'your_api_secret_here' // Replace with actual API secret
};

function generateSignature(secret, message) {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

async function testDeltaAPI() {
  console.log('🧪 Testing Delta Exchange India API...\n');
  
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = '/v2/positions';
    const signatureData = 'GET' + timestamp + path;
    const signature = generateSignature(testCredentials.api_secret, signatureData);

    const headers = {
      'api-key': testCredentials.api_key,
      'timestamp': timestamp,
      'signature': signature,
      'User-Agent': 'copy-trader-client',
      'Content-Type': 'application/json'
    };

    const url = `https://api.india.delta.exchange${path}`;
    
    console.log('🔍 Testing URL:', url);
    console.log('📋 Headers:', JSON.stringify(headers, null, 2));
    
    const response = await axios.get(url, { headers, timeout: 10000 });
    
    console.log('✅ API call successful!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ API call failed:');
    console.error('   Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Test public endpoints first
async function testPublicEndpoints() {
  console.log('🌐 Testing public endpoints...\n');
  
  try {
    // Test products endpoint
    const productsResponse = await axios.get('https://api.india.delta.exchange/v2/products');
    console.log('✅ Products endpoint working');
    console.log(`   Found ${productsResponse.data.result?.length || 0} products`);
    
    // Test first few products
    if (productsResponse.data.result && productsResponse.data.result.length > 0) {
      console.log('📋 Sample products:');
      productsResponse.data.result.slice(0, 3).forEach(product => {
        console.log(`   - ${product.symbol} (ID: ${product.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Public endpoints failed:', error.message);
  }
}

async function main() {
  await testPublicEndpoints();
  console.log('\n' + '='.repeat(50) + '\n');
  await testDeltaAPI();
}

main().catch(console.error); 