"use client"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Eye, Edit, Trash2, CheckCircle, XCircle, AlertCircle, ArrowRight } from "lucide-react";

interface FollowerAccount {
  follower_name: string;
  master_broker_name: string;
  master_account_name: string;
  trader_name: string;
  copy_mode: string;
  lot_size: number;
  total_balance: number;
  risk_level: string;
  account_status: string;
  is_verified: boolean;
  created_at: string;
}

export default function FollowerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followerAccounts, setFollowerAccounts] = useState<FollowerAccount[]>([]);

  useEffect(() => {
    loadFollowerAccounts();
  }, []);

  const loadFollowerAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      const { data, error } = await supabase.rpc('get_user_follower_accounts_with_trader_info', {
        user_uuid: user.id
      });

      if (error) {
        setError(`Error loading follower accounts: ${error.message}`);
        return;
      }

      setFollowerAccounts(data || []);
    } catch (err) {
      setError(`Error loading follower accounts: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, isVerified: boolean) => {
    if (status === 'verified' && isVerified) {
      return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
    } else if (status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    } else if (status === 'inactive') {
      return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
    }
  };

  const getRiskLevelBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{riskLevel}</Badge>;
    }
  };

  const getCopyModeDisplay = (copyMode: string) => {
    switch (copyMode) {
      case 'fixed lot':
        return 'Fixed Lot';
      case 'multiplier':
        return 'Multiplier';
      case '% balance':
        return '% Balance';
      default:
        return copyMode;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(balance);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading follower accounts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Follower Accounts</h1>
          <p className="text-gray-600 mt-2">
            Manage your follower accounts and see which traders you're following
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/follower/add')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Follower Account
        </Button>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {followerAccounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Follower Accounts</h3>
            <p className="text-gray-600 text-center mb-6">
              You haven't created any follower accounts yet. Create your first follower account to start following verified traders.
            </p>
            <Button onClick={() => router.push('/dashboard/follower/add')}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Follower Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                    <p className="text-2xl font-bold">{followerAccounts.length}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ArrowRight className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Verified</p>
                    <p className="text-2xl font-bold">
                      {followerAccounts.filter(acc => acc.is_verified).length}
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold">
                      {followerAccounts.filter(acc => acc.account_status === 'pending').length}
                    </p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Balance</p>
                    <p className="text-2xl font-bold">
                      {formatBalance(followerAccounts.reduce((sum, acc) => sum + acc.total_balance, 0))}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl font-bold text-purple-600">$</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Follower Accounts Table */}
          <Card>
            <CardHeader>
              <CardTitle>Follower Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                                         <TableHead>Following Trader</TableHead>
                    <TableHead>Copy Mode</TableHead>
                    <TableHead>Lot Size</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followerAccounts.map((account, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {account.follower_name}
                      </TableCell>
                                             <TableCell>
                         <div>
                           <div className="font-medium">{account.trader_name}</div>
                           <div className="text-sm text-gray-500">{account.master_account_name}</div>
                           <div className="text-xs text-blue-600">{account.master_broker_name}</div>
                         </div>
                       </TableCell>
                      <TableCell>
                        {getCopyModeDisplay(account.copy_mode)}
                      </TableCell>
                      <TableCell>
                        {account.lot_size}
                      </TableCell>
                      <TableCell>
                        {formatBalance(account.total_balance)}
                      </TableCell>
                      <TableCell>
                        {getRiskLevelBadge(account.risk_level)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(account.account_status, account.is_verified)}
                      </TableCell>
                      <TableCell>
                        {formatDate(account.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/follower/${account.follower_name}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/follower/${account.follower_name}/edit`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 