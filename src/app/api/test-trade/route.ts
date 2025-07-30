import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const tradeData = await req.json()

    // Create Supabase client with service role key for testing
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Insert test trade
    const { data, error } = await supabase
      .from('trades')
      .insert(tradeData)
      .select()
      .single()

    if (error) {
      console.error('Error creating test trade:', error)
      return NextResponse.json({ error: 'Failed to create test trade' }, { status: 500 })
    }

    return NextResponse.json({ success: true, trade: data })

  } catch (error) {
    console.error('Error in POST /api/test-trade:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 