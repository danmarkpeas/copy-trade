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
    const { broker_name, api_key, api_secret } = await req.json()

    if (!broker_name || !api_key || !api_secret) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: broker_name, api_key, api_secret',
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

    console.log('🔍 Verifying Delta Exchange API credentials...')

    const deltaApiUrl = 'https://api.delta.exchange'
    
    console.log('🔄 Using simplified approach for Delta Exchange API verification...')
    
    // Try multiple timestamp attempts
    const timestampAttempts = [
      Date.now() + 2000,  // 2 second buffer
      Date.now() + 5000,  // 5 second buffer
      Date.now() + 10000, // 10 second buffer
    ]
    
    for (let i = 0; i < timestampAttempts.length; i++) {
      try {
        const timestamp = timestampAttempts[i]
        console.log(`🕐 Attempt ${i + 1}/${timestampAttempts.length} with timestamp: ${timestamp}`)
        
        // Create signature for authenticated request
        const signature = await createDeltaSignature(
          'GET',
          '/v2/products',
          '',
          timestamp,
          api_secret
        )
        
        console.log('🔐 Created signature for products request')
        
        // Test with products endpoint (requires authentication)
        const response = await fetch(`${deltaApiUrl}/v2/products`, {
          method: 'GET',
          headers: {
            'api-key': api_key,
            'timestamp': timestamp.toString(),
            'signature': signature,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('✅ API verification successful:', data.result?.length || 0, 'products found')
          
          return new Response(
            JSON.stringify({ 
              valid: true,
              message: 'API credentials verified successfully',
              products_count: data.result?.length || 0
            }),
            { 
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              }
            }
          )
        } else {
          const errorText = await response.text()
          console.log(`❌ Verification attempt ${i + 1} failed: ${response.status} - ${errorText.substring(0, 100)}...`)
          
          // If it's an expired signature, try the next timestamp
          if (response.status === 401 && errorText.includes('expired_signature')) {
            console.log('🕐 Expired signature detected, trying next timestamp...')
            continue
          }
          
          // If it's a different error, break
          break
        }
        
      } catch (error) {
        console.log(`❌ Network error on attempt ${i + 1}:`, error)
        continue
      }
    }
    
    // If all attempts failed
    console.error('❌ All verification attempts failed')
    
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: 'API verification failed - all timestamp attempts unsuccessful',
        details: 'Please check your API credentials and try again'
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
    console.error('❌ Verification error:', error)
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
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