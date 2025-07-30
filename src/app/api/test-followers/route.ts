import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const followersData = await req.json()

    // Create Supabase client with service role key for testing
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Insert test followers
    const { data, error } = await supabase
      .from('followers')
      .insert(followersData)
      .select()

    if (error) {
      console.error('Error creating test followers:', error)
      return NextResponse.json({ error: 'Failed to create test followers' }, { status: 500 })
    }

    return NextResponse.json({ success: true, followers: data })

  } catch (error) {
    console.error('Error in POST /api/test-followers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 