"use client"
import { withAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

function SubscriptionsPage() {
  // Placeholder data
  const [copying, setCopying] = useState(true)
  const master = { name: 'JohnDoe', broker: 'Zerodha', risk: '10% of balance' }

  return (
    <main className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Master Trader: {master.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2">Broker: <span className="font-semibold">{master.broker}</span></div>
          <div className="mb-2">Risk: <span className="font-semibold">{master.risk}</span></div>
          <div className="flex items-center gap-4 mb-4">
            <Toggle pressed={copying} onPressedChange={setCopying} aria-label="Copying">
              {copying ? 'Copying: ON' : 'Copying: OFF'}
            </Toggle>
            <Button variant="outline">Edit Risk Allocation</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

export default withAuth(SubscriptionsPage) 