const fetch = require('node-fetch');
const crypto = require('crypto');

// User's API credentials from the logs
const API_KEY = 'jz5g7euYPZwVT4UVYaZRTnk7Gs94k5';
const API_SECRET = 'uvgdluUlyieouyefBI8WJUVTd3jqvB3fUZ37S8QzSMxoiEhYtdQhwyp4HKIe';

async function createDeltaSignature(method, path, body, timestamp, secret) {
  const message = method + path + body + timestamp;
  const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return signature;
}

async function testUserPosition() {
  console.log('🔍 Testing User\'s Delta Exchange Position...\n');

  const deltaApiUrl = 'https://api.delta.exchange';

  // Step 1: Get Delta server time
  console.log('🕐 Step 1: Getting Delta server time...');
  let deltaServerTime;
  
  try {
    const timeResponse = await fetch(`${deltaApiUrl}/v2/time`);
    if (timeResponse.ok) {
      const timeData = await timeResponse.json();
      deltaServerTime = timeData.server_time * 1000; // Convert to milliseconds
      console.log('✅ Got Delta server time:', deltaServerTime);
    } else {
      console.log('⚠️ Could not get server time, using local time');
      deltaServerTime = Date.now();
    }
  } catch (error) {
    console.log('⚠️ Error getting server time, using local time:', error.message);
    deltaServerTime = Date.now();
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Step 2: Test positions endpoint
  console.log('📊 Step 2: Testing positions endpoint...');
  
  try {
    const timestamp = deltaServerTime + 2000; // 2 second buffer
    const signature = await createDeltaSignature('GET', '/v2/positions/margined', '', timestamp, API_SECRET);
    
    console.log('🔑 Using credentials:');
    console.log('  API Key:', API_KEY);
    console.log('  Timestamp:', timestamp);
    console.log('  Signature:', signature.substring(0, 20) + '...');
    
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
      console.log('✅ Positions endpoint successful!');
      console.log('📊 Total positions:', data.result?.length || 0);
      
      if (data.result && data.result.length > 0) {
        console.log('\n📋 Open Positions:');
        data.result.forEach((pos, index) => {
          console.log(`  ${index + 1}. ${pos.product_symbol}: ${pos.size} @ ${pos.avg_price}`);
        });
        
        // Create trade data from positions
        const trades = data.result
          .filter(pos => parseFloat(pos.size) > 0)
          .map(pos => ({
            order_id: `pos_${pos.product_id}_${Date.now()}`,
            symbol: pos.product_symbol,
            side: parseFloat(pos.size) > 0 ? 'buy' : 'sell',
            size: Math.abs(parseFloat(pos.size)),
            price: parseFloat(pos.avg_price) || 0,
            timestamp: new Date().toISOString(),
            order_type: 'market',
            source: 'position'
          }));
        
        console.log('\n🔄 Generated trades from positions:', trades.length);
        console.log(JSON.stringify(trades, null, 2));
        
        return trades;
      } else {
        console.log('📊 No open positions found');
        return [];
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Positions endpoint failed:', response.status);
      console.log('Error:', errorText);
      
      // If expired signature, try to extract server time
      if (response.status === 401 && errorText.includes('expired_signature')) {
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.context?.server_time) {
            const newServerTime = errorData.error.context.server_time * 1000;
            console.log('🕐 Extracted server time from error:', newServerTime);
            
            // Retry with corrected timestamp - use server time directly
            const correctedTimestamp = newServerTime + 2000;
            const correctedSignature = await createDeltaSignature('GET', '/v2/positions/margined', '', correctedTimestamp, API_SECRET);
            
            console.log('🔄 Retrying with corrected timestamp:', correctedTimestamp);
            
            const retryResponse = await fetch(`${deltaApiUrl}/v2/positions/margined`, {
              method: 'GET',
              headers: {
                'api-key': API_KEY,
                'timestamp': correctedTimestamp.toString(),
                'signature': correctedSignature,
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
                
                const trades = retryData.result
                  .filter(pos => parseFloat(pos.size) > 0)
                  .map(pos => ({
                    order_id: `pos_${pos.product_id}_${Date.now()}`,
                    symbol: pos.product_symbol,
                    side: parseFloat(pos.size) > 0 ? 'buy' : 'sell',
                    size: Math.abs(parseFloat(pos.size)),
                    price: parseFloat(pos.avg_price) || 0,
                    timestamp: new Date().toISOString(),
                    order_type: 'market',
                    source: 'position'
                  }));
                
                console.log('\n🔄 Generated trades from positions:', trades.length);
                console.log(JSON.stringify(trades, null, 2));
                
                return trades;
              }
            } else {
              const retryErrorText = await retryResponse.text();
              console.log('❌ Retry failed:', retryResponse.status);
              console.log('Error:', retryErrorText);
              
              // Try one more time with server time + 5 seconds
              if (retryResponse.status === 401 && retryErrorText.includes('expired_signature')) {
                try {
                  const retryErrorData = JSON.parse(retryErrorText);
                  if (retryErrorData.error?.context?.server_time) {
                    const finalServerTime = retryErrorData.error.context.server_time * 1000;
                    const finalTimestamp = finalServerTime + 5000; // 5 second buffer
                    const finalSignature = await createDeltaSignature('GET', '/v2/positions/margined', '', finalTimestamp, API_SECRET);
                    
                    console.log('🔄 Final retry with 5-second buffer:', finalTimestamp);
                    
                    const finalResponse = await fetch(`${deltaApiUrl}/v2/positions/margined`, {
                      method: 'GET',
                      headers: {
                        'api-key': API_KEY,
                        'timestamp': finalTimestamp.toString(),
                        'signature': finalSignature,
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    if (finalResponse.ok) {
                      const finalData = await finalResponse.json();
                      console.log('✅ Final retry successful!');
                      console.log('📊 Total positions:', finalData.result?.length || 0);
                      
                      if (finalData.result && finalData.result.length > 0) {
                        console.log('\n📋 Open Positions:');
                        finalData.result.forEach((pos, index) => {
                          console.log(`  ${index + 1}. ${pos.product_symbol}: ${pos.size} @ ${pos.avg_price}`);
                        });
                        
                        const trades = finalData.result
                          .filter(pos => parseFloat(pos.size) > 0)
                          .map(pos => ({
                            order_id: `pos_${pos.product_id}_${Date.now()}`,
                            symbol: pos.product_symbol,
                            side: parseFloat(pos.size) > 0 ? 'buy' : 'sell',
                            size: Math.abs(parseFloat(pos.size)),
                            price: parseFloat(pos.avg_price) || 0,
                            timestamp: new Date().toISOString(),
                            order_type: 'market',
                            source: 'position'
                          }));
                        
                        console.log('\n🔄 Generated trades from positions:', trades.length);
                        console.log(JSON.stringify(trades, null, 2));
                        
                        return trades;
                      }
                    } else {
                      const finalErrorText = await finalResponse.text();
                      console.log('❌ Final retry failed:', finalResponse.status);
                      console.log('Error:', finalErrorText);
                    }
                  }
                } catch (finalParseError) {
                  console.log('⚠️ Could not parse final error response:', finalParseError.message);
                }
              }
            }
          }
        } catch (parseError) {
          console.log('⚠️ Could not parse error response:', parseError.message);
        }
      }
      
      return [];
    }
  } catch (error) {
    console.log('❌ Error with positions endpoint:', error.message);
    return [];
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Step 3: Test orders endpoint as fallback
  console.log('📋 Step 3: Testing orders endpoint...');
  
  try {
    const timestamp = deltaServerTime + 2000;
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
      console.log('✅ Orders endpoint successful!');
      console.log('📊 Total orders:', data.result?.length || 0);
      
      const openOrders = data.result?.filter(order => 
        order.status === 'open' || order.status === 'partially_filled'
      ) || [];
      
      console.log('📋 Open orders:', openOrders.length);
      
      if (openOrders.length > 0) {
        openOrders.forEach((order, index) => {
          console.log(`  ${index + 1}. ${order.product_symbol}: ${order.size} @ ${order.price} (${order.status})`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Orders endpoint failed:', response.status);
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Error with orders endpoint:', error.message);
  }

  console.log('\n🎯 Summary:');
  console.log('1. Tested Delta Exchange API connectivity');
  console.log('2. Checked for open positions');
  console.log('3. Checked for open orders');
  console.log('4. Generated trade data if positions found');
}

testUserPosition().catch(console.error); 