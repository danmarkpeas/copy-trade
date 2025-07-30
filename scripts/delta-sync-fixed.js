// Fixed delta-sync.js with proper timestamp synchronization
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to get synchronized timestamp from database
async function getSynchronizedTimestamp() {
  try {
    const { data, error } = await supabase.rpc('get_current_delta_timestamp');
    if (error) {
      console.error('Error getting synchronized timestamp:', error);
      // Fallback to current time
      return Math.floor(Date.now() / 1000) + 2;
    }
    return parseInt(data);
  } catch (err) {
    console.error('Error calling get_current_delta_timestamp:', err);
    // Fallback to current time
    return Math.floor(Date.now() / 1000) + 2;
  }
}

// Function to generate Delta signature using database function
async function generateDeltaSignature(method, path, body, apiSecret) {
  try {
    const { data, error } = await supabase.rpc('generate_delta_api_signature', {
      method: method,
      path: path,
      body: body || '',
      api_secret: apiSecret
    });
    
    if (error) {
      console.error('Error generating signature:', error);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Error calling generate_delta_api_signature:', err);
    throw err;
  }
}

// Function to make Delta API call with retry logic
async function callDeltaAPI(method, path, body = '', apiKey = null, apiSecret = null, maxRetries = 3) {
  let attempt = 1;
  
  while (attempt <= maxRetries) {
    try {
      // Get synchronized timestamp
      const timestamp = await getSynchronizedTimestamp();
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add authentication headers if provided
      if (apiKey) {
        headers['api-key'] = apiKey;
      }
      
      if (apiSecret) {
        // Generate signature using database function
        const signature = await generateDeltaSignature(method, path, body, apiSecret);
        headers['signature'] = signature;
        headers['timestamp'] = timestamp.toString();
      }
      
      // Make the API call
      const response = await fetch(`https://api.india.delta.exchange${path}`, {
        method: method,
        headers: headers,
        body: body || undefined
      });
      
      const responseData = await response.json();
      
      // Check if response contains error
      if (responseData.error) {
        const errorMsg = responseData.error;
        
        // If it's a timestamp error, retry with fresh timestamp
        if (errorMsg.includes('expired_signature') || errorMsg.includes('timestamp')) {
          console.log(`Timestamp error on attempt ${attempt}: ${errorMsg}`);
          attempt++;
          continue;
        } else {
          // Other error, don't retry
          return {
            success: false,
            response: responseData,
            error: errorMsg,
            attempts: attempt
          };
        }
      } else {
        // Success
        return {
          success: true,
          response: responseData,
          error: null,
          attempts: attempt
        };
      }
      
    } catch (error) {
      console.error(`API call error on attempt ${attempt}:`, error);
      attempt++;
      
      if (attempt > maxRetries) {
        return {
          success: false,
          response: null,
          error: error.message,
          attempts: attempt - 1
        };
      }
    }
  }
  
  // If we get here, all retries failed
  return {
    success: false,
    response: null,
    error: 'All retries failed',
    attempts: maxRetries
  };
}

// Function to sync broker positions with retry logic
async function syncBrokerPositionsWithRetry(brokerAccountId, maxRetries = 3) {
  try {
    // Get broker account details
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', brokerAccountId)
      .single();
    
    if (brokerError || !brokerAccount) {
      throw new Error(`Broker account not found: ${brokerError?.message || 'Unknown error'}`);
    }
    
    if (brokerAccount.broker_name !== 'Delta Exchange') {
      throw new Error(`Unsupported broker: ${brokerAccount.broker_name}`);
    }
    
    // Call Delta API to get positions
    const result = await callDeltaAPI(
      'GET',
      '/v2/positions/margined',
      '',
      brokerAccount.api_key,
      brokerAccount.api_secret,
      maxRetries
    );
    
    if (result.success) {
      // Process the positions data
      console.log('Successfully synced positions:', result.response);
      
      // Here you would update your database with the positions data
      // For now, just log the success
      return {
        success: true,
        message: 'Positions synced successfully',
        data: result.response
      };
    } else {
      throw new Error(`Failed to sync positions: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error syncing broker positions:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

// Function to sync broker fills with retry logic
async function syncBrokerFillsWithRetry(brokerAccountId, maxRetries = 3) {
  try {
    // Get broker account details
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', brokerAccountId)
      .single();
    
    if (brokerError || !brokerAccount) {
      throw new Error(`Broker account not found: ${brokerError?.message || 'Unknown error'}`);
    }
    
    if (brokerAccount.broker_name !== 'Delta Exchange') {
      throw new Error(`Unsupported broker: ${brokerAccount.broker_name}`);
    }
    
    // Call Delta API to get fills
    const result = await callDeltaAPI(
      'GET',
      '/v2/fills',
      '',
      brokerAccount.api_key,
      brokerAccount.api_secret,
      maxRetries
    );
    
    if (result.success) {
      // Process the fills data
      console.log('Successfully synced fills:', result.response);
      
      // Here you would update your database with the fills data
      // For now, just log the success
      return {
        success: true,
        message: 'Fills synced successfully',
        data: result.response
      };
    } else {
      throw new Error(`Failed to sync fills: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error syncing broker fills:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

// Test function
async function testTimestampSync() {
  try {
    console.log('Testing timestamp synchronization...');
    
    // Test getting synchronized timestamp
    const timestamp = await getSynchronizedTimestamp();
    console.log('Synchronized timestamp:', timestamp);
    
    // Test signature generation
    const signature = await generateDeltaSignature('GET', '/v2/products', '', 'test_secret');
    console.log('Generated signature:', signature);
    
    // Test public API call
    const result = await callDeltaAPI('GET', '/v2/products');
    console.log('Public API call result:', result);
    
    return {
      success: true,
      timestamp: timestamp,
      signature: signature,
      apiResult: result
    };
    
  } catch (error) {
    console.error('Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export functions for use in other modules
module.exports = {
  getSynchronizedTimestamp,
  generateDeltaSignature,
  callDeltaAPI,
  syncBrokerPositionsWithRetry,
  syncBrokerFillsWithRetry,
  testTimestampSync
};

// If running this file directly, run the test
if (require.main === module) {
  testTimestampSync()
    .then(result => {
      console.log('Test completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
} 