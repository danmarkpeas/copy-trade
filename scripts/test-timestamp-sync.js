const fetch = require('node-fetch');

async function testTimestampSync() {
  console.log('🧪 Testing Timestamp Synchronization with Delta Exchange...\n');
  
  const deltaApiUrl = 'https://api.delta.exchange';
  
  // Test 1: Check if we can get server time from error response
  console.log('1️⃣ Testing expired signature error handling...');
  
  try {
    // Use a very old timestamp to trigger expired_signature error
    const oldTimestamp = Date.now() - 60000; // 1 minute ago
    
    const response = await fetch(`${deltaApiUrl}/v2/fills`, {
      method: 'GET',
      headers: {
        'api-key': 'test_key_30_chars_long_here',
        'timestamp': oldTimestamp.toString(),
        'signature': 'dummy_signature_for_testing',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      const errorText = await response.text();
      console.log('✅ Got 401 error as expected');
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error && errorData.error.code === 'expired_signature') {
          console.log('✅ Confirmed expired_signature error');
          
          if (errorData.error.context && errorData.error.context.server_time) {
            const serverTime = errorData.error.context.server_time;
            const requestTime = errorData.error.context.request_time;
            
            console.log(`📅 Delta Server Time: ${serverTime}`);
            console.log(`📅 Request Time: ${requestTime}`);
            console.log(`⏱️ Time Difference: ${requestTime - serverTime}ms`);
            
            // Calculate proper timestamp
            const properTimestamp = serverTime * 1000 + 2000; // Convert to ms and add buffer
            console.log(`🕐 Proper Timestamp: ${properTimestamp}`);
            
            return {
              success: true,
              serverTime: serverTime,
              requestTime: requestTime,
              timeDifference: requestTime - serverTime,
              properTimestamp: properTimestamp
            };
          } else {
            console.log('❌ No server_time in error context');
          }
        } else {
          console.log('❌ Not an expired_signature error');
        }
      } catch (parseError) {
        console.log('❌ Could not parse error response:', parseError.message);
      }
    } else {
      console.log(`❌ Unexpected response: ${response.status}`);
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
  
  // Test 2: Check current time vs Delta time
  console.log('\n2️⃣ Testing current time synchronization...');
  
  try {
    const currentTime = Date.now();
    console.log(`📅 Current Time: ${currentTime}`);
    console.log(`📅 Current Time (seconds): ${Math.floor(currentTime / 1000)}`);
    
    // Test products endpoint to see if we can get any time info
    const productsResponse = await fetch(`${deltaApiUrl}/v2/products`);
    if (productsResponse.ok) {
      console.log('✅ Products endpoint accessible');
      const productsData = await productsResponse.json();
      console.log(`📊 Products count: ${productsData.result?.length || 0}`);
    } else {
      console.log(`❌ Products endpoint failed: ${productsResponse.status}`);
    }
    
  } catch (error) {
    console.log('❌ Error testing current time:', error.message);
  }
  
  return { success: false };
}

// Run the test
testTimestampSync().then(result => {
  console.log('\n🎯 Test Summary:');
  if (result.success) {
    console.log('✅ Timestamp synchronization mechanism is working');
    console.log(`📊 Server time difference: ${result.timeDifference}ms`);
    console.log('💡 The system can now properly sync with Delta Exchange server time');
  } else {
    console.log('❌ Timestamp synchronization needs improvement');
    console.log('💡 Check the error messages above for details');
  }
}).catch(console.error); 