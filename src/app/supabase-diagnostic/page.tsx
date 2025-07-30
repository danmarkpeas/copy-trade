'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SupabaseDiagnostic() {
  const [status, setStatus] = useState('Checking...')
  const [user, setUser] = useState(null)
  const [dbTest, setDbTest] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function runDiagnostics() {
      // 1. Check Supabase connection
      try {
        const { data, error: pingError } = await supabase.from('users').select('*').limit(1)
        if (pingError) throw pingError
        setDbTest('DB connection: OK')
      } catch (err) {
        let msg = 'Unknown error';
        if (err instanceof Error) msg = err.message;
        else if (typeof err === 'string') msg = err;
        setDbTest('DB connection error: ' + msg);
      }

      // 2. Check Auth session
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError) {
        setError('Auth error: ' + authError.message)
      } else if (session) {
        setUser(session.user)
        setStatus('Logged in as ' + session.user.email)
      } else {
        setStatus('Not logged in')
      }
    }
    runDiagnostics()
  }, [])

  return (
    <div className="max-w-xl mx-auto mt-20 p-6 bg-white rounded shadow space-y-4">
      <h1 className="text-xl font-bold">Supabase Diagnostic</h1>
      <div>Status: {status}</div>
      <div>{dbTest}</div>
      {user && <pre>{JSON.stringify(user, null, 2)}</pre>}
      {error && <div className="text-red-600">{error}</div>}
      <div className="text-gray-500 text-xs mt-4">Reload this page after fixing any issues in your .env or Supabase setup.</div>
    </div>
  )
} 