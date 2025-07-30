"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { withAuth } from '@/lib/auth'
// ShadCN UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function formatTradeDate(dateString: string) {
  const d = new Date(dateString);
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${month}\n${hours}:${minutes}:${seconds} ${ampm}`;
}

function TradeList() {
  const [trades, setTrades] = useState<any[]>([]);
  useEffect(() => {
    let ignore = false;
    supabase
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (!ignore) setTrades(data || []); });
    const channel = supabase
      .channel('public:trades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, (payload) => {
        setTrades((prev) => {
          if (payload.eventType === 'INSERT') return [payload.new, ...prev];
          if (payload.eventType === 'UPDATE') return prev.map((t) => t.id === payload.new.id ? payload.new : t);
          if (payload.eventType === 'DELETE') return prev.filter((t) => t.id !== payload.old.id);
          return prev;
        });
      })
      .subscribe();
    return () => { ignore = true; supabase.removeChannel(channel); };
  }, []);
  return (
    <div className="overflow-x-auto max-h-64">
      <table className="min-w-full text-sm">
        <thead><tr>
          <th className="px-2 py-1">Time</th>
          <th className="px-2 py-1">Symbol</th>
          <th className="px-2 py-1">Side</th>
          <th className="px-2 py-1">Lot</th>
          <th className="px-2 py-1">Price</th>
          <th className="px-2 py-1">Status</th>
        </tr></thead>
        <tbody>
          {trades.slice(0, 10).map((t) => (
            <tr key={t.id}>
              <td className="px-2 py-1 whitespace-pre">{formatTradeDate(t.created_at)}</td>
              <td className="px-2 py-1">{t.asset}</td>
              <td className="px-2 py-1">{t.action}</td>
              <td className="px-2 py-1">{t.quantity}</td>
              <td className="px-2 py-1">{t.price}</td>
              <td className="px-2 py-1">{t.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DashboardPage() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRole() {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return setRole(null)
      const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
      setRole(data?.role || null)
      setLoading(false)
    }
    fetchRole()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (!role) return <div className="p-8">Not logged in.</div>

  if (role === 'trader') {
    return (
      <main className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Cards */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Total Followers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">[TODO]</div>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Trades Copied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">[TODO]</div>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Broker Connected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-green-600">[TODO]</div>
          </CardContent>
        </Card>
        {/* Chart */}
        <div className="col-span-1 md:col-span-2 bg-white rounded-xl shadow-lg p-6 mt-4">
          <div className="font-semibold mb-2">Performance Chart</div>
          <div className="h-48 flex items-center justify-center text-zinc-400">[TODO: Chart]</div>
        </div>
        {/* Recent Trades Table */}
        <div className="col-span-1 bg-white rounded-xl shadow-lg p-6 mt-4">
          <div className="font-semibold mb-2">Recent Trades</div>
          <div className="h-48 flex flex-col items-center justify-center text-zinc-400">
            <TradeList />
          </div>
        </div>
      </main>
    )
  }
  if (role === 'follower') {
    return (
      <main className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Master Linked Card */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Master Linked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-black">[TODO]</div>
          </CardContent>
        </Card>
        {/* Status Card */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-green-600">[TODO: Active/Paused]</div>
          </CardContent>
        </Card>
        {/* Mini ROI Chart */}
        <div className="col-span-1 bg-white rounded-xl shadow-lg p-6 mt-4">
          <div className="font-semibold mb-2">ROI Chart</div>
          <div className="h-32 flex items-center justify-center text-zinc-400">[TODO: Chart]</div>
        </div>
        {/* Recent Trades Table */}
        <div className="col-span-1 bg-white rounded-xl shadow-lg p-6 mt-4">
          <div className="font-semibold mb-2">Recent Trades</div>
          <div className="h-32 flex items-center justify-center text-zinc-400">[TODO: Table]</div>
        </div>
      </main>
    )
  }
  if (role === 'admin') {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <div className="mb-4">🔹 <b>User Stats:</b> <span className="text-yellow-700">[TODO]</span></div>
        <div className="mb-4">🔹 <b>Error Logs:</b> <span className="text-yellow-700">[TODO]</span></div>
        <div className="mb-4">🔹 <b>Pending Trade Issues:</b> <span className="text-yellow-700">[TODO]</span></div>
        <div className="mb-4">🔹 <b>System Alerts:</b> <span className="text-yellow-700">[TODO]</span></div>
      </main>
    )
  }
  return <div className="p-8">Unknown role.</div>
}

export default withAuth(DashboardPage) 