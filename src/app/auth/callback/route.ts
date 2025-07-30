import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle authentication errors
  if (error) {
    console.error('Auth callback error:', { error, errorDescription });
    
    // Redirect to login with error message
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', error);
    if (errorDescription) {
      loginUrl.searchParams.set('error_description', errorDescription);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    try {
      const supabase = createRouteHandlerClient({ cookies });
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        const loginUrl = new URL('/login', requestUrl.origin);
        loginUrl.searchParams.set('error', 'exchange_failed');
        loginUrl.searchParams.set('error_description', exchangeError.message);
        return NextResponse.redirect(loginUrl);
      }
    } catch (err) {
      console.error('Unexpected error in auth callback:', err);
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('error', 'unexpected_error');
      loginUrl.searchParams.set('error_description', 'An unexpected error occurred during authentication');
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect to dashboard after successful sign in
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
} 