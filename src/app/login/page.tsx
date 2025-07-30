'use client'
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthCard from '@/components/forms/AuthCard';
import { Button } from '@/components/ui/button';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user is already authenticated
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    checkUser();
  }, [router]);

  // Handle error messages from URL parameters
  useEffect(() => {
    if (!searchParams) return;
    
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      let errorMessage = 'Authentication failed';
      
      switch (error) {
        case 'server_error':
          errorMessage = 'Server error occurred during authentication';
          break;
        case 'exchange_failed':
          errorMessage = 'Failed to complete authentication';
          break;
        case 'unexpected_error':
          errorMessage = 'An unexpected error occurred';
          break;
        default:
          errorMessage = errorDescription || 'Authentication failed';
      }
      
      setMessage(errorMessage);
    }
  }, [searchParams]);

  async function handleGoogleAuth() {
    setLoading(true);
    setMessage('');
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        setMessage(error.message);
        setLoading(false);
      }
      // If successful, the user will be redirected to dashboard
      // The redirectTo option handles the navigation
    } catch (error) {
      setMessage('An unexpected error occurred');
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 transition-colors">
      <AuthCard
        logo={<img src="/globe.svg" alt="Logo" className="w-10 h-10 rounded bg-neutral-100 dark:bg-neutral-800 p-2" />}
        title="Welcome to CopyTrade"
        subtitle="Sign in or sign up with Google to start copying top traders and growing your portfolio."
        social={
          <Button
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center gap-2 bg-black text-white font-medium text-base hover:bg-zinc-800 border-none shadow-none py-3"
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><g><path d="M19.805 10.23c0-.68-.06-1.36-.18-2.03H10.2v3.85h5.44a4.64 4.64 0 0 1-2.01 3.05v2.53h3.25c1.9-1.75 2.93-4.33 2.93-7.4z" fill="#fff"/><path d="M10.2 20c2.7 0 4.97-.89 6.63-2.41l-3.25-2.53c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.13H1.25v2.59A9.99 9.99 0 0 0 10.2 20z" fill="#fff"/><path d="M4.61 11.89a5.98 5.98 0 0 1 0-3.78V5.52H1.25a10.01 10.01 0 0 0 0 8.96l3.36-2.59z" fill="#fff"/><path d="M10.2 3.96c1.47 0 2.78.51 3.81 1.5l2.85-2.85C15.17.89 12.9 0 10.2 0A9.99 9.99 0 0 0 1.25 5.52l3.36 2.59c.79-2.37 2.99-4.15 5.59-4.15z" fill="#fff"/></g></svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </Button>
        }
        footer={
          message && <div className="mt-2 text-center text-sm text-red-500">{message}</div>
        }
        children={<></>}
      />
    </main>
  );
} 