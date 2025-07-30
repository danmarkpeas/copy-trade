"use client"
import { withAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

function TradesPage() {
  // Placeholder data
  const trades = [
    { time: '2024-06-01 10:00', symbol: 'BTCUSDT', side: 'Buy', lot: 1, price: 65000, status: 'Success' },
    { time: '2024-06-01 10:05', symbol: 'ETHUSDT', side: 'Sell', lot: 2, price: 3500, status: 'Pending' },
    { time: '2024-06-01 10:10', symbol: 'BTCUSDT', side: 'Buy', lot: 1, price: 65200, status: 'Failed' },
  ]
  const statusVariant = (status: string) => {
    if (status === 'Success') return 'default'
    if (status === 'Failed') return 'destructive'
    if (status === 'Pending') return 'secondary'
    return 'outline'
  }

  return (
    <main className="max-w-6xl mx-auto">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter Bar Placeholder */}
          <div className="flex gap-4 mb-4">
            <input className="border rounded px-3 py-2" placeholder="Filter by symbol" />
            <input className="border rounded px-3 py-2" placeholder="Filter by status" />
            <input className="border rounded px-3 py-2" placeholder="Filter by date" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((t, i) => (
                <TableRow key={i}>
                  <TableCell>{t.time}</TableCell>
                  <TableCell>{t.symbol}</TableCell>
                  <TableCell>{t.side}</TableCell>
                  <TableCell>{t.lot}</TableCell>
                  <TableCell>${t.price}</TableCell>
                  <TableCell><Badge variant={statusVariant(t.status)}>{t.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  )
}

export default withAuth(TradesPage) 