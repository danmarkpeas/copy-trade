"use client"
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Edit, CheckCircle, XCircle, AlertCircle, Shield, TrendingUp, Settings, Activity } from "lucide-react";

interface FollowerDetails {
  follower_name: string;
  master_broker_account_id: string;
  master_broker_name: string;
  master_account_name: string;
  broker_platform: string;
  profile_id: string;
  api_key_masked: string;
  copy_mode: string;
  multiplier: number;
  percentage: number;
  fixed_lot: number;
  lot_size: number;
  max_lot_size: number;
  min_lot_size: number;
  drawdown_limit: number;
  total_balance: number;
  risk_level: string;
  capital_allocated: number;
  max_daily_trades: number;
  max_open_positions: number;
  stop_loss_percentage: number;
  take_profit_percentage: number;
  account_status: string;
  is_verified: boolean;
  verification_date: string;
  created_at: string;
}

export default function FollowerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const followerName = params?.name as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followerDetails, setFollowerDetails] = useState<FollowerDetails | null>(null);

  useEffect(() => {
    if (followerName) {
      loadFollowerDetails();
    }
  }, [followerName]);

  const loadFollowerDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      const { data, error } = await supabase.rpc('get_follower_account_complete_details_with_platform', {
        user_uuid: user.id,
        follower_name_input: followerName
      });

      if (error) {
        setError(`Error loading follower details: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        setFollowerDetails(data[0]);
      } else {
        setError("Follower account not found");
      }
    } catch (err) {
      setError(`Error loading follower details: ${err}`);
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
      month: 'long',
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
          <span className="ml-2">Loading follower details...</span>
        </div>
      </div>
    );
  }

  if (error || !followerDetails) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="mb-6 border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Follower Accounts
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{followerDetails.follower_name}</h1>
            <p className="text-gray-600 mt-2">
              Follower account details and trading configuration
            </p>
          </div>
          <Button onClick={() => router.push(`/dashboard/follower/${followerName}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Account
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Account Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Account Name</label>
                  <p className="text-lg font-semibold">{followerDetails.follower_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Broker Platform</label>
                  <p className="text-lg font-semibold">{followerDetails.broker_platform}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Master Broker</label>
                  <p className="text-lg font-semibold">{followerDetails.master_broker_name}</p>
                  <p className="text-sm text-gray-500">{followerDetails.master_account_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Account Status</label>
                  <div className="mt-1">{getStatusBadge(followerDetails.account_status, followerDetails.is_verified)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trading Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Trading Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Copy Mode</label>
                  <p className="text-lg font-semibold">{getCopyModeDisplay(followerDetails.copy_mode)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Risk Level</label>
                  <div className="mt-1">{getRiskLevelBadge(followerDetails.risk_level)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Lot Size</label>
                  <p className="text-lg font-semibold">{followerDetails.lot_size}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Total Balance</label>
                  <p className="text-lg font-semibold">{formatBalance(followerDetails.total_balance)}</p>
                </div>
              </div>

              {/* Copy Mode Specific Details */}
              {followerDetails.copy_mode === 'multiplier' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Multiplier Settings</h4>
                  <p className="text-blue-800">Multiplier: {followerDetails.multiplier}x</p>
                </div>
              )}

              {followerDetails.copy_mode === '% balance' && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Percentage Settings</h4>
                  <p className="text-green-800">Percentage: {followerDetails.percentage}%</p>
                </div>
              )}

              {followerDetails.copy_mode === 'fixed lot' && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Fixed Lot Settings</h4>
                  <p className="text-purple-800">Fixed Lot Size: {followerDetails.fixed_lot}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Risk Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Drawdown Limit</label>
                  <p className="text-lg font-semibold">{followerDetails.drawdown_limit}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Stop Loss</label>
                  <p className="text-lg font-semibold">{followerDetails.stop_loss_percentage}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Take Profit</label>
                  <p className="text-lg font-semibold">{followerDetails.take_profit_percentage}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Max Daily Trades</label>
                  <p className="text-lg font-semibold">{followerDetails.max_daily_trades}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Max Open Positions</label>
                  <p className="text-lg font-semibold">{followerDetails.max_open_positions}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Lot Size Range</label>
                  <p className="text-lg font-semibold">
                    {followerDetails.min_lot_size} - {followerDetails.max_lot_size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Verification Status</label>
                <div className="mt-1">
                  {followerDetails.is_verified ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Verified
                    </div>
                  ) : (
                    <div className="flex items-center text-yellow-600">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Pending Verification
                    </div>
                  )}
                </div>
              </div>

              {followerDetails.verification_date && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Verified On</label>
                  <p className="text-sm">{formatDate(followerDetails.verification_date)}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600">Created On</label>
                <p className="text-sm">{formatDate(followerDetails.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* API Information */}
          <Card>
            <CardHeader>
              <CardTitle>API Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">API Key</label>
                <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                  {followerDetails.api_key_masked}
                </p>
              </div>

              {followerDetails.profile_id && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Profile ID</label>
                  <p className="text-sm">{followerDetails.profile_id}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Activity className="w-4 h-4 mr-2" />
                View Trading History
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify Account
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Update Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 