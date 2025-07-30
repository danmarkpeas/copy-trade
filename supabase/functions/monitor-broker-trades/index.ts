import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { broker_id } = await req.json()

    if (!broker_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: broker_id',
          success: false 
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    console.log('🔍 Starting trade monitoring for broker:', broker_id)

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get broker account details
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', broker_id)
      .eq('is_active', true)
      .single()

    if (brokerError || !brokerAccount) {
      console.error('❌ Broker account not found:', brokerError)
      return new Response(
        JSON.stringify({ 
          error: 'Broker account not found or inactive',
          success: false 
        }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    console.log('✅ Broker account found:', brokerAccount.account_name)

    // 2. Get recent trades from Delta Exchange API
    const recentTrades = await getRecentTradesFromDelta(brokerAccount)
    
    if (!recentTrades.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch trades from Delta Exchange',
          details: recentTrades.error,
          success: false 
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    console.log(`📊 Found ${recentTrades.trades.length} recent trades from Delta Exchange`)

    // 2.5. Also get trades from our database
    const { data: dbTrades, error: dbError } = await supabase
      .from('trades')
      .select('*')
      .eq('trader_id', brokerAccount.user_id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(10)

    if (dbError) {
      console.error('❌ Error fetching database trades:', dbError)
    } else {
      console.log(`📊 Found ${dbTrades?.length || 0} trades in database`)
    }

    // Combine trades from both sources
    const allTrades = [
      ...recentTrades.trades,
      ...(dbTrades?.map(trade => ({
        order_id: trade.id,
        symbol: trade.asset,
        side: trade.action,
        size: trade.quantity,
        price: trade.price,
        timestamp: trade.created_at,
        order_type: 'market',
        source: 'database'
      })) || [])
    ]

    console.log(`📊 Total trades found: ${allTrades.length}`)

    // 3. Check for new trades that haven't been copied yet
    const newTrades = await findNewTrades(supabase, brokerAccount.user_id, allTrades)
    
    console.log(`🆕 Found ${newTrades.length} new trades to copy`)

    // 4. Copy each new trade
    const copyResults = []
    
    for (const trade of newTrades) {
      try {
        console.log(`🔄 Copying trade: ${trade.symbol} ${trade.side} ${trade.size}`)
        
        // Trigger copy trading for this trade
        const copyResult = await triggerCopyTrading(supabase, broker_id, trade)
        
        copyResults.push({
          trade_id: trade.order_id,
          symbol: trade.symbol,
          side: trade.side,
          size: trade.size,
          price: trade.price,
          success: copyResult.success,
          message: copyResult.message
        })

        console.log(`✅ Copy result for ${trade.symbol}:`, copyResult.success ? 'SUCCESS' : 'FAILED')

      } catch (error) {
        console.error(`❌ Error copying trade ${trade.order_id}:`, error)
        copyResults.push({
          trade_id: trade.order_id,
          symbol: trade.symbol,
          side: trade.side,
          size: trade.size,
          price: trade.price,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // 5. Log monitoring results
    await supabase
      .from('trade_history')
      .insert({
        user_id: brokerAccount.user_id,
        product_symbol: 'MONITORING_LOG',
        side: 'monitor',
        size: newTrades.length,
        price: 0,
        order_type: 'monitoring',
        state: 'completed',
        avg_fill_price: 0,
        order_id: `monitor_${Date.now()}`,
        created_at: new Date().toISOString()
      })

    console.log('✅ Trade monitoring completed:', {
      broker_id,
      total_trades_found: allTrades.length,
      new_trades_copied: newTrades.length,
      successful_copies: copyResults.filter(r => r.success).length,
      failed_copies: copyResults.filter(r => !r.success).length
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Trade monitoring completed',
        broker_id,
        total_trades_found: allTrades.length,
        new_trades_copied: newTrades.length,
        copy_results: copyResults,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )

  } catch (error) {
    console.error('❌ Trade monitoring error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
})

// Function to get recent trades from Delta Exchange
async function getRecentTradesFromDelta(brokerAccount: any) {
  try {
    const deltaApiUrl = 'https://api.delta.exchange'
    
    console.log('🔄 Using improved timestamp synchronization for Delta Exchange API...')
    
    // Step 1: Get Delta server time first
    console.log('🕐 Getting Delta server time...')
    let deltaServerTime: number;
    
    try {
      const timeResponse = await fetch(`${deltaApiUrl}/v2/time`)
      if (timeResponse.ok) {
        const timeData = await timeResponse.json()
        deltaServerTime = timeData.server_time * 1000 // Convert to milliseconds
        console.log('✅ Got Delta server time:', deltaServerTime)
      } else {
        console.log('⚠️ Could not get server time, using local time')
        deltaServerTime = Date.now()
      }
    } catch (error) {
      console.log('⚠️ Error getting server time, using local time:', error)
      deltaServerTime = Date.now()
    }
    
    // Step 2: Try to get positions first (simpler endpoint)
    console.log('📊 Attempting to get positions data...')
    
    try {
      // Use Delta server time with buffer - convert to seconds for Delta Exchange
      const timestamp = Math.floor(deltaServerTime / 1000) + 5 // 5 second buffer in seconds
      const signature = await createDeltaSignature(
        'GET',
        '/v2/positions/margined',
        '',
        timestamp,
        brokerAccount.api_secret
      )
      
      const positionsResponse = await fetch(`${deltaApiUrl}/v2/positions/margined`, {
        method: 'GET',
        headers: {
          'api-key': brokerAccount.api_key,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'Content-Type': 'application/json'
        }
      })
      
      if (positionsResponse.ok) {
        const positionsData = await positionsResponse.json()
        console.log('✅ Got positions data successfully')
        console.log('📊 Positions found:', positionsData.result?.length || 0)
        
        // Create simulated trades from positions
        const simulatedTrades = positionsData.result
          .filter((pos: any) => parseFloat(pos.size) > 0)
          .map((pos: any) => ({
            order_id: `pos_${pos.product_id}_${Date.now()}`,
            symbol: pos.product_symbol,
            side: parseFloat(pos.size) > 0 ? 'buy' : 'sell',
            size: Math.abs(parseFloat(pos.size)),
            price: parseFloat(pos.avg_price) || 0,
            timestamp: new Date().toISOString(),
            order_type: 'market',
            source: 'position'
          }))
        
        console.log('📊 Simulated trades from positions:', simulatedTrades.length)
        
        return {
          success: true,
          trades: simulatedTrades,
          note: `Found ${simulatedTrades.length} open positions that can be copied`
        }
      } else {
        const errorText = await positionsResponse.text()
        console.log(`⚠️ Positions endpoint failed: ${positionsResponse.status} - ${errorText.substring(0, 100)}...`)
        
        // If it's an expired signature, try to extract server time and retry
        if (positionsResponse.status === 401 && errorText.includes('expired_signature')) {
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.error?.context?.server_time) {
              const newServerTime = errorData.error.context.server_time // Already in seconds
              console.log('🕐 Extracted server time from error:', newServerTime)
              
              // Retry with corrected timestamp
              const correctedTimestamp = newServerTime + 5 // 5 second buffer
              const correctedSignature = await createDeltaSignature(
                'GET',
                '/v2/positions/margined',
                '',
                correctedTimestamp,
                brokerAccount.api_secret
              )
              
              const retryResponse = await fetch(`${deltaApiUrl}/v2/positions/margined`, {
                method: 'GET',
                headers: {
                  'api-key': brokerAccount.api_key,
                  'timestamp': correctedTimestamp.toString(),
                  'signature': correctedSignature,
                  'Content-Type': 'application/json'
                }
              })
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json()
                console.log('✅ Got positions data with corrected timestamp')
                console.log('📊 Positions found:', retryData.result?.length || 0)
                
                const simulatedTrades = retryData.result
                  .filter((pos: any) => parseFloat(pos.size) > 0)
                  .map((pos: any) => ({
                    order_id: `pos_${pos.product_id}_${Date.now()}`,
                    symbol: pos.product_symbol,
                    side: parseFloat(pos.size) > 0 ? 'buy' : 'sell',
                    size: Math.abs(parseFloat(pos.size)),
                    price: parseFloat(pos.avg_price) || 0,
                    timestamp: new Date().toISOString(),
                    order_type: 'market',
                    source: 'position'
                  }))
                
                console.log('📊 Simulated trades from positions:', simulatedTrades.length)
                
                return {
                  success: true,
                  trades: simulatedTrades,
                  note: `Found ${simulatedTrades.length} open positions that can be copied`
                }
              } else {
                const retryErrorText = await retryResponse.text()
                console.log(`⚠️ Retry failed: ${retryResponse.status} - ${retryErrorText.substring(0, 100)}...`)
                
                // If it's an invalid API key, the credentials might not have position access
                if (retryResponse.status === 401 && retryErrorText.includes('invalid_api_key')) {
                  console.log('⚠️ API credentials may not have position access permissions')
                  console.log('📋 This is normal - the system will still work with fills data')
                }
              }
            }
          } catch (parseError) {
            console.log('⚠️ Could not parse error response:', parseError)
          }
        }
      }
    } catch (positionsError) {
      console.log('⚠️ Error with positions endpoint:', positionsError)
    }
    
    // Step 3: If positions failed, try fills with improved timestamp handling
    console.log('📈 Attempting to get fills data...')
    
    const timestampAttempts = [
      deltaServerTime + 2000,  // 2 second buffer
      deltaServerTime + 5000,  // 5 second buffer
      deltaServerTime + 10000, // 10 second buffer
    ]
    
    for (let i = 0; i < timestampAttempts.length; i++) {
      try {
        const timestamp = timestampAttempts[i]
        console.log(`🕐 Attempt ${i + 1}/${timestampAttempts.length} with timestamp: ${timestamp}`)
        
        const signature = await createDeltaSignature(
          'GET',
          '/v2/fills',
          '',
          timestamp,
          brokerAccount.api_secret
        )
        
        const fillsResponse = await fetch(`${deltaApiUrl}/v2/fills`, {
          method: 'GET',
          headers: {
            'api-key': brokerAccount.api_key,
            'timestamp': timestamp.toString(),
            'signature': signature,
            'Content-Type': 'application/json'
          }
        })
        
        if (fillsResponse.ok) {
          const fillsData = await fillsResponse.json()
          console.log('✅ Got fills data successfully:', fillsData.result?.length || 0, 'fills')
          
          // Convert fills to trade format
          const trades = (fillsData.result || []).map((fill: any) => ({
            order_id: fill.order_id,
            symbol: fill.product_symbol,
            side: fill.side,
            size: parseFloat(fill.size),
            price: parseFloat(fill.price),
            timestamp: fill.created_at,
            order_type: fill.order_type || 'market',
            source: 'fill'
          }))
          
          // Filter for recent trades (last 24 hours)
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
          const recentTrades = trades.filter((trade: any) =>
            new Date(trade.timestamp).getTime() > oneDayAgo
          )
          
          return {
            success: true,
            trades: recentTrades,
            note: `Successfully retrieved ${recentTrades.length} recent trades`
          }
        } else {
          const errorText = await fillsResponse.text()
          console.log(`❌ Fills attempt ${i + 1} failed: ${fillsResponse.status} - ${errorText.substring(0, 100)}...`)
          
          // If it's an expired signature, try to extract server time and retry
          if (fillsResponse.status === 401 && errorText.includes('expired_signature')) {
            try {
              const errorData = JSON.parse(errorText)
              if (errorData.error?.context?.server_time) {
                const newServerTime = errorData.error.context.server_time * 1000 // Convert to milliseconds
                console.log('🕐 Extracted server time from error:', newServerTime)
                
                // Retry with corrected timestamp
                const correctedTimestamp = newServerTime + 2000
                const correctedSignature = await createDeltaSignature(
                  'GET',
                  '/v2/fills',
                  '',
                  correctedTimestamp,
                  brokerAccount.api_secret
                )
                
                const retryResponse = await fetch(`${deltaApiUrl}/v2/fills`, {
                  method: 'GET',
                  headers: {
                    'api-key': brokerAccount.api_key,
                    'timestamp': correctedTimestamp.toString(),
                    'signature': correctedSignature,
                    'Content-Type': 'application/json'
                  }
                })
                
                if (retryResponse.ok) {
                  const retryData = await retryResponse.json()
                  console.log('✅ Got fills data with corrected timestamp:', retryData.result?.length || 0, 'fills')
                  
                  const trades = (retryData.result || []).map((fill: any) => ({
                    order_id: fill.order_id,
                    symbol: fill.product_symbol,
                    side: fill.side,
                    size: parseFloat(fill.size),
                    price: parseFloat(fill.price),
                    timestamp: fill.created_at,
                    order_type: fill.order_type || 'market',
                    source: 'fill'
                  }))
                  
                  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
                  const recentTrades = trades.filter((trade: any) =>
                    new Date(trade.timestamp).getTime() > oneDayAgo
                  )
                  
                  return {
                    success: true,
                    trades: recentTrades,
                    note: `Successfully retrieved ${recentTrades.length} recent trades with corrected timestamp`
                  }
                }
              }
            } catch (parseError) {
              console.log('⚠️ Could not parse error response:', parseError)
            }
          }
          
          break
        }
      } catch (error) {
        console.log(`❌ Network error on attempt ${i + 1}:`, error)
        continue
      }
    }
    
    // Step 4: Try to get open orders as a fallback
    console.log('📋 Attempting to get open orders...')
    
    try {
      const timestamp = deltaServerTime + 2000
      const signature = await createDeltaSignature(
        'GET',
        '/v2/orders',
        '',
        timestamp,
        brokerAccount.api_secret
      )
      
      const ordersResponse = await fetch(`${deltaApiUrl}/v2/orders`, {
        method: 'GET',
        headers: {
          'api-key': brokerAccount.api_key,
          'timestamp': timestamp.toString(),
          'signature': signature,
          'Content-Type': 'application/json'
        }
      })
      
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        console.log('✅ Got orders data successfully:', ordersData.result?.length || 0, 'orders')
        
        // Convert open orders to trade format
        const openOrders = (ordersData.result || [])
          .filter((order: any) => order.status === 'open' || order.status === 'partially_filled')
          .map((order: any) => ({
            order_id: order.id,
            symbol: order.product_symbol,
            side: order.side,
            size: parseFloat(order.size),
            price: parseFloat(order.price),
            timestamp: order.created_at,
            order_type: order.order_type || 'market',
            source: 'order'
          }))
        
        if (openOrders.length > 0) {
          return {
            success: true,
            trades: openOrders,
            note: `Found ${openOrders.length} open orders that can be copied`
          }
        }
      } else {
        const errorText = await ordersResponse.text()
        console.log(`⚠️ Orders endpoint failed: ${ordersResponse.status} - ${errorText.substring(0, 100)}...`)
      }
    } catch (ordersError) {
      console.log('⚠️ Error with orders endpoint:', ordersError)
    }
    
    // Step 5: If all attempts failed, return empty trades with note
    console.log('⚠️ All API attempts failed, returning empty trade list')
    
    return {
      success: true,
      trades: [],
      note: 'No trades retrieved - API endpoints not accessible with current credentials or no trades found'
    }
    
  } catch (error) {
    console.error('❌ Error in getRecentTradesFromDelta:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Function to create Delta Exchange signature
async function createDeltaSignature(
  method: string,
  path: string,
  body: string,
  timestamp: number,
  secret: string
): Promise<string> {
  // Delta Exchange expects: timestamp + method + path + body
  const message = timestamp.toString() + method + path + body
  
  // Use Web Crypto API for HMAC-SHA256
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(message)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Function to find new trades that haven't been copied yet
async function findNewTrades(supabase: any, userId: string, recentTrades: any[]) {
  try {
    // Get the last copied trade timestamp for this user
    const { data: lastTrade } = await supabase
      .from('trade_history')
      .select('created_at')
      .eq('user_id', userId)
      .neq('order_id', 'monitor_%')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    const lastTradeTime = lastTrade ? new Date(lastTrade.created_at).getTime() : 0
    
    // Filter for trades newer than the last copied trade
    const newTrades = recentTrades.filter(trade => 
      new Date(trade.timestamp).getTime() > lastTradeTime
    )
    
    return newTrades
    
  } catch (error) {
    console.error('❌ Error finding new trades:', error)
    return recentTrades // Return all trades if error
  }
}

// Function to trigger copy trading for a specific trade
async function triggerCopyTrading(supabase: any, brokerId: string, trade: any) {
  try {
    // Call the copy-trade Edge Function
    const copyTradeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/copy-trade`
    
    const response = await fetch(copyTradeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        broker_id: brokerId,
        trade_data: {
          symbol: trade.symbol,
          side: trade.side,
          size: trade.size,
          price: trade.price,
          order_type: trade.order_type,
          order_id: trade.order_id
        }
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Copy trading failed: ${response.status} - ${errorText}`)
    }
    
    const result = await response.json()
    
    return {
      success: result.success,
      message: result.message || 'Copy trading completed'
    }
    
  } catch (error) {
    console.error('❌ Error triggering copy trading:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
} 

// Function to get broker account dynamically from database
async function getBrokerAccountFromDatabase(supabase: any, brokerId?: string) {
  try {
    let query = supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true);

    if (brokerId) {
      query = query.eq('id', brokerId);
    }

    const { data: brokerAccounts, error } = await query.order('created_at', { ascending: false }).limit(1);

    if (error) {
      console.log('❌ Error fetching broker account:', error.message);
      return null;
    }

    if (!brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return null;
    }

    return brokerAccounts[0];
  } catch (error) {
    console.log('❌ Error in getBrokerAccountFromDatabase:', error);
    return null;
  }
}

// Function to get followers dynamically from database
async function getFollowersFromDatabase(supabase: any, userId?: string) {
  try {
    let query = supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (userId) {
      query = query.eq('subscribed_to', userId);
    }

    const { data: followers, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.log('❌ Error fetching followers:', error.message);
      return [];
    }

    return followers || [];
  } catch (error) {
    console.log('❌ Error in getFollowersFromDatabase:', error);
    return [];
  }
}

// Function to get user by email dynamically
async function getUserByEmail(supabase: any, email: string) {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error) {
      console.log('❌ Error fetching user by email:', error.message);
      return null;
    }

    return users && users.length > 0 ? users[0] : null;
  } catch (error) {
    console.log('❌ Error in getUserByEmail:', error);
    return null;
  }
} 