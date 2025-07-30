const crypto = require('crypto');

// Fixed signature generation function
function createDeltaSignature(method, path, body, timestamp, secret) {
  // Delta Exchange expects: timestamp + method + path + body
  const message = timestamp.toString() + method + path + body;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

// Test the fixed signature
function testFixedSignature() {
  console.log('🧪 TESTING FIXED SIGNATURE GENERATION\n');
  
  // Test credentials (using the real ones from your system)
  const API_KEY = 'jz5g7euYPZwVT4UVYaZRTnk7Gs94k5';
  const API_SECRET = 'uvgdluUlyieouyefBI8WJUVTd3jqvB3fUZ37S8QzSMxoiEhYtdQhwyp4HKIe';
  
  // Test timestamp
  const timestamp = Math.floor(Date.now() / 1000) + 5; // 5 second buffer
  
  // Test the fixed signature
  const signature = createDeltaSignature('GET', '/v2/positions/margined', '', timestamp, API_SECRET);
  
  console.log('✅ Fixed signature generation:');
  console.log('   Method: GET');
  console.log('   Path: /v2/positions/margined');
  console.log('   Body: (empty)');
  console.log('   Timestamp:', timestamp);
  console.log('   Message format: timestamp + method + path + body');
  console.log('   Message:', timestamp + 'GET/v2/positions/margined');
  console.log('   Signature:', signature);
  console.log('   API Key:', API_KEY);
  console.log('');
  
  // Test with different endpoints
  console.log('🔍 Testing different endpoints:');
  
  const endpoints = [
    { method: 'GET', path: '/v2/positions/margined', body: '' },
    { method: 'GET', path: '/v2/positions/cash', body: '' },
    { method: 'GET', path: '/v2/fills', body: '' },
    { method: 'GET', path: '/v2/orders', body: '' }
  ];
  
  endpoints.forEach((endpoint, index) => {
    const sig = createDeltaSignature(endpoint.method, endpoint.path, endpoint.body, timestamp, API_SECRET);
    console.log(`   ${index + 1}. ${endpoint.method} ${endpoint.path}: ${sig.substring(0, 20)}...`);
  });
  
  console.log('');
  console.log('📋 Expected API call format:');
  console.log('   URL: https://api.delta.exchange/v2/positions/margined');
  console.log('   Headers:');
  console.log('     api-key: ' + API_KEY);
  console.log('     timestamp: ' + timestamp);
  console.log('     signature: ' + signature);
  console.log('     Content-Type: application/json');
  
  console.log('');
  console.log('🎯 This should fix the "Signature Mismatch" error!');
  console.log('   The key change: timestamp comes FIRST in the message');
  console.log('   Old format: method + path + body + timestamp');
  console.log('   New format: timestamp + method + path + body');
}

// Run the test
testFixedSignature(); 