const crypto = require('crypto');

const method = 'GET';
const endpoint = '/v2/positions';
const timestamp = Math.floor(Date.now() / 1000).toString();
const apiSecret = 'GO1nTCVeglXnP0yJqtggz1cAHUlh4Lb8h4iC8zPT9Hv9Ng9SPtckENuHt0cMGO1nTCVeglXnP0yJqtggz1cAHUlh4Lb8h4iC8zPT9Hv9Ng9SPtckENuHt0cM';

const message = method + endpoint + timestamp;

const signature = crypto
  .createHmac('sha256', apiSecret)
  .update(message)
  .digest('hex');

console.log('🔑 SIGNATURE GENERATION');
console.log('Method:', method);
console.log('Endpoint:', endpoint);
console.log('Timestamp:', timestamp);
console.log('API Secret Length:', apiSecret.length);
console.log('Message:', message);
console.log('Signature:', signature);

// Test with different endpoints
console.log('\n📊 TESTING DIFFERENT ENDPOINTS:');

const endpoints = [
  '/v2/fills',
  '/v2/positions/margined',
  '/v2/positions/cash',
  '/v2/orders'
];

endpoints.forEach(endpoint => {
  const testMessage = method + endpoint + timestamp;
  const testSignature = crypto
    .createHmac('sha256', apiSecret)
    .update(testMessage)
    .digest('hex');
  
  console.log(`${endpoint}:`);
  console.log(`  Message: ${testMessage}`);
  console.log(`  Signature: ${testSignature}`);
  console.log('');
}); 