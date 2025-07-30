import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { broker_id } = await req.json()

    if (!broker_id) {
      return NextResponse.json({ 
        error: 'Missing required field: broker_id' 
      }, { status: 400 })
    }

    console.log('🔍 Triggering trade monitoring for broker:', broker_id)

    // Call the trade monitoring Edge Function with retry logic
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/monitor-broker-trades`
    
    console.log('📞 Calling trade monitoring Edge Function...')
    
    // Retry logic for network issues
    let lastError: any = null
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries}: Calling Edge Function...`)
        
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            broker_id
          }),
          signal: AbortSignal.timeout(60000), // 60 second timeout for monitoring
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Trade monitoring Edge Function error:', response.status, errorText)
          return NextResponse.json({ 
            error: `Trade monitoring failed: ${response.status} ${response.statusText}`,
            details: errorText
          }, { status: response.status })
        }

        const result = await response.json()
        console.log('✅ Trade monitoring completed:', result)

        return NextResponse.json({
          success: true,
          message: 'Trade monitoring completed successfully',
          result
        })

      } catch (error) {
        lastError = error
        console.error(`❌ Network error (attempt ${retryCount + 1}):`, error)
        
        retryCount++
        if (retryCount < maxRetries) {
          // Wait 2 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }

    // If all retries failed
    console.error('❌ All retry attempts failed')
    return NextResponse.json({ 
      error: 'Network error - all retry attempts failed',
      details: lastError instanceof Error ? lastError.message : 'Unknown error'
    }, { status: 500 })

  } catch (error) {
    console.error('❌ Trade monitoring error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to test trade monitoring
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const broker_id = searchParams.get('broker_id')

    if (!broker_id) {
      return NextResponse.json({ 
        error: 'Missing broker_id parameter' 
      }, { status: 400 })
    }

    console.log('🧪 Testing trade monitoring for broker:', broker_id)

    // Call the trade monitoring Edge Function with retry logic
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/monitor-broker-trades`
    
    // Retry logic for network issues
    let lastError: any = null
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries}: Testing Edge Function...`)
        
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            broker_id
          }),
          signal: AbortSignal.timeout(60000),
        })

        if (!response.ok) {
          const errorText = await response.text()
          return NextResponse.json({ 
            error: `Test failed: ${response.status} ${response.statusText}`,
            details: errorText
          }, { status: response.status })
        }

        const result = await response.json()
        console.log('✅ Trade monitoring test completed:', result)

        return NextResponse.json({
          success: true,
          message: 'Trade monitoring test completed',
          result
        })

      } catch (error) {
        lastError = error
        console.error(`❌ Network error (attempt ${retryCount + 1}):`, error)
        
        retryCount++
        if (retryCount < maxRetries) {
          // Wait 2 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }

    // If all retries failed
    console.error('❌ All retry attempts failed')
    return NextResponse.json({ 
      error: 'Network error - all retry attempts failed',
      details: lastError instanceof Error ? lastError.message : 'Unknown error'
    }, { status: 500 })

  } catch (error) {
    console.error('❌ Trade monitoring test error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 