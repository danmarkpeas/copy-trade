'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'

interface CopiedTrade {
  id: string
  master_trade_id: string
  master_broker_id: string
  follower_id: string
  follower_order_id: string
  original_symbol: string
  original_side: string
  original_size: number
  original_price: number
  copied_size: number
  copied_price: number
  status: string
  entry_time: string
  exit_time?: string
  created_at: string
  // Joined data
  master_broker_name?: string
  follower_name?: string
}

interface TradeHistory {
  id: string
  user_id: string
  product_symbol: string
  side: string
  size: number
  price: number
  order_type: string
  state: string
  avg_fill_price: number
  order_id: string
  created_at: string
}

export default function TradesPage() {
  const [copiedTrades, setCopiedTrades] = useState<CopiedTrade[]>([])
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([])
  const [copiedPage, setCopiedPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [copiedTotal, setCopiedTotal] = useState(0)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [monitoringResult, setMonitoringResult] = useState<any>(null)
  const [monitoringLoading, setMonitoringLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeBrokerId, setActiveBrokerId] = useState<string | null>(null)

  const ITEMS_PER_PAGE = 20
  const supabase = createClient()

  useEffect(() => {
    fetchCopiedTrades()
    fetchTradeHistory()
    fetchActiveBroker()
    setCurrentUser()
  }, [copiedPage, historyPage])

  const setCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user logged in')
        return
      }

      // Set the current user in the backend
      const response = await fetch('http://localhost:3001/api/set-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email
        })
      })

      if (response.ok) {
        console.log('✅ User set in backend:', user.email)
      } else {
        console.error('❌ Failed to set user in backend')
      }
    } catch (error) {
      console.error('Error setting current user:', error)
    }
  }

  const fetchActiveBroker = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: brokerAccounts } = await supabase
        .from('broker_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)

      if (brokerAccounts && brokerAccounts.length > 0) {
        setActiveBrokerId(brokerAccounts[0].id as string)
      }
    } catch (error) {
      console.error('Error fetching active broker:', error)
    }
  }

  const fetchCopiedTrades = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user logged in')
        setCopiedTrades([])
        setCopiedTotal(0)
        return
      }

      // Get today's copy trades (from start of today to end of today)
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      // First, get this user's follower IDs
      const { data: userFollowers, error: userFollowersError } = await supabase
        .from('followers')
        .select('id')
        .eq('user_id', user.id);

      if (userFollowersError) {
        console.error('Error fetching user followers:', userFollowersError);
        setCopiedTrades([]);
        setCopiedTotal(0);
        return;
      }

      if (!userFollowers || userFollowers.length === 0) {
        console.log('No followers found for user');
        setCopiedTrades([]);
        setCopiedTotal(0);
        return;
      }

      const userFollowerIds = userFollowers.map(f => f.id);

      // Get the total count for this user's followers
      const { count: totalCount, error: countError } = await supabase
        .from('copy_trades')
        .select('*', { count: 'exact', head: true })
        .in('follower_id', userFollowerIds)
        .gte('entry_time', startOfToday.toISOString())
        .lte('entry_time', endOfToday.toISOString());

      if (countError) {
        if (countError.message?.includes('does not exist')) {
          console.log('copy_trades table not yet created - this is normal during setup');
          setCopiedTrades([]);
          setCopiedTotal(0);
          return;
        }
        throw countError;
      }

      setCopiedTotal(totalCount || 0);

      // Get the copy trades with pagination
      const { data: copyTradesData, error: copyTradesError } = await supabase
        .from('copy_trades')
        .select('*')
        .in('follower_id', userFollowerIds)
        .gte('entry_time', startOfToday.toISOString())
        .lte('entry_time', endOfToday.toISOString())
        .order('entry_time', { ascending: false })
        .range((copiedPage - 1) * ITEMS_PER_PAGE, copiedPage * ITEMS_PER_PAGE - 1);

      if (copyTradesError) {
        if (copyTradesError.message?.includes('does not exist')) {
          console.log('copy_trades table not yet created - this is normal during setup');
          setCopiedTrades([]);
          return;
        }
        throw copyTradesError;
      }

      if (!copyTradesData || copyTradesData.length === 0) {
        setCopiedTrades([]);
        return;
      }

      // Get unique broker and follower IDs
      const brokerIds = [...new Set(copyTradesData.map(trade => trade.master_broker_id).filter(Boolean))];
      const tradeFollowerIds = [...new Set(copyTradesData.map(trade => trade.follower_id).filter(Boolean))];

      // Fetch broker names
      const { data: brokerData, error: brokerError } = await supabase
        .from('broker_accounts')
        .select('id, account_name, broker_name')
        .in('id', brokerIds);

      if (brokerError) {
        console.error('Error fetching broker names:', brokerError);
      }

      // Fetch follower names
      const { data: followerData, error: followerError } = await supabase
        .from('followers')
        .select('user_id, follower_name')
        .in('user_id', tradeFollowerIds);

      if (followerError) {
        console.error('Error fetching follower names:', followerError);
      }

      // Create lookup maps
      const brokerMap = new Map();
      if (brokerData) {
        brokerData.forEach(broker => {
          const displayName = broker.account_name || broker.broker_name || 'Unknown Broker';
          brokerMap.set(broker.id, displayName);
        });
      }

      const followerMap = new Map();
      if (followerData) {
        followerData.forEach(follower => {
          const displayName = follower.follower_name || 'Unknown Follower';
          followerMap.set(follower.user_id, displayName);
        });
      }

      // Combine the data
      const enrichedTrades = copyTradesData.map(trade => ({
        ...trade,
        master_broker_name: brokerMap.get(trade.master_broker_id) || 'Unknown Broker',
        follower_name: followerMap.get(trade.follower_id) || 'Unknown Follower'
      }));

      setCopiedTrades(enrichedTrades as CopiedTrade[]);
    } catch (error) {
      console.error('Error fetching copied trades:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch copied trades');
    }
  }

  const fetchTradeHistory = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user logged in')
        setTradeHistory([])
        setHistoryTotal(0)
        return
      }

      // Get trade history from yesterday and earlier (not today)
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // First, get the total count for this user
      const { count: totalCount, error: countError } = await supabase
        .from('trade_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .lt('created_at', startOfToday.toISOString());

      if (countError) {
        // Handle case where table doesn't exist yet
        if (countError.message?.includes('does not exist')) {
          console.log('trade_history table not yet created - this is normal during setup');
          setTradeHistory([]);
          setHistoryTotal(0);
          return;
        }
        throw countError;
      }

      setHistoryTotal(totalCount || 0);

      // Get trade history with pagination
      const { data, error } = await supabase
        .from('trade_history')
        .select('*')
        .eq('user_id', user.id)
        .lt('created_at', startOfToday.toISOString())
        .order('created_at', { ascending: false })
        .range((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE - 1);

      if (error) {
        // Handle case where table doesn't exist yet
        if (error.message?.includes('does not exist')) {
          console.log('trade_history table not yet created - this is normal during setup');
          setTradeHistory([]);
          return;
        }
        throw error;
      }
      setTradeHistory((data || []) as unknown as TradeHistory[]);
    } catch (error) {
      console.error('Error fetching trade history:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch trade history');
    }
  }

  const handleMonitorTrades = async () => {
    if (!activeBrokerId) {
      setError('No active broker account found')
      return
    }

    setMonitoringLoading(true)
    setError(null)
    setMonitoringResult(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No user logged in')
      }

      const response = await fetch(`http://localhost:3001/api/real-time-monitor?user_id=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker_id: activeBrokerId })
      })

      const result = await response.json()

      if (response.ok) {
        setMonitoringResult(result)
        // Refresh copied trades after monitoring
        await fetchCopiedTrades()
      } else {
        setError(result.error || 'Monitoring failed')
      }
    } catch (error) {
      console.error('Error monitoring trades:', error)
      setError('Failed to monitor trades')
    } finally {
      setMonitoringLoading(false)
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary'
      case 'executed': return 'default'
      case 'failed': return 'destructive'
      case 'exited': return 'secondary'
      case 'cancelled': return 'secondary'
      default: return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = date.toLocaleString('en-US', { month: 'long' }).toUpperCase()
    const year = date.getFullYear()
    const time = date.toLocaleString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    }).toUpperCase()
    
    return `${day} ${month} ${year}, ${time}`
  }

  const formatNumber = (num: number) => {
    return num.toFixed(8)
  }

  const totalCopiedPages = Math.ceil(copiedTotal / ITEMS_PER_PAGE)
  const totalHistoryPages = Math.ceil(historyTotal / ITEMS_PER_PAGE)

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Trade Management</h1>
        <Button 
          onClick={handleMonitorTrades} 
          disabled={monitoringLoading || !activeBrokerId}
          className="bg-green-600 hover:bg-green-700"
        >
          {monitoringLoading ? '🔄 Monitoring...' : '🔍 Real-Time Monitor & Copy'}
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">❌ {error}</p>
          </CardContent>
        </Card>
      )}

      {monitoringResult && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-green-800 mb-2">✅ Real-Time Monitoring Results</h3>
            <div className="text-sm text-green-700">
              <p><strong>Status:</strong> {monitoringResult.success ? '✅ Success' : '❌ Failed'}</p>
              <p><strong>Message:</strong> {monitoringResult.message}</p>
              <p><strong>Broker ID:</strong> {monitoringResult.broker_id}</p>
              <p><strong>Total Trades Found:</strong> {monitoringResult.total_trades_found || 0}</p>
              <p><strong>Active Followers:</strong> {monitoringResult.active_followers || 0}</p>
              <p><strong>Trades Copied:</strong> {monitoringResult.trades_copied || 0}</p>
              <p><strong>Positions:</strong> {monitoringResult.positions?.length || 0} active positions</p>
              <p><strong>Timestamp:</strong> {formatDate(monitoringResult.timestamp)}</p>
            </div>
            
            {monitoringResult.copy_results && monitoringResult.copy_results.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-green-800 mb-2">Recent Trades:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-green-300">
                        <th className="text-left p-1">Symbol</th>
                        <th className="text-left p-1">Side</th>
                        <th className="text-left p-1">Size</th>
                        <th className="text-left p-1">Price</th>
                        <th className="text-left p-1">Status</th>
                        <th className="text-left p-1">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monitoringResult.copy_results.slice(0, 5).map((trade, index) => (
                        <tr key={index} className="border-b border-green-200">
                          <td className="p-1 font-medium">{trade.symbol}</td>
                          <td className="p-1">
                            <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'} className="text-xs">
                              {trade.side.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-1">{formatNumber(trade.size)}</td>
                          <td className="p-1">${formatNumber(trade.price)}</td>
                          <td className="p-1">
                            <Badge variant={getStatusVariant(trade.status)} className="text-xs">
                              {trade.status}
                            </Badge>
                          </td>
                          <td className="p-1 text-xs">{new Date(trade.timestamp).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="copied" className="space-y-4">
        <TabsList>
          <TabsTrigger value="copied">
            Today's Copied Trades ({copiedTotal})
          </TabsTrigger>
          <TabsTrigger value="history">
            Trade History ({historyTotal})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="copied" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Copied Trades</CardTitle>
            </CardHeader>
            <CardContent>
              {copiedTrades.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No copied trades found for today</p>
                  <p className="text-sm text-gray-400">
                    {activeBrokerId ? 
                      'Copy trades will appear here when trades are executed and copied to followers.' :
                      'Please connect a broker account to see copy trades.'
                    }
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Copy Time</th>
                          <th className="text-left p-2">Master Broker</th>
                          <th className="text-left p-2">Follower</th>
                          <th className="text-left p-2">Symbol</th>
                          <th className="text-left p-2">Side</th>
                          <th className="text-left p-2">Original Size</th>
                          <th className="text-left p-2">Copied Size</th>
                          <th className="text-left p-2">Price</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {copiedTrades.map((trade) => (
                          <tr key={trade.id} className="border-b hover:bg-gray-50">
                            <td className="p-2">{formatDate(trade.entry_time)}</td>
                            <td className="p-2 font-medium">{trade.master_broker_name}</td>
                            <td className="p-2 font-medium">{trade.follower_name}</td>
                            <td className="p-2">{trade.original_symbol}</td>
                            <td className="p-2">
                              <Badge variant={trade.original_side === 'buy' ? 'default' : 'secondary'}>
                                {trade.original_side.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-2">{formatNumber(trade.original_size)}</td>
                            <td className="p-2">{formatNumber(trade.copied_size)}</td>
                            <td className="p-2">${formatNumber(trade.copied_price)}</td>
                            <td className="p-2">
                              <Badge variant={getStatusVariant(trade.status)}>
                                {trade.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination for Copied Trades */}
                  {totalCopiedPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-gray-600">
                        Showing {((copiedPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(copiedPage * ITEMS_PER_PAGE, copiedTotal)} of {copiedTotal} trades
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCopiedPage(Math.max(1, copiedPage - 1))}
                          disabled={copiedPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="flex items-center px-3 text-sm">
                          Page {copiedPage} of {totalCopiedPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCopiedPage(Math.min(totalCopiedPages, copiedPage + 1))}
                          disabled={copiedPage === totalCopiedPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade History (Yesterday and Earlier)</CardTitle>
            </CardHeader>
            <CardContent>
              {tradeHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No trade history found</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Time</th>
                          <th className="text-left p-2">Symbol</th>
                          <th className="text-left p-2">Side</th>
                          <th className="text-left p-2">Size</th>
                          <th className="text-left p-2">Price</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tradeHistory.map((trade) => (
                          <tr key={trade.id} className="border-b hover:bg-gray-50">
                            <td className="p-2">{formatDate(trade.created_at)}</td>
                            <td className="p-2">{trade.product_symbol}</td>
                            <td className="p-2">
                              <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'}>
                                {trade.side.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-2">{formatNumber(trade.size)}</td>
                            <td className="p-2">${formatNumber(trade.price)}</td>
                            <td className="p-2">{trade.order_type}</td>
                            <td className="p-2">
                              <Badge variant={getStatusVariant(trade.state)}>
                                {trade.state}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination for Trade History */}
                  {totalHistoryPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-gray-600">
                        Showing {((historyPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(historyPage * ITEMS_PER_PAGE, historyTotal)} of {historyTotal} trades
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                          disabled={historyPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="flex items-center px-3 text-sm">
                          Page {historyPage} of {totalHistoryPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(Math.min(totalHistoryPages, historyPage + 1))}
                          disabled={historyPage === totalHistoryPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 