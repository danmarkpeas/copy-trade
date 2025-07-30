const crypto = require('crypto');

// Test with the provided API secret
const apiSecret = 'GO1nTCVeglXnP0yJqtggz1cAHUlh4Lb8h4iC8zPT9Hv9Ng9SPtckENuHt0cMGO1nTCVeglXnP0yJqtggz1cAHUlh4Lb8h4iC8zPT9Hv9Ng9SPtckENuHt0cM';
const method = 'GET';
const endpoint = '/v2/positions';
const timestamp = Math.floor(Date.now() / 1000).toString();

const message = method + endpoint + timestamp;
const signature = crypto.createHmac('sha256', apiSecret).update(message).digest('hex');

console.log('🔐 POSTMAN SIGNATURE TEST');
console.log('API Secret Length:', apiSecret.length);
console.log('Method:', method);
console.log('Endpoint:', endpoint);
console.log('Timestamp:', timestamp);
console.log('Message:', message);
console.log('Signature:', signature);

console.log('\n📋 POSTMAN HEADERS:');
console.log('api-key: your_api_key_here');
console.log('timestamp:', timestamp);
console.log('signature:', signature);
console.log('Content-Type: application/json');

console.log('\n🌐 POSTMAN URL:');
console.log('https://api.delta.exchange/v2/positions');

console.log('\n🧪 TESTING DIFFERENT ENDPOINTS:');
const endpoints = [
  '/v2/fills',
  '/v2/positions/margined', 
  '/v2/positions/cash',
  '/v2/orders'
];

endpoints.forEach(endpoint => {
  const testMessage = method + endpoint + timestamp;
  const testSignature = crypto.createHmac('sha256', apiSecret).update(testMessage).digest('hex');
  
  console.log(`${endpoint}:`);
  console.log(`  Message: ${testMessage}`);
  console.log(`  Signature: ${testSignature}`);
  console.log('');
}); 