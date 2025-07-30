import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { broker_id, trade_data } = await req.json()

    if (!broker_id || !trade_data) {
      return NextResponse.json({ 
        error: 'Missing required fields: broker_id, trade_data' 
      }, { status: 400 })
    }

    console.log('🔄 Triggering copy trade:', {
      broker_id,
      trade_data,
      timestamp: new Date().toISOString()
    })

    // Validate trade data
    if (!trade_data.symbol || !trade_data.side || !trade_data.size || !trade_data.price) {
      return NextResponse.json({ 
        error: 'Invalid trade data. Required: symbol, side, size, price' 
      }, { status: 400 })
    }

    // Call the copy trading Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/copy-trade`
    
    console.log('📞 Calling copy trading Edge Function...')
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        broker_id,
        trade_data
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Copy trading Edge Function error:', response.status, errorText)
      return NextResponse.json({ 
        error: `Copy trading failed: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status })
    }

    const result = await response.json()
    console.log('✅ Copy trading completed:', result)

    return NextResponse.json({
      success: true,
      message: 'Copy trading triggered successfully',
      result
    })

  } catch (error) {
    console.error('❌ Copy trading error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to test copy trading
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const broker_id = searchParams.get('broker_id')

    if (!broker_id) {
      return NextResponse.json({ 
        error: 'Missing broker_id parameter' 
      }, { status: 400 })
    }

    // Test trade data
    const testTradeData = {
      symbol: 'BTC-PERP',
      side: 'buy',
      size: 0.1,
      price: 45000,
      order_type: 'market',
      order_id: `test_${Date.now()}`
    }

    console.log('🧪 Testing copy trading with:', {
      broker_id,
      testTradeData
    })

    // Call the copy trading Edge Function with test data
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/copy-trade`
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        broker_id,
        trade_data: testTradeData
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ 
        error: `Test failed: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status })
    }

    const result = await response.json()
    console.log('✅ Test copy trading completed:', result)

    return NextResponse.json({
      success: true,
      message: 'Test copy trading completed',
      test_data: testTradeData,
      result
    })

  } catch (error) {
    console.error('❌ Test copy trading error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 