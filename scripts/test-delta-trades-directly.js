const fetch = require('node-fetch');
const crypto = require('crypto');

// Broker credentials from the logs
const API_KEY = 'jz5g7euYPZwVT4UVYaZRTnk7Gs94k5';
const API_SECRET = 'uvgdluUlyieouyefBI8WJUVTd3jqvB3fUZ37S8QzSMxoiEhYtdQhwyp4HKIe';

async function createDeltaSignature(method, path, body, timestamp, secret) {
  const message = method + path + body + timestamp;
  const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return signature;
}

async function testDeltaExchangeAPI() {
  console.log('🔍 Testing Delta Exchange API directly with broker credentials...\n');

  const deltaApiUrl = 'https://api.delta.exchange';

  // Test 1: Test products endpoint (no auth required)
  console.log('📞 Test 1: Testing products endpoint (no auth)...');
  try {
    const response = await fetch(`${deltaApiUrl}/v2/products`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Products endpoint works');
      console.log('Products count:', data.result?.length || 0);
    } else {
      console.log('❌ Products endpoint failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Error with products endpoint:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Test positions endpoint (requires auth)
  console.log('📞 Test 2: Testing positions endpoint (with auth)...');
  try {
    const timestamp = Date.now() + 5000; // 5 second buffer
    const signature = await createDeltaSignature('GET', '/v2/positions/margined', '', timestamp, API_SECRET);
    
    const response = await fetch(`${deltaApiUrl}/v2/positions/margined`, {
      method: 'GET',
      headers: {
        'api-key': API_KEY,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Positions endpoint works');
      console.log('Positions count:', data.result?.length || 0);
      
      if (data.result && data.result.length > 0) {
        console.log('Sample position:', JSON.stringify(data.result[0], null, 2));
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Positions endpoint failed:', response.status);
      console.log('Error:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Error with positions endpoint:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Test fills endpoint (requires auth)
  console.log('📞 Test 3: Testing fills endpoint (with auth)...');
  try {
    const timestamp = Date.now() + 5000; // 5 second buffer
    const signature = await createDeltaSignature('GET', '/v2/fills', '', timestamp, API_SECRET);
    
    const response = await fetch(`${deltaApiUrl}/v2/fills`, {
      method: 'GET',
      headers: {
        'api-key': API_KEY,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Fills endpoint works');
      console.log('Fills count:', data.result?.length || 0);
      
      if (data.result && data.result.length > 0) {
        console.log('Sample fill:', JSON.stringify(data.result[0], null, 2));
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Fills endpoint failed:', response.status);
      console.log('Error:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Error with fills endpoint:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Test orders endpoint (requires auth)
  console.log('📞 Test 4: Testing orders endpoint (with auth)...');
  try {
    const timestamp = Date.now() + 5000; // 5 second buffer
    const signature = await createDeltaSignature('GET', '/v2/orders', '', timestamp, API_SECRET);
    
    const response = await fetch(`${deltaApiUrl}/v2/orders`, {
      method: 'GET',
      headers: {
        'api-key': API_KEY,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Orders endpoint works');
      console.log('Orders count:', data.result?.length || 0);
      
      if (data.result && data.result.length > 0) {
        console.log('Sample order:', JSON.stringify(data.result[0], null, 2));
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Orders endpoint failed:', response.status);
      console.log('Error:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Error with orders endpoint:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: Test with different timestamp approaches
  console.log('📞 Test 5: Testing with different timestamp approaches...');
  const timestampAttempts = [
    Date.now() + 2000,  // 2 second buffer
    Date.now() + 5000,  // 5 second buffer
    Date.now() + 10000, // 10 second buffer
  ];

  for (let i = 0; i < timestampAttempts.length; i++) {
    try {
      const timestamp = timestampAttempts[i];
      console.log(`🕐 Attempt ${i + 1}/${timestampAttempts.length} with timestamp: ${timestamp}`);
      
      const signature = await createDeltaSignature('GET', '/v2/fills', '', timestamp, API_SECRET);
      
      const response = await fetch(`${deltaApiUrl}/v2/fills`, {
        method: 'GET',
        headers: {
          'api-key': API_KEY,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Attempt ${i + 1} successful:`, data.result?.length || 0, 'fills');
        break;
      } else {
        const errorText = await response.text();
        console.log(`❌ Attempt ${i + 1} failed: ${response.status} - ${errorText.substring(0, 100)}...`);
        
        if (response.status === 401 && errorText.includes('expired_signature')) {
          console.log('🕐 Expired signature detected, trying next timestamp...');
          continue;
        }
        break;
      }
    } catch (error) {
      console.log(`❌ Network error on attempt ${i + 1}:`, error.message);
      continue;
    }
  }

  console.log('\n🔍 Analysis:');
  console.log('1. If all endpoints return 0 results, the broker account may not have any trades');
  console.log('2. If endpoints fail with 401/403, API permissions may be insufficient');
  console.log('3. If endpoints fail with 404, the endpoints may not exist or be accessible');
  console.log('4. If timestamp errors occur, there may be clock synchronization issues');
  console.log('5. Check if trades were actually executed in Delta Exchange');
}

testDeltaExchangeAPI().catch(console.error); 