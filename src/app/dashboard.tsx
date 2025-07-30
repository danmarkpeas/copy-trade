"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { withAuth, handleUserAfterAuth } from '@/lib/auth'
// ShadCN UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function DashboardPage() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    async function initializeUser() {
      try {
        // Handle user data after Google OAuth
        const user = await handleUserAfterAuth();
        if (user) {
          setUserInfo(user);
          console.log('Full user info:', user);
        }

        // Fetch user role
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          setRole(null);
          setLoading(false);
          return;
        }

        const { data } = await supabase.from('users').select('role, name, email').eq('id', currentUser.id).single();
        setRole(data?.role || null);
        
        if (data) {
          console.log('User profile data:', data);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error initializing user:', error);
        setLoading(false);
      }
    }
    
    initializeUser();
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
            <div className="text-3xl font-bold text-indigo-600">[TODO]</div>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Trades Copied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">[TODO]</div>
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
          <div className="h-48 flex items-center justify-center text-zinc-400">[TODO: Table]</div>
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
            <div className="text-lg font-semibold text-indigo-600">[TODO]</div>
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