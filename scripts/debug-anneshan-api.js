const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test different signature methods
function generateSignatureV1(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

function generateSignatureV2(secret, message) {
  return crypto.createHmac('sha256', secret).update(message, 'utf8').digest('hex');
}

async function testSignatureMethods(apiKey, apiSecret) {
  console.log('🔍 DEBUGGING ANNESHAN API SIGNATURE METHODS');
  console.log('===========================================\n');

  const timestamp = Date.now().toString();
  const method = 'GET';
  const endpoint = '/wallet/balances';
  const message = timestamp + method + endpoint;

  console.log('📊 Signature Generation Test:');
  console.log(`   Timestamp: ${timestamp}`);
  console.log(`   Method: ${method}`);
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Message: ${message}`);
  console.log(`   API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`   API Secret: ${apiSecret.substring(0, 8)}...`);
  console.log('');

  const sig1 = generateSignatureV1(apiSecret, message);
  const sig2 = generateSignatureV2(apiSecret, message);

  console.log('🔐 Generated Signatures:');
  console.log(`   V1 (default): ${sig1}`);
  console.log(`   V2 (utf8): ${sig2}`);
  console.log(`   Match: ${sig1 === sig2 ? 'YES' : 'NO'}`);
  console.log('');

  // Test with different timestamp formats
  const now = Date.now();
  const timestamps = [
    now.toString(),
    Math.floor(now / 1000).toString(), // Unix timestamp
    new Date().toISOString(),
    Math.floor(now / 1000).toString() + '000' // With milliseconds
  ];

  console.log('⏰ Testing different timestamp formats:');
  timestamps.forEach((ts, i) => {
    const msg = ts + method + endpoint;
    const sig = generateSignatureV1(apiSecret, msg);
    console.log(`   ${i + 1}. ${ts} -> ${sig.substring(0, 16)}...`);
  });
  console.log('');

  return { sig1, sig2, timestamp, message };
}

async function testPublicEndpoints() {
  console.log('🌐 Testing public endpoints (no auth required):');
  console.log('===============================================\n');

  try {
    // Test public products endpoint
    const response = await fetch('https://api.delta.exchange/v2/products');
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Public products endpoint working');
      console.log(`   Total products: ${data.result ? data.result.length : 'N/A'}`);
    } else {
      console.log('❌ Public products endpoint failed');
      console.log(`   Status: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Network error testing public endpoint');
    console.log(`   Error: ${error.message}`);
  }
  console.log('');
}

async function testAnneshanCredentials() {
  console.log('🧪 TESTING ANNESHAN CREDENTIALS DETAILED');
  console.log('========================================\n');

  try {
    // Get Anneshan follower from database
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_name', 'Anneshan')
      .limit(1);

    if (error || !followers || followers.length === 0) {
      console.error('❌ Anneshan follower not found');
      return;
    }

    const anneshan = followers[0];
    console.log('👥 Anneshan Details:');
    console.log(`   Name: ${anneshan.follower_name}`);
    console.log(`   Status: ${anneshan.account_status}`);
    console.log(`   API Key Length: ${anneshan.api_key ? anneshan.api_key.length : 0}`);
    console.log(`   API Secret Length: ${anneshan.api_secret ? anneshan.api_secret.length : 0}`);
    console.log(`   API Key Format: ${anneshan.api_key ? (anneshan.api_key.match(/^[a-zA-Z0-9]+$/) ? 'Valid' : 'Invalid chars') : 'Not set'}`);
    console.log(`   API Secret Format: ${anneshan.api_secret ? (anneshan.api_secret.match(/^[a-zA-Z0-9]+$/) ? 'Valid' : 'Invalid chars') : 'Not set'}`);
    console.log('');

    if (!anneshan.api_key || !anneshan.api_secret) {
      console.error('❌ API credentials not set');
      return;
    }

    // Test signature methods
    const sigInfo = await testSignatureMethods(anneshan.api_key, anneshan.api_secret);

    // Test public endpoints
    await testPublicEndpoints();

    // Try a simple authenticated request with detailed logging
    console.log('🔐 Testing authenticated request with detailed logging:');
    console.log('=======================================================\n');

    const timestamp = Date.now().toString();
    const method = 'GET';
    const endpoint = '/wallet/balances';
    const message = timestamp + method + endpoint;
    const signature = generateSignatureV1(anneshan.api_secret, message);

    const url = `https://api.delta.exchange/v2${endpoint}`;
    const headers = {
      'api-key': anneshan.api_key,
      'signature': signature,
      'timestamp': timestamp,
      'Content-Type': 'application/json'
    };

    console.log('📤 Request Details:');
    console.log(`   URL: ${url}`);
    console.log(`   Method: ${method}`);
    console.log(`   Headers:`, JSON.stringify(headers, null, 2));
    console.log('');

    try {
      const response = await fetch(url, {
        method: method,
        headers: headers
      });

      const responseText = await response.text();
      console.log('📥 Response Details:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Status Text: ${response.statusText}`);
      console.log(`   Headers:`, JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
      console.log(`   Body: ${responseText}`);
      console.log('');

      if (response.ok) {
        console.log('✅ Request successful!');
      } else {
        console.log('❌ Request failed');
        
        // Try to parse error response
        try {
          const errorData = JSON.parse(responseText);
          console.log('🔍 Error Analysis:');
          console.log(`   Error Code: ${errorData.error?.code || 'Unknown'}`);
          console.log(`   Error Context: ${JSON.stringify(errorData.error?.context || {}, null, 2)}`);
          
          if (errorData.error?.code === 'expired_signature') {
            console.log('💡 Signature expired - possible causes:');
            console.log('   1. Server time sync issue');
            console.log('   2. Incorrect signature generation');
            console.log('   3. API credentials are invalid');
          }
        } catch (e) {
          console.log('   Could not parse error response');
        }
      }

    } catch (error) {
      console.log('❌ Network error:');
      console.log(`   Error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error in detailed test:', error.message);
  }
}

// Run the debug test
testAnneshanCredentials(); 