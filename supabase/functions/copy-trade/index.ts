// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CopyTradeRequest {
  master_trade_id: string
  master_broker_id: string
  follower_id: string
  original_symbol: string
  original_side: 'buy' | 'sell'
  original_size: number
  original_price: number
  copied_size: number
  copied_price: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { master_trade_id, master_broker_id, follower_id, original_symbol, original_side, original_size, original_price, copied_size, copied_price } = await req.json()

    if (!master_trade_id || !master_broker_id || !follower_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔄 Copying trade:', master_trade_id, 'to follower:', follower_id)

    // Create copy trade record
    const { data: copyTrade, error: insertError } = await supabase
      .from('copy_trades')
      .insert({
        master_trade_id,
        master_broker_id,
        follower_id,
        original_symbol,
        original_side,
        original_size,
        original_price,
        copied_size,
        copied_price,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.log('❌ Error creating copy trade record:', insertError)
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Copy trade created successfully:', copyTrade.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Copy trade created successfully',
        copy_trade_id: copyTrade.id,
        status: copyTrade.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.log('❌ Error in copy trade function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 