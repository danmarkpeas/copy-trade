import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { broker_name, api_key, api_secret } = await req.json()
    
    // Debug: Log the received data (without exposing full keys)
    console.log('🔍 Debug - Received data:', {
      broker_name,
      api_key_length: api_key ? api_key.length : 0,
      api_secret_length: api_secret ? api_secret.length : 0,
      api_key_preview: api_key ? `${api_key.substring(0, 8)}...${api_key.substring(api_key.length - 8)}` : 'null',
      api_secret_preview: api_secret ? `${api_secret.substring(0, 8)}...${api_secret.substring(api_secret.length - 8)}` : 'null'
    });
    
    if (broker_name !== 'delta') {
      return NextResponse.json({ valid: false, error: 'Only Delta Exchange supported in demo' }, { status: 400 })
    }
    
    // Validate API key format - make it more flexible for different Delta Exchange API key formats
    if (!api_key) {
      console.log('❌ API Key validation failed: No API key provided');
      return NextResponse.json({ 
        valid: false, 
        error: 'API key is required' 
      }, { status: 400 })
    }
    
    // Accept various API key lengths that Delta Exchange might use
    const validKeyLengths = [30, 60, 64];
    if (!validKeyLengths.includes(api_key.length)) {
      console.log('❌ API Key validation failed:', {
        api_key_exists: !!api_key,
        api_key_length: api_key.length,
        valid_lengths: validKeyLengths
      });
      return NextResponse.json({ 
        valid: false, 
        error: `Invalid API key format. API key should be ${validKeyLengths.join(', ')} characters long. Received: ${api_key.length} characters.` 
      }, { status: 400 })
    }
    
    // Validate API secret format - make it more flexible
    if (!api_secret) {
      console.log('❌ API Secret validation failed: No API secret provided');
      return NextResponse.json({ 
        valid: false, 
        error: 'API secret is required' 
      }, { status: 400 })
    }
    
    // Accept various API secret lengths that Delta Exchange might use
    const validSecretLengths = [30, 60, 64];
    if (!validSecretLengths.includes(api_secret.length)) {
      console.log('❌ API Secret validation failed:', {
        api_secret_exists: !!api_secret,
        api_secret_length: api_secret.length,
        valid_lengths: validSecretLengths
      });
      return NextResponse.json({ 
        valid: false, 
        error: `Invalid API secret format. API secret should be ${validSecretLengths.join(', ')} characters long. Received: ${api_secret.length} characters.` 
      }, { status: 400 })
    }
    
    // Call Supabase Edge Function for Delta Exchange verification
    console.log('🔍 Calling Supabase Edge Function for Delta Exchange verification...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables');
      return NextResponse.json({
        valid: false,
        error: 'Server configuration error. Please contact support.'
      }, { status: 500 })
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/delta-api-verify`;

    // Retry logic for network issues
    let response;
    let lastError;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔍 Attempt ${attempt}/3: Calling Edge Function...`);
        
        response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            broker_name,
            api_key,
            api_secret
          }),
          // Add timeout and retry logic
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });
        
        // If successful, break out of retry loop
        break;
        
      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${attempt} failed:`, error instanceof Error ? error.message : String(error));
        
        if (attempt < 3) {
          console.log(`⏳ Waiting 2 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (!response) {
      console.error('❌ All attempts failed:', lastError);
      return NextResponse.json({
        valid: false,
        error: 'Network error. Please check your internet connection and try again.',
        details: lastError instanceof Error ? lastError.message : String(lastError)
      }, { status: 500 })
    }
    
    console.log('🔍 Edge Function response status:', response.status);
    console.log('🔍 Edge Function response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('✅ Edge function result:', result);
    
    // Return the Edge Function response directly, regardless of status code
    // The Edge Function handles validation and returns appropriate error messages
    return NextResponse.json(result, { status: response.status });
    
  } catch (e) {
    console.error('Broker verification error:', e);
    return NextResponse.json({ valid: false, error: e?.toString() }, { status: 400 })
  }
} 