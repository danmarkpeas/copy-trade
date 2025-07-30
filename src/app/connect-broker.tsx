"use client"
import { withAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

function ConnectBrokerPage() {
  const [broker, setBroker] = useState('binance')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [status, setStatus] = useState<'idle' | 'valid' | 'invalid' | 'saving'>('idle')

  return (
    <main className="max-w-xl mx-auto">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Connect Broker</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Broker</label>
              <Select value={broker} onValueChange={setBroker}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose Broker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="binance">Binance</SelectItem>
                  <SelectItem value="mt5">MetaTrader 5</SelectItem>
                  <SelectItem value="kite">Zerodha Kite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block font-semibold mb-1">API Key</label>
              <Input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter API Key" />
            </div>
            <div>
              <label className="block font-semibold mb-1">API Secret</label>
              <Input value={apiSecret} onChange={e => setApiSecret(e.target.value)} placeholder="Enter API Secret" type="password" />
            </div>
            <div className="flex gap-2 items-center">
              <Button type="button" disabled>Connect</Button>
              {status === 'valid' && <Badge variant="default">Connected</Badge>}
              {status === 'invalid' && <Badge variant="destructive">Invalid</Badge>}
              {status === 'saving' && <Badge>Saving...</Badge>}
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded text-sm">
        <b>Note:</b> Your credentials are encrypted and never shared.<br />
        <span className="text-xs">TODO: Implement backend validation and saving.</span>
      </div>
    </main>
  )
}

export default withAuth(ConnectBrokerPage) 