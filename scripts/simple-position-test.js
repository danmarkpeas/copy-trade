const fetch = require('node-fetch');
const crypto = require('crypto');

// User's API credentials
const API_KEY = 'jz5g7euYPZwVT4UVYaZRTnk7Gs94k5';
const API_SECRET = 'uvgdluUlyieouyefBI8WJUVTd3jqvB3fUZ37S8QzSMxoiEhYtdQhwyp4HKIe';

async function createDeltaSignature(method, path, body, timestamp, secret) {
  const message = method + path + body + timestamp;
  const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return signature;
}

async function simplePositionTest() {
  console.log('🔍 Simple Position Test...\n');

  const deltaApiUrl = 'https://api.delta.exchange';

  // Use seconds instead of milliseconds for Delta Exchange
  const timestamp = Math.floor(Date.now() / 1000) + 30; // Current time in seconds + 30 seconds
  const signature = await createDeltaSignature('GET', '/v2/positions/margined', '', timestamp, API_SECRET);
  
  console.log('🔑 Using timestamp (seconds):', timestamp);
  console.log('🔑 API Key:', API_KEY);
  console.log('🔑 Signature:', signature.substring(0, 20) + '...');
  
  try {
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
      console.log('✅ SUCCESS! Got positions data');
      console.log('📊 Total positions:', data.result?.length || 0);
      
      if (data.result && data.result.length > 0) {
        console.log('\n📋 Open Positions:');
        data.result.forEach((pos, index) => {
          console.log(`  ${index + 1}. ${pos.product_symbol}: ${pos.size} @ ${pos.avg_price}`);
        });
        
        // Test copy trading
        console.log('\n🧪 Testing copy trading...');
        const tradeData = {
          order_id: `pos_${data.result[0].product_id}_${Date.now()}`,
          symbol: data.result[0].product_symbol,
          side: parseFloat(data.result[0].size) > 0 ? 'buy' : 'sell',
          size: Math.abs(parseFloat(data.result[0].size)),
          price: parseFloat(data.result[0].avg_price) || 0,
          timestamp: new Date().toISOString(),
          order_type: 'market',
          source: 'position'
        };
        
        console.log('📊 Trade data to copy:', JSON.stringify(tradeData, null, 2));
        
        // Call copy trading API
        const copyResponse = await fetch('http://localhost:3002/api/copy-trade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            broker_id: '4bbc0ef3-db9d-4c18-9eb7-bc27ac8c289d',
            trade_data: tradeData
          })
        });
        
        if (copyResponse.ok) {
          const copyResult = await copyResponse.json();
          console.log('✅ Copy trading result:', JSON.stringify(copyResult, null, 2));
        } else {
          console.log('❌ Copy trading failed:', copyResponse.status);
        }
        
      } else {
        console.log('📊 No open positions found');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Failed:', response.status);
      console.log('Error:', errorText);
      
      // If expired signature, try with server time + buffer
      if (response.status === 401 && errorText.includes('expired_signature')) {
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.context?.server_time) {
            const serverTime = errorData.error.context.server_time;
            const retryTimestamp = serverTime + 5; // 5 seconds buffer
            const retrySignature = await createDeltaSignature('GET', '/v2/positions/margined', '', retryTimestamp, API_SECRET);
            
            console.log(`🔄 Retrying with server time + 5s: ${retryTimestamp}`);
            
            const retryResponse = await fetch(`${deltaApiUrl}/v2/positions/margined`, {
              method: 'GET',
              headers: {
                'api-key': API_KEY,
                'timestamp': retryTimestamp.toString(),
                'signature': retrySignature,
                'Content-Type': 'application/json'
              }
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              console.log('✅ Retry successful!');
              console.log('📊 Total positions:', retryData.result?.length || 0);
              
              if (retryData.result && retryData.result.length > 0) {
                console.log('\n📋 Open Positions:');
                retryData.result.forEach((pos, index) => {
                  console.log(`  ${index + 1}. ${pos.product_symbol}: ${pos.size} @ ${pos.avg_price}`);
                });
                
                // Test copy trading with retry data
                const tradeData = {
                  order_id: `pos_${retryData.result[0].product_id}_${Date.now()}`,
                  symbol: retryData.result[0].product_symbol,
                  side: parseFloat(retryData.result[0].size) > 0 ? 'buy' : 'sell',
                  size: Math.abs(parseFloat(retryData.result[0].size)),
                  price: parseFloat(retryData.result[0].avg_price) || 0,
                  timestamp: new Date().toISOString(),
                  order_type: 'market',
                  source: 'position'
                };
                
                console.log('📊 Trade data to copy:', JSON.stringify(tradeData, null, 2));
                
                const copyResponse = await fetch('http://localhost:3002/api/copy-trade', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    broker_id: '4bbc0ef3-db9d-4c18-9eb7-bc27ac8c289d',
                    trade_data: tradeData
                  })
                });
                
                if (copyResponse.ok) {
                  const copyResult = await copyResponse.json();
                  console.log('✅ Copy trading result:', JSON.stringify(copyResult, null, 2));
                } else {
                  console.log('❌ Copy trading failed:', copyResponse.status);
                }
              }
            } else {
              const retryErrorText = await retryResponse.text();
              console.log(`❌ Retry failed: ${retryResponse.status} - ${retryErrorText.substring(0, 100)}...`);
            }
          }
        } catch (parseError) {
          console.log('⚠️ Could not parse error response:', parseError.message);
        }
      }
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

simplePositionTest().catch(console.error); 