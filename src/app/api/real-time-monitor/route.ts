import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { broker_id } = await req.json()

    if (!broker_id) {
      return NextResponse.json({ error: 'broker_id is required' }, { status: 400 })
    }

    console.log('🔍 Triggering real-time trade monitoring for broker:', broker_id)

    // Call the backend API instead of Edge Function
    const backendUrl = 'http://localhost:3001/api/real-time-monitor'
    const maxRetries = 3
    let lastError: any = null

    for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
      try {
        console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries}: Calling Backend API...`)

        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ broker_id }),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        })

        if (response.ok) {
          const result = await response.json()
          console.log('✅ Backend monitoring completed:', result)
          return NextResponse.json(result)
        } else {
          const errorText = await response.text()
          console.log(`❌ Backend monitoring failed (attempt ${retryCount + 1}):`, response.status, errorText)
          lastError = { status: response.status, error: errorText }
          
          if (retryCount < maxRetries - 1) {
            console.log(`⏳ Waiting 2 seconds before retry...`)
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
      } catch (error: any) {
        console.log(`❌ Network error (attempt ${retryCount + 1}):`, error.message)
        lastError = error
        
        if (retryCount < maxRetries - 1) {
          console.log(`⏳ Waiting 2 seconds before retry...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }

    console.log('❌ All retry attempts failed')
    return NextResponse.json(
      { error: 'Backend monitoring failed after all retries', details: lastError },
      { status: 500 }
    )

  } catch (error: any) {
    console.log('❌ Error in real-time monitor API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const brokerId = searchParams.get('broker_id')

    if (!brokerId) {
      return NextResponse.json({ error: 'broker_id query parameter is required' }, { status: 400 })
    }

    console.log('🧪 Testing backend monitoring for broker:', brokerId)

    const backendUrl = 'http://localhost:3001/api/real-time-monitor'

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ broker_id: brokerId }),
      signal: AbortSignal.timeout(30000)
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Backend monitoring test completed:', result)
      return NextResponse.json(result)
    } else {
      const errorText = await response.text()
      console.log('❌ Backend monitoring test failed:', response.status, errorText)
      return NextResponse.json(
        { error: 'Backend monitoring test failed', details: errorText },
        { status: response.status }
      )
    }

  } catch (error: any) {
    console.log('❌ Error in backend monitor test:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 