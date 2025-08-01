const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateSignature(secret, message) {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

async function testOrderSchemas() {
  console.log('🧪 TESTING DIFFERENT ORDER SCHEMAS');
  console.log('=' .repeat(50));

  // Get follower credentials
  const { data: followers } = await supabase
    .from('followers')
    .select('*')
    .eq('account_status', 'active')
    .limit(1);

  if (!followers || followers.length === 0) {
    console.log('❌ No active followers found');
    return;
  }

  const follower = followers[0];
  console.log(`Testing with follower: ${follower.follower_name}`);

  // Test different order schemas
  const schemas = [
    {
      name: 'Schema 1 - Basic with integer size',
      data: {
        product_symbol: 'BBUSD',
        size: 1,
        side: 'buy',
        order_type: 'market_order'
      }
    },
    {
      name: 'Schema 2 - With product_id and integer size',
      data: {
        product_id: 23235, // BBUSD product ID
        size: 1,
        side: 'buy',
        order_type: 'market_order'
      }
    },
    {
      name: 'Schema 3 - With client_order_id and integer size',
      data: {
        product_symbol: 'BBUSD',
        size: 1,
        side: 'buy',
        order_type: 'market_order',
        client_order_id: 'test_schema_' + Date.now()
      }
    },
    {
      name: 'Schema 4 - Complete with integer size',
      data: {
        product_id: 23235,
        size: 1,
        side: 'buy',
        order_type: 'market_order',
        client_order_id: 'test_complete_' + Date.now()
      }
    },
    {
      name: 'Schema 5 - Minimal with integer size',
      data: {
        product_symbol: 'BBUSD',
        size: 1,
        side: 'buy',
        order_type: 'market_order'
      }
    }
  ];

  for (const schema of schemas) {
    console.log(`\n🔍 Testing ${schema.name}:`);
    console.log('   📝 Order data:', JSON.stringify(schema.data, null, 2));
    
    try {
      const method = 'POST';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const path = '/v2/orders';
      const payload = JSON.stringify(schema.data);
      const signatureData = method + timestamp + path + payload;
      const signature = generateSignature(follower.api_secret, signatureData);
      
      const headers = {
        'api-key': follower.api_key,
        'timestamp': timestamp,
        'signature': signature,
        'User-Agent': 'test-client',
        'Content-Type': 'application/json'
      };

      const response = await axios.post('https://api.india.delta.exchange/v2/orders', schema.data, {
        headers,
        timeout: 10000
      });

      console.log('   ✅ SUCCESS!');
      console.log('   📄 Response:', JSON.stringify(response.data, null, 2));
      
      // Cancel the order if it was placed successfully
      if (response.data.result?.id) {
        console.log('   🔄 Cancelling order...');
        const cancelMethod = 'DELETE';
        const cancelTimestamp = Math.floor(Date.now() / 1000).toString();
        const cancelPath = '/v2/orders';
        const cancelPayload = JSON.stringify({ 
          id: response.data.result.id, 
          product_id: response.data.result.product_id 
        });
        const cancelSignatureData = cancelMethod + cancelTimestamp + cancelPath + cancelPayload;
        const cancelSignature = generateSignature(follower.api_secret, cancelSignatureData);
        
        const cancelHeaders = {
          'api-key': follower.api_key,
          'timestamp': cancelTimestamp,
          'signature': cancelSignature,
          'User-Agent': 'test-client',
          'Content-Type': 'application/json'
        };

        await axios.delete('https://api.india.delta.exchange/v2/orders', {
          headers: cancelHeaders,
          data: { id: response.data.result.id, product_id: response.data.result.product_id },
          timeout: 10000
        });
        
        console.log('   ✅ Order cancelled');
      }

      // Found working schema, break
      console.log(`\n🎉 WORKING SCHEMA FOUND: ${schema.name}`);
      console.log('📋 Use this schema in the copy trading system');
      break;

    } catch (error) {
      console.log('   ❌ Failed');
      console.log('   📄 Error:', error.response?.data?.error?.code || error.message);
      
      if (error.response?.data?.error?.context?.schema_errors) {
        console.log('   🔍 Schema errors:', JSON.stringify(error.response.data.error.context.schema_errors, null, 2));
      }
    }
  }
}

testOrderSchemas(); 