'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  User, 
  Settings,
  RefreshCw,
  Database,
  Shield,
  Zap,
  Eye,
  EyeOff,
  ArrowUpDown,
  DollarSign
} from 'lucide-react';

interface PositionStatus {
  followerId: string;
  followerName: string;
  symbol: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  status: 'open' | 'closed' | 'pending';
  lastUpdated: string;
}

interface CopyTradeStatus {
  masterId: string;
  followerId: string;
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  price: number;
  status: 'executed' | 'failed' | 'pending';
  timestamp: string;
  error?: string;
}

export default function PositionStatusPage() {
  const [positionStatus, setPositionStatus] = useState<PositionStatus[]>([]);
  const [copyTradeHistory, setCopyTradeHistory] = useState<CopyTradeStatus[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchPositionStatus = async () => {
    try {
      const response = await fetch('/api/position-status');
      if (response.ok) {
        const data = await response.json();
        setPositionStatus(data.positions || []);
        setCopyTradeHistory(data.copyTrades || []);
        setSystemStatus(data.systemStatus);
      } else {
        setError('Failed to fetch position status');
      }
    } catch (err) {
      setError('Error fetching position status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositionStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchPositionStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executed':
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'closed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPnlColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading position status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Position Status Dashboard</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchPositionStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
            Auto Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="positions">Active Positions</TabsTrigger>
          <TabsTrigger value="history">Copy Trade History</TabsTrigger>
          <TabsTrigger value="system">System Status</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Follower Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {positionStatus.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active positions found</p>
                  <p className="text-sm">Positions will appear here when followers have open trades</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {positionStatus.map((position, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{position.followerName}</h3>
                          <p className="text-sm text-gray-600">{position.symbol}</p>
                        </div>
                        <Badge className={getStatusColor(position.status)}>
                          {position.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Size</p>
                          <p className="font-medium">{position.size}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Entry Price</p>
                          <p className="font-medium">{formatCurrency(position.entryPrice)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Current Price</p>
                          <p className="font-medium">{formatCurrency(position.currentPrice)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">P&L</p>
                          <p className={`font-medium ${getPnlColor(position.pnl)}`}>
                            {formatCurrency(position.pnl)} ({formatPercentage(position.pnlPercent)})
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500">
                        Last updated: {new Date(position.lastUpdated).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                Copy Trade History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {copyTradeHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No copy trade history found</p>
                  <p className="text-sm">Copy trades will appear here when executed</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {copyTradeHistory.map((trade, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{trade.symbol} {trade.side.toUpperCase()}</p>
                          <p className="text-sm text-gray-600">
                            Size: {trade.size} | Price: {formatCurrency(trade.price)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(trade.status)}>
                            {trade.status.toUpperCase()}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(trade.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {trade.error && (
                        <p className="text-sm text-red-600 mt-2">{trade.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemStatus ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Backend Status</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Server:</span>
                          <Badge className={systemStatus.backend ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {systemStatus.backend ? 'Running' : 'Stopped'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>WebSocket:</span>
                          <Badge className={systemStatus.websocket ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {systemStatus.websocket ? 'Connected' : 'Disconnected'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Database:</span>
                          <Badge className={systemStatus.database ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {systemStatus.database ? 'Connected' : 'Disconnected'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Copy Trading</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Master Traders:</span>
                          <span className="font-medium">{systemStatus.masterTraders || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Active Followers:</span>
                          <span className="font-medium">{systemStatus.activeFollowers || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Copy Relationships:</span>
                          <span className="font-medium">{systemStatus.copyRelationships || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Trades Copied:</span>
                          <span className="font-medium">{systemStatus.totalTradesCopied || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Recent Activity</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Last Trade Detected:</span>
                        <span className="text-sm">
                          {systemStatus.lastTradeTime ? new Date(systemStatus.lastTradeTime).toLocaleString() : 'Never'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Copy Trade:</span>
                        <span className="text-sm">
                          {systemStatus.lastCopyTradeTime ? new Date(systemStatus.lastCopyTradeTime).toLocaleString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>System status not available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 