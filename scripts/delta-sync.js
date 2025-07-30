// Fixed delta-sync.js with proper timestamp synchronization
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DELTA_API_URL = 'https://api.india.delta.exchange';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Global variable to store time offset
let timeOffset = 0;

async function getActiveBrokerAccounts() {
  const { data, error } = await supabase
    .from('broker_accounts')
    .select('*')
    .eq('is_active', true)
    .eq('broker_name', 'Delta Exchange');
  if (error) throw error;
  return data;
}

// Function to get Delta server time and calculate offset
async function syncTimeWithDelta() {
  try {
    console.log('Syncing time with Delta Exchange server...');
    
    const response = await fetch(`${DELTA_API_URL}/v2/time`);
    if (!response.ok) {
      throw new Error(`Failed to get server time: ${response.status}`);
    }
    
    const data = await response.json();
    const serverTime = data.server_time;
    const localTime = Math.floor(Date.now() / 1000);
    
    timeOffset = serverTime - localTime;
    
    console.log(`Time sync: Server=${serverTime}, Local=${localTime}, Offset=${timeOffset}s`);
    
    return serverTime;
  } catch (error) {
    console.warn('Failed to sync time with Delta server, using local time:', error.message);
    timeOffset = 0;
    return Math.floor(Date.now() / 1000);
  }
}

// Function to get synchronized timestamp
function getSynchronizedTimestamp() {
  const localTime = Math.floor(Date.now() / 1000);
  return localTime + timeOffset + 1; // Add 1 second buffer
}

function getDeltaSignature(method, path, body, nonce, apiSecret) {
  const message = method + nonce + path + body;
  return crypto.createHmac('sha256', apiSecret).update(message).digest('hex');
}

// Function to make API calls with retry logic
async function callDeltaAPIWithRetry(method, path, body = '', apiKey = null, apiSecret = null, maxRetries = 3) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`API call attempt ${attempt}/${maxRetries}: ${method} ${path}`);
      
      // Get fresh synchronized timestamp for each attempt
      const nonce = getSynchronizedTimestamp().toString();
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (apiKey) {
        headers['api-key'] = apiKey;
      }
      
      if (apiSecret) {
        const signature = getDeltaSignature(method, path, body, nonce, apiSecret);
        headers['signature'] = signature;
        headers['timestamp'] = nonce;
      }
      
      const response = await fetch(`${DELTA_API_URL}${path}`, {
        method,
        headers,
        body: body || undefined
      });
      
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
      
      // Check for timestamp-related errors
      if (data.error) {
        const errorMsg = data.error.toString().toLowerCase();
        
        if (errorMsg.includes('expired_signature') || 
            errorMsg.includes('timestamp') || 
            errorMsg.includes('signature')) {
          
          console.log(`Timestamp error on attempt ${attempt}: ${data.error}`);
          
          // Re-sync time and retry
          if (attempt < maxRetries) {
            await syncTimeWithDelta();
            continue;
          }
        }
        
        // Other errors, don't retry
        throw new Error(`API Error: ${data.error}`);
      }
      
      console.log(`API call successful on attempt ${attempt}`);
      return data;
      
    } catch (error) {
      lastError = error;
      console.error(`API call failed on attempt ${attempt}:`, error.message);
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`All ${maxRetries} attempts failed. Last error: ${lastError.message}`);
}

async function fetchDeltaPositions(broker) {
  try {
    const data = await callDeltaAPIWithRetry(
      'GET',
      '/v2/positions/margined',
      '',
      broker.api_key,
      broker.api_secret
    );
    
    return data.result || [];
  } catch (error) {
    console.error(`Failed to fetch positions for ${broker.account_name}:`, error.message);
    return [];
  }
}

async function fetchDeltaFills(broker) {
  try {
    const data = await callDeltaAPIWithRetry(
      'GET',
      `/v2/fills?user_id=${broker.account_uid}`,
      '',
      broker.api_key,
      broker.api_secret
    );
    
    return data.result || [];
  } catch (error) {
    console.error(`Failed to fetch fills for ${broker.account_name}:`, error.message);
    return [];
  }
}

