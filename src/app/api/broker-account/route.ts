import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAccountCreationEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  try {
    // Get the user's JWT from the Authorization header
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization token' }, { status: 401 })
    }

    // Create a Supabase client with the user's JWT
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { 
        global: { 
          headers: { Authorization: `Bearer ${token}` },
          fetch: (url, options) => {
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            return fetch(url, {
              ...options,
              signal: controller.signal
            }).finally(() => clearTimeout(timeoutId));
          }
        } 
      }
    )

    // Get user information
    const { data: userData, error: authError } = await supabase.auth.getUser()
    
    if (authError || !userData?.user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    // Get broker accounts for the current user
    const { data: brokerAccounts, error: fetchError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('is_active', true)

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch broker accounts' }, { status: 500 })
    }

    return NextResponse.json(brokerAccounts || [])

  } catch (error) {
    console.error('Error in GET /api/broker-account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, broker_name, api_key, api_secret, profile_id } = await req.json()

    if (!name || !broker_name || !api_key || !api_secret) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the user's JWT from the Authorization header
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization token' }, { status: 401 })
    }

    // Create a Supabase client with the user's JWT
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { 
        global: { 
          headers: { Authorization: `Bearer ${token}` },
          fetch: (url, options) => {
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            return fetch(url, {
              ...options,
              signal: controller.signal
            }).finally(() => clearTimeout(timeoutId));
          }
        } 
      }
    )

    // Get user information for email with retry logic
    let user;
    let authError;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔍 Attempt ${attempt}/3: Getting user authentication...`);
        const { data: userData, error } = await supabase.auth.getUser()
        
        if (error) {
          authError = error;
          console.log(`❌ Auth attempt ${attempt} failed:`, error.message);
          
          if (attempt < 3) {
            console.log(`⏳ Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          continue;
        }
        
        if (!userData?.user) {
          authError = new Error('No user data returned');
          console.log(`❌ Auth attempt ${attempt} failed: No user data`);
          
          if (attempt < 3) {
            console.log(`⏳ Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          continue;
        }
        
        user = userData;
        console.log(`✅ Authentication successful on attempt ${attempt}`);
        break;
        
      } catch (error) {
        authError = error;
        console.log(`❌ Auth attempt ${attempt} failed:`, error instanceof Error ? error.message : String(error));
        
        if (attempt < 3) {
          console.log(`⏳ Waiting 2 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (!user?.user) {
      console.error('❌ All authentication attempts failed:', authError);
      return NextResponse.json({ 
        error: 'Authentication failed. Please try again.',
        details: authError instanceof Error ? authError.message : 'Network connectivity issue'
      }, { status: 401 })
    }

    // Insert broker account
    const { data: brokerAccount, error: insertError } = await supabase
      .from('broker_accounts')
      .insert({
        account_name: name,
        broker_name,
        api_key,
        api_secret,
        account_uid: profile_id,
        user_id: user.user.id,
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Failed to insert broker account:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    console.log('✅ Broker account created successfully:', brokerAccount)

    // Send email notification (non-blocking with timeout)
    const emailPromise = (async () => {
      try {
        await sendAccountCreationEmail(user.user.email!, 'broker', name)
        console.log('✅ Email sent successfully for broker account:', name)
      } catch (emailError) {
        console.error('❌ Failed to send email for broker account:', name, emailError)
        // Don't fail the request if email fails
      }
    })()
    
    // Don't wait for email - return success immediately
    // Email will be sent in background
    Promise.race([
      emailPromise,
      new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
    ]).catch(error => {
      console.error('❌ Email timeout or error:', error)
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Broker account created successfully',
      data: brokerAccount,
      note: 'Email notification will be sent shortly'
    })

  } catch (error) {
    console.error('❌ Broker account creation error:', error)
    return NextResponse.json({ 
      error: 'Failed to create broker account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing broker id' }, { status: 400 })
    }
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization token' }, { status: 401 })
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    // Get user id from token
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    // Only allow deleting own broker
    const { data, error } = await supabase
      .from('broker_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') { // No rows deleted
        return NextResponse.json({ error: 'Broker not found or not authorized' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
} 