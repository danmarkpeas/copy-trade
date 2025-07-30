import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { broker_id, test_mode = false, time_window_minutes = 20 } = await req.json()

    if (!broker_id) {
      return new Response(
        JSON.stringify({ error: 'broker_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔍 Triggering real-time trade monitoring for broker:', broker_id)

    // Get broker account
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', broker_id)
      .single()

    if (brokerError || !brokerAccount) {
      console.log('❌ Broker account not found:', brokerError)
      return new Response(
        JSON.stringify({ error: 'Broker account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get active followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('master_broker_account_id', broker_id)
      .eq('account_status', 'active')

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError)
      return new Response(
        JSON.stringify({ error: 'Error fetching followers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Found ${followers?.length || 0} active followers`)

    // Fetch broker trades
    const trades = await fetchBrokerTrades(brokerAccount)
    console.log(`📊 Found ${trades.length} recent trades`)

    // Process trades and create copy trades
    const copyResults = []
    let tradesCopied = 0

    for (const trade of trades) {
      for (const follower of followers || []) {
        try {
          // Calculate copy size based on follower settings
          let copySize = trade.size
          
          if (follower.copy_mode === 'multiplier') {
            copySize = Math.floor(trade.size * 0.1) // 10% of original
          } else if (follower.copy_mode === 'fixed_lot') {
            copySize = 1 // Fixed lot size
          }

          if (copySize > 0) {
            const copyTrade = {
              master_trade_id: trade.order_id,
              master_broker_id: broker_id,
              follower_id: follower.user_id,
              original_symbol: trade.symbol,
              original_side: trade.side,
              original_size: trade.size,
              original_price: trade.price,
              copied_size: copySize,
              copied_price: trade.price,
              status: 'executed',
              entry_time: trade.timestamp
            }

            const { data: newTrade, error: insertError } = await supabase
              .from('copy_trades')
              .insert(copyTrade)
              .select()
              .single()

            if (insertError) {
              console.log(`❌ Error creating copy trade for ${follower.follower_name}:`, insertError)
              copyResults.push({
                follower: follower.follower_name,
                trade: trade.symbol,
                success: false,
                error: insertError.message
              })
            } else {
              console.log(`✅ Created copy trade for ${follower.follower_name}: ${trade.symbol} ${trade.side} ${copySize}`)
              copyResults.push({
                follower: follower.follower_name,
                trade: trade.symbol,
                success: true,
                copySize: copySize
              })
              tradesCopied++
            }
          }
        } catch (error) {
          console.log(`❌ Error processing trade for ${follower.follower_name}:`, error)
          copyResults.push({
            follower: follower.follower_name,
            trade: trade.symbol,
            success: false,
            error: error.message
          })
        }
      }
    }

    // Also check for open positions and copy them if they haven't been copied yet
    console.log('🔍 Checking for open positions to copy...')
    const openPositions = await fetchOpenPositions(brokerAccount)
    
    for (const position of openPositions) {
      for (const follower of followers || []) {
        try {
          // Check if this position has already been copied for this follower
          const { data: existingCopy, error: checkError } = await supabase
            .from('copy_trades')
            .select('*')
            .eq('master_broker_id', broker_id)
            .eq('follower_id', follower.user_id)
            .eq('original_symbol', position.symbol)
            .eq('status', 'executed')
            .limit(1)

          if (checkError) {
            console.log(`❌ Error checking existing copy for ${follower.follower_name}:`, checkError)
            continue
          }

          // If no existing copy found, create one
          if (!existingCopy || existingCopy.length === 0) {
            const positionSize = parseFloat(position.size)
            const side = positionSize > 0 ? 'buy' : 'sell'
            const copySize = Math.abs(positionSize)
            
            if (follower.copy_mode === 'multiplier') {
              copySize = Math.floor(copySize * 0.1) // 10% of original
            }

            if (copySize > 0) {
              const copyTrade = {
                master_trade_id: `position_${position.product_id}_${Date.now()}`,
                master_broker_id: broker_id,
                follower_id: follower.user_id,
                original_symbol: position.symbol,
                original_side: side,
                original_size: Math.abs(positionSize),
                original_price: parseFloat(position.avg_price) || 0,
                copied_size: copySize,
                copied_price: parseFloat(position.avg_price) || 0,
                status: 'executed',
                entry_time: new Date().toISOString()
              }

              const { data: newTrade, error: insertError } = await supabase
                .from('copy_trades')
                .insert(copyTrade)
                .select()
                .single()

              if (insertError) {
                console.log(`❌ Error creating position copy for ${follower.follower_name}:`, insertError)
              } else {
                console.log(`✅ Created position copy for ${follower.follower_name}: ${position.symbol} ${side} ${copySize}`)
                tradesCopied++
              }
            }
          }
        } catch (error) {
          console.log(`❌ Error processing position for ${follower.follower_name}:`, error)
        }
      }
    }

    const result = {
      success: true,
      message: 'Real-time trade monitoring completed',
      broker_id: broker_id,
      total_trades_found: trades.length,
      active_followers: followers?.length || 0,
      trades_copied: tradesCopied,
      copy_results: copyResults,
      timestamp: new Date().toISOString()
    }

    console.log('✅ Real-time monitoring completed:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in real-time trade monitor:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function fetchBrokerTrades(brokerAccount: any) {
  const trades: any[] = []
  
  try {
    // Initialize Delta client
    const deltaClient = new DeltaExchangeClient({
      baseURL: 'https://api.india.delta.exchange',
      apiKey: brokerAccount.api_key,
      apiSecret: brokerAccount.api_secret
    })

    console.log('🕐 Using Delta Exchange client for broker:', brokerAccount.account_name)
    
    // Test connection first
    await deltaClient.testConnection()
    
    // Step 1: Check fills (completed trades)
    console.log('📊 Checking fills for broker:', brokerAccount.account_name)
    const fillsResult = await deltaClient.getFills()
    
    if (fillsResult.success) {
      const recentFills = (fillsResult.data.result || [])
        .filter((fill: any) => {
          const fillTime = new Date(fill.created_at).getTime()
          const timeWindow = Date.now() - (20 * 60 * 1000) // 20 minutes
          const isRecent = fillTime > timeWindow
          console.log(`   Fill ${fill.product_symbol}: ${fill.created_at} (${isRecent ? '✅ RECENT' : '❌ OLD'})`)
          return isRecent
        })
        .map((fill: any) => ({
          order_id: `fill_${fill.id}`,
          symbol: fill.product_symbol,
          side: fill.side,
          size: parseFloat(fill.size),
          price: parseFloat(fill.price),
          timestamp: fill.created_at,
          order_type: fill.order_type || 'market',
          source: 'fill',
          broker_id: brokerAccount.id
        }))
      
      trades.push(...recentFills)
      console.log('📊 Found fills:', recentFills.length)
    }
    
    // Step 2: Check orders history
    console.log('📊 Checking orders history for broker:', brokerAccount.account_name)
    const ordersHistoryResult = await deltaClient.getOrdersHistory({ page_size: 50 })
    
    if (ordersHistoryResult.success) {
      const recentOrders = (ordersHistoryResult.data.result || [])
        .filter((order: any) => {
          const orderTime = new Date(order.created_at).getTime()
          const timeWindow = Date.now() - (20 * 60 * 1000) // 20 minutes
          const isRecent = orderTime > timeWindow
          console.log(`   Order ${order.product_symbol}: ${order.created_at} (${isRecent ? '✅ RECENT' : '❌ OLD'})`)
          return isRecent
        })
        .map((order: any) => ({
          order_id: `hist_${order.id}`,
          symbol: order.product_symbol,
          side: order.side,
          size: parseFloat(order.size),
          price: parseFloat(order.limit_price) || parseFloat(order.avg_price) || 0,
          timestamp: order.created_at,
          order_type: order.order_type,
          source: 'orders_history',
          broker_id: brokerAccount.id
        }))
      
      trades.push(...recentOrders)
      console.log('📊 Found orders history:', recentOrders.length)
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching broker trades:', error)
  }
  return trades
}

async function fetchOpenPositions(brokerAccount: any) {
  const positions: any[] = []
  
  try {
    const deltaClient = new DeltaExchangeClient({
      baseURL: 'https://api.india.delta.exchange',
      apiKey: brokerAccount.api_key,
      apiSecret: brokerAccount.api_secret
    })

    console.log('📊 Checking open positions for broker:', brokerAccount.account_name)
    const positionsResult = await deltaClient.getPositions()
    
    if (positionsResult.success) {
      const openPositions = (positionsResult.data.result || [])
        .filter((pos: any) => parseFloat(pos.size) !== 0)
        .map((pos: any) => ({
          product_id: pos.product_id,
          symbol: pos.product_symbol,
          size: pos.size,
          avg_price: pos.avg_price,
          unrealized_pnl: pos.unrealized_pnl
        }))
      
      positions.push(...openPositions)
      console.log('📊 Found open positions:', openPositions.length)
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching open positions:', error)
  }
  return positions
}

class DeltaExchangeClient {
  private baseURL: string
  private apiKey: string
  private apiSecret: string

  constructor(config: any) {
    this.baseURL = config.baseURL
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
  }

  private generateSignature(prehashString: string): string {
    const encoder = new TextEncoder()
    const key = encoder.encode(this.apiSecret)
    const message = encoder.encode(prehashString)
    
    const cryptoKey = crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    return crypto.subtle.sign('HMAC', cryptoKey, message)
      .then(signature => Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''))
  }

  private async makeRequest(endpoint: string, method: string = 'GET', body?: any) {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const path = `/v2${endpoint}`
    const queryString = ''
    const payload = body ? JSON.stringify(body) : ''
    
    const prehashString = method + timestamp + path + queryString + payload
    const signature = await this.generateSignature(prehashString)

    const headers = {
      'Accept': 'application/json',
      'api-key': this.apiKey,
      'signature': signature,
      'timestamp': timestamp,
      'User-Agent': 'copy-trading-platform'
    }

    if (body) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (response.ok) {
      return { success: true, data: await response.json() }
    } else {
      return { success: false, error: await response.text() }
    }
  }

  async testConnection() {
    return await this.makeRequest('/products')
  }

  async getFills() {
    return await this.makeRequest('/fills')
  }

  async getOrdersHistory(params: any = {}) {
    const queryString = new URLSearchParams(params).toString()
    return await this.makeRequest(`/orders/history?${queryString}`)
  }

  async getPositions() {
    return await this.makeRequest('/positions/margined')
  }
} 