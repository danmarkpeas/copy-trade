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

console.log('Timestamp:', timestamp);
console.log('Message:', message);
console.log('Signature:', signature); 