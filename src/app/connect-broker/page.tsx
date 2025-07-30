"use client"
import { withAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function ConnectBrokerPage() {
  const [broker, setBroker] = useState('delta')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [accountUid, setAccountUid] = useState('')
  const [clientId, setClientId] = useState('')
  // Remove accountType state and dropdown, always use 'live'
  const accountType = 'live'
  const [accountName, setAccountName] = useState('')
  const [status, setStatus] = useState<'idle' | 'valid' | 'invalid' | 'saving'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [brokers, setBrokers] = useState<any[]>([])
  const [loadingBrokers, setLoadingBrokers] = useState(false)

  // Show/hide fields based on broker
  const showAccountUid = true // Always show Account UID/Profile ID
  const showClientId = broker === 'mt5' || broker === 'kite'
  // Remove showAccountType

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setError(null)
    setSuccess(false)
    if (!accountName.trim()) {
      setStatus('idle')
      setError('Master Account Name is required')
      return
    }
    try {
      // Debug: Log what we're about to send
      console.log('🔍 Debug - Sending to verification API:', {
        broker_name: broker,
        api_key_length: apiKey.length,
        api_secret_length: apiSecret.length,
        api_key_preview: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}` : 'null',
        api_secret_preview: apiSecret ? `${apiSecret.substring(0, 8)}...${apiSecret.substring(apiSecret.length - 8)}` : 'null'
      });
      
      // 1. Verify broker credentials before saving
      const verifyRes = await fetch('/api/broker-account/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_name: broker,
          api_key: apiKey,
          api_secret: apiSecret
        })
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok || !verifyData.valid) {
        setStatus('invalid')
        setError(verifyData.error || 'Broker API key verification failed')
        return
      }
      // 2. Proceed to save broker account as before
      const user = (await supabase.auth.getUser()).data.user
      const session = (await supabase.auth.getSession()).data.session
      const token = session?.access_token
      if (!user || !token) {
        setStatus('idle')
        setError('Not authenticated')
        return
      }
      const res = await fetch('/api/broker-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: accountName.trim(),
          broker_name: broker,
          api_key: apiKey,
          api_secret: apiSecret,
          profile_id: accountUid || null
        })
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('valid')
        setSuccess(true)
        setApiKey('')
        setApiSecret('')
        setAccountUid('')
        setClientId('')
        setAccountName('')
      } else {
        setStatus('invalid')
        let errorMsg = data.error || 'Failed to connect broker'
        if (errorMsg && errorMsg.toLowerCase().includes('duplicate key value violates unique constraint')) {
          errorMsg = 'You already have a broker account with this name. Please choose a different name.'
        }
        setError(errorMsg)
      }
    } catch (err: any) {
      setStatus('idle')
      setError(err?.message || 'Unexpected error. Please try again.')
    }
  }

  async function fetchBrokers() {
    setLoadingBrokers(true)
    const user = (await supabase.auth.getUser()).data.user
    if (!user) {
      setBrokers([])
      setLoadingBrokers(false)
      return
    }
    const { data, error } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setBrokers(data || [])
    setLoadingBrokers(false)
  }

  async function handleDeleteBroker(brokerId: string) {
    if (!window.confirm('Are you sure you want to delete this broker connection?')) return;
    setLoadingBrokers(true);
    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;
    if (!token) {
      setError('Not authenticated');
      setLoadingBrokers(false);
      return;
    }
    const res = await fetch(`/api/broker-account?id=${brokerId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      setError('Failed to delete broker');
    }
    await fetchBrokers();
    setLoadingBrokers(false);
  }

  useEffect(() => {
    fetchBrokers()
  }, [])
  useEffect(() => {
    if (success) fetchBrokers()
  }, [success])

  return (
    <main className="max-w-5xl mx-auto mt-10 px-4">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: Connect Broker Form */}
        <div className="md:w-1/2 w-full">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Connect Delta Exchange Broker</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block font-semibold mb-1">Broker Account Name (unique)</label>
                  <Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Enter a unique name for this broker account" required />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Broker</label>
                  <Select value={broker} onValueChange={setBroker}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose Broker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delta">Delta Exchange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {showAccountUid && (
                  <div>
                    <label className="block font-semibold mb-1">Account UID / Profile ID</label>
                    <Input value={accountUid} onChange={e => setAccountUid(e.target.value)} placeholder="Enter Account UID or Profile ID" />
                  </div>
                )}
                <div>
                  <label className="block font-semibold mb-1">API Key</label>
                  <Input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter API Key" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">API Secret / Access Token</label>
                  <Input value={apiSecret} onChange={e => setApiSecret(e.target.value)} placeholder="Enter API Secret or Access Token" type="password" />
                </div>
                {showClientId && (
                  <div>
                    <label className="block font-semibold mb-1">Client ID (optional)</label>
                    <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Enter Client ID (if required)" />
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <Button type="submit" disabled={status === 'saving'}>Connect</Button>
                  {status === 'valid' && <Badge variant="default">Connected</Badge>}
                  {status === 'invalid' && <Badge variant="destructive">Invalid</Badge>}
                  {status === 'saving' && <Badge>Saving...</Badge>}
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                {success && <div className="text-green-600 text-sm">Broker connected successfully!</div>}
              </form>
            </CardContent>
          </Card>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded text-sm mb-8">
            <b>Note:</b> Currently only Delta Exchange is supported. Your credentials are encrypted and never shared.<br />
            <span className="text-xs">You can give each Delta Exchange broker account a unique name to differentiate them.</span>
          </div>
        </div>
        {/* Divider for desktop */}
        <div className="hidden md:block w-px bg-zinc-200 my-4" />
        {/* Right: Connected Brokers List */}
        <div className="md:w-1/2 w-full">
          <Card>
            <CardHeader>
              <CardTitle>Connected Delta Exchange Brokers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBrokers ? (
                <div className="text-zinc-500">Loading...</div>
              ) : brokers.length === 0 ? (
                <div className="text-zinc-500">No Delta Exchange brokers connected.</div>
              ) : (
                <div className="space-y-4">
                  {brokers.map((b) => (
                    <div key={b.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <div className="font-semibold">{b.account_name} <span className="text-xs text-zinc-500">({b.broker_name})</span></div>
                        {b.account_uid && <div className="text-xs text-zinc-500">UID: {b.account_uid}</div>}
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={b.is_active ? 'default' : 'secondary'}>{b.is_active ? 'Active' : 'Inactive'}</Badge>
                        <Button size="sm" variant="outline" disabled>{b.is_active ? 'Deactivate' : 'Activate'}</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteBroker(b.id)} disabled={loadingBrokers}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

export default withAuth(ConnectBrokerPage) 