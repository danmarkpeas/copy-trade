// Manual Signature Test
// Run this with: node scripts/test-signature-manual.js

const crypto = require('crypto');

function testSignature() {
  console.log('🔍 Testing signature generation manually...\n');
  
  // Test data (replace with your actual API key and secret)
  const method = 'GET';
  const path = '/v2/fills';
  const body = '';
  const timestamp = Math.floor(Date.now() / 1000) + 2; // 2 second buffer
  const api_secret = 'test_secret_123456789012345678901234567890'; // Replace with your actual secret
  
  // Generate signature
  const signatureString = method + path + body + timestamp;
  const signature = crypto
    .createHmac('sha256', api_secret)
    .update(signatureString)
    .digest('hex');
  
  console.log('📋 Test Data:');
  console.log('  Method:', method);
  console.log('  Path:', path);
  console.log('  Body:', body);
  console.log('  Timestamp:', timestamp);
  console.log('  API Secret Length:', api_secret.length);
  console.log('  API Secret Preview:', api_secret.substring(0, 8) + '...' + api_secret.substring(api_secret.length - 8));
  
  console.log('\n🔐 Signature Generation:');
  console.log('  Signature String:', signatureString);
  console.log('  Signature String Length:', signatureString.length);
  console.log('  Generated Signature:', signature);
  console.log('  Signature Length:', signature.length);
  console.log('  Signature Preview:', signature.substring(0, 16) + '...');
  
  console.log('\n📡 Expected API Call:');
  console.log('  URL: https://api.delta.exchange/v2/fills');
  console.log('  Headers:');
  console.log('    api-key: [your-api-key]');
  console.log('    timestamp:', timestamp);
  console.log('    signature:', signature);
  console.log('    Content-Type: application/json');
  
  console.log('\n✅ Signature generation test completed!');
  console.log('   If signature length is 64 characters, the generation is working correctly.');
}

testSignature(); 