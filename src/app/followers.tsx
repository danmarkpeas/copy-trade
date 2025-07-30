"use client"
import { withAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

function FollowersPage() {
  // Placeholder data
  const followers = [
    { name: 'Alice', email: 'alice@email.com', balance: 1000, riskMode: 'Percent', riskValue: '10%', status: 'Active' },
    { name: 'Bob', email: 'bob@email.com', balance: 500, riskMode: 'Fixed', riskValue: '2 lots', status: 'Paused' },
  ]

  return (
    <main className="max-w-5xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Followers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Risk Mode</TableHead>
                <TableHead>Risk Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {followers.map((f, i) => (
                <TableRow key={i}>
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{f.email}</TableCell>
                  <TableCell>${f.balance}</TableCell>
                  <TableCell>{f.riskMode}</TableCell>
                  <TableCell>{f.riskValue}</TableCell>
                  <TableCell>{f.status}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline">Edit</Button>
                    <Button size="sm" variant="secondary">Pause</Button>
                    <Button size="sm" variant="destructive">Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  )
}

export default withAuth(FollowersPage) 