async function main() {
  try {
    // Sync time with Delta server first
    await syncTimeWithDelta();
    
    const brokers = await getActiveBrokerAccounts();
    console.log(`Found ${brokers.length} active Delta Exchange accounts`);
    
    for (const broker of brokers) {
      console.log(`\nProcessing broker: ${broker.account_name}`);
      
      try {
        // 1. Fetch open positions
        const positions = await fetchDeltaPositions(broker);
        console.log(`[${broker.account_name}] Fetched ${positions.length} open positions`);
        
        // Process positions
        for (const position of positions) {
          const uniqueId = `${position.user_id}_${position.product_id}`;
          if (!position.product_id || !position.user_id) {
            console.log('No product_id or user_id, skipping:', position);
            continue;
          }
          
          // Check if position already exists
          const { data: existing } = await supabase
            .from('trades')
            .select('id')
            .eq('position_key', uniqueId)
            .single();
          
          if (existing) {
            await supabase.from('trades').update({
              quantity: position.size,
              price: position.entry_price,
              status: 'open',
              created_at: position.created_at || new Date().toISOString(),
            }).eq('id', existing.id);
            continue;
          }
          
          let action = 'buy';
          if (position.side && (position.side.toLowerCase() === 'buy' || position.side.toLowerCase() === 'sell')) {
            action = position.side.toLowerCase();
          }
          
          const trade = {
            position_key: uniqueId,
            trader_id: null,
            asset: position.product_symbol,
            action,
            quantity: position.size,
            price: position.entry_price,
            status: 'open',
            created_at: position.created_at || new Date().toISOString(),
          };
          
          const { error } = await supabase.from('trades').insert(trade);
          if (error) {
            console.error('Insert error:', error.message, trade);
          }
        }
        
        // 2. Fetch trade history (fills)
        const fills = await fetchDeltaFills(broker);
        console.log(`[${broker.account_name}] Fetched ${fills.length} fills`);
        
        for (const fill of fills) {
          const { data: existing } = await supabase
            .from('trade_history')
            .select('id')
            .eq('order_id', String(fill.order_id))
            .eq('created_at', fill.created_at)
            .single();
          
          if (existing) continue;
          
          const historyRow = {
            user_id: null,
            delta_user_id: broker.account_uid,
            product_id: fill.product_id,
            product_symbol: fill.product_symbol,
            side: fill.side,
            size: fill.size,
            price: fill.price,
            order_type: fill.order_type || null,
            state: fill.state || null,
            avg_fill_price: fill.avg_fill_price || null,
            order_id: String(fill.order_id),
            created_at: fill.created_at || new Date().toISOString(),
          };
          
          const { error } = await supabase.from('trade_history').upsert(historyRow, { onConflict: 'order_id' });
          if (error) {
            console.error('Upsert error (trade_history):', error, historyRow);
          }
        }
        
        // 3. Mark trades as closed if they are no longer open
        const { data: openTrades, error: openTradesError } = await supabase
          .from('trades')
          .select('id, position_key, status')
          .eq('status', 'open');
        
        if (!openTradesError) {
          const openPositionKeys = new Set(positions.map(p => `${p.user_id}_${p.product_id}`));
          let closedCount = 0;
          
          for (const trade of openTrades) {
            if (!openPositionKeys.has(trade.position_key)) {
              await supabase.from('trades').update({ status: 'closed' }).eq('id', trade.id);
              closedCount++;
            }
          }
          
          console.log(`[${broker.account_name}] Closed ${closedCount} positions`);
        }
        
        console.log(`[${broker.account_name}] Sync completed successfully`);
        
      } catch (error) {
        console.error(`Error processing broker ${broker.account_name}:`, error.message);
      }
    }
    
    console.log('\nAll broker syncs completed');
    
  } catch (error) {
    console.error('Main sync error:', error.message);
    process.exit(1);
  }
}

// Run the sync
if (require.main === module) {
  main();
}

module.exports = {
  syncTimeWithDelta,
  callDeltaAPIWithRetry,
  fetchDeltaPositions,
  fetchDeltaFills
}; 