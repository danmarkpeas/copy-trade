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
  Zap
} from 'lucide-react';

interface TradeExecutionStatus {
  systemStatus: {
    backend: boolean;
    websocket: boolean;
    database: boolean;
    apiConnection: boolean;
  };
  followers: Array<{
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'error';
    apiCredentials: boolean;
    balance: number;
    lastTrade: string;
    errorReason?: string;
  }>;
  recentTrades: Array<{
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    size: number;
    price: number;
    timestamp: string;
    status: 'executed' | 'failed' | 'pending';
    copyAttempts: number;
    copySuccess: number;
    copyFailures: number;
    failureReasons: string[];
  }>;
  copyTradeHistory: Array<{
    id: string;
    masterTradeId: string;
    followerId: string;
    symbol: string;
    side: 'buy' | 'sell';
    size: number;
    price: number;
    status: 'success' | 'failed';
    errorMessage?: string;
    timestamp: string;
  }>;
  systemIssues: Array<{
    type: 'api' | 'database' | 'websocket' | 'configuration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

export default function TradeExecutionStatusPage() {
  const [status, setStatus] = useState<TradeExecutionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStatus = async () => {
    try {
      setLoading(true);
      
      // Fetch system status from backend
      const response = await fetch('/api/real-time-monitor');
      const data = await response.json();
      
      // Fetch copy trade history
      const historyResponse = await fetch('/api/trade-history');
      const historyData = await historyResponse.json();
      
      // Fetch followers status
      const followersResponse = await fetch('/api/test-followers');
      const followersData = await followersResponse.json();
      
      // Process and structure the data
      const processedStatus: TradeExecutionStatus = {
        systemStatus: {
          backend: data.success,
          websocket: data.websocket_connected || false,
          database: true, // Assume true if we got data
          apiConnection: data.api_connection || false,
        },
        followers: followersData.followers || [],
        recentTrades: data.copy_results || [],
        copyTradeHistory: historyData.trades || [],
        systemIssues: []
      };
      
      // Analyze issues
      const issues = [];
      
      // Check for API signature issues
      if (data.trades_copied === 0 && data.total_trades_found > 0) {
        issues.push({
          type: 'api',
          severity: 'high',
          message: 'Copy trades failing due to API signature mismatch (401 errors)',
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
      
      // Check for database constraint issues
      if (data.database_errors) {
        issues.push({
          type: 'database',
          severity: 'medium',
          message: 'Database constraint violations - follower IDs not found in users table',
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
      
      // Check for insufficient followers
      if (data.active_followers < 1) {
        issues.push({
          type: 'configuration',
          severity: 'high',
          message: 'No active followers configured for copy trading',
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
      
      processedStatus.systemIssues = issues;
      setStatus(processedStatus);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading trade execution status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trade Execution Status</h1>
          <p className="text-gray-600">Real-time monitoring of copy trading system</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button onClick={fetchStatus} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {status && (
        <>
          {/* System Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>System Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status.systemStatus.backend)}
                  <span>Backend Server</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status.systemStatus.websocket)}
                  <span>WebSocket</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status.systemStatus.database)}
                  <span>Database</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status.systemStatus.apiConnection)}
                  <span>API Connection</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Critical Issues */}
          {status.systemIssues.filter(issue => issue.severity === 'critical' || issue.severity === 'high').length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Critical Issues Detected:</strong>
                <ul className="mt-2 space-y-1">
                  {status.systemIssues
                    .filter(issue => issue.severity === 'critical' || issue.severity === 'high')
                    .map((issue, index) => (
                      <li key={index} className="text-sm">
                        • {issue.message}
                      </li>
                    ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="followers">Followers</TabsTrigger>
              <TabsTrigger value="trades">Recent Trades</TabsTrigger>
              <TabsTrigger value="history">Copy History</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Followers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {status.followers.filter(f => f.status === 'active').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      of {status.followers.length} total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Recent Trades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{status.recentTrades.length}</div>
                    <p className="text-xs text-muted-foreground">
                      detected in last 24h
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Copy Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {status.copyTradeHistory.length > 0 
                        ? Math.round((status.copyTradeHistory.filter(t => t.status === 'success').length / status.copyTradeHistory.length) * 100)
                        : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {status.copyTradeHistory.filter(t => t.status === 'success').length} of {status.copyTradeHistory.length}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="followers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Follower Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {status.followers.map((follower) => (
                      <div key={follower.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{follower.name}</h3>
                            <p className="text-sm text-gray-600">ID: {follower.id}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={follower.status === 'active' ? 'default' : 'destructive'}>
                              {follower.status}
                            </Badge>
                            {follower.apiCredentials ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <p>Balance: ${follower.balance?.toFixed(2) || 'N/A'}</p>
                          <p>Last Trade: {follower.lastTrade || 'Never'}</p>
                          {follower.errorReason && (
                            <p className="text-red-600 mt-1">
                              Error: {follower.errorReason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trades" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Recent Master Trades</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {status.recentTrades.slice(0, 10).map((trade, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">
                              {trade.symbol} {trade.side.toUpperCase()} {trade.size}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Price: ${trade.price} | {new Date(trade.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={trade.status === 'executed' ? 'default' : 'destructive'}>
                              {trade.status}
                            </Badge>
                            <div className="text-sm text-gray-600">
                              Copy: {trade.copySuccess}/{trade.copyAttempts}
                            </div>
                          </div>
                        </div>
                        {trade.failureReasons && trade.failureReasons.length > 0 && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm font-medium text-red-800">Copy Failures:</p>
                            <ul className="text-sm text-red-700 mt-1">
                              {trade.failureReasons.map((reason, idx) => (
                                <li key={idx}>• {reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>Copy Trade History</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {status.copyTradeHistory.slice(0, 20).map((trade) => (
                      <div key={trade.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">
                              {trade.symbol} {trade.side.toUpperCase()} {trade.size}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Price: ${trade.price} | {new Date(trade.timestamp).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Follower: {trade.followerId}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={trade.status === 'success' ? 'default' : 'destructive'}>
                              {trade.status}
                            </Badge>
                          </div>
                        </div>
                        {trade.errorMessage && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm text-red-800">
                              Error: {trade.errorMessage}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="issues" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>System Issues</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {status.systemIssues.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <p>No issues detected</p>
                      </div>
                    ) : (
                      status.systemIssues.map((issue, index) => (
                        <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">{issue.message}</h3>
                              <p className="text-sm opacity-75">
                                {new Date(issue.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={issue.resolved ? 'default' : 'destructive'}>
                                {issue.resolved ? 'Resolved' : 'Active'}
                              </Badge>
                              <Badge variant="outline">
                                {issue.type.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
} 