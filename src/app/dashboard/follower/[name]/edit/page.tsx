"use client"
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, AlertCircle, ArrowLeft, Save } from "lucide-react";

interface FollowerDetails {
  follower_name: string;
  master_broker_account_id: string;
  master_broker_name: string;
  master_account_name: string;
  broker_platform: string;
  profile_id: string;
  api_key: string;
  api_secret: string;
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
  user_id: string | null;
}

export default function EditFollowerPage() {
  const router = useRouter();
  const params = useParams();
  const followerName = params?.name as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [followerDetails, setFollowerDetails] = useState<FollowerDetails | null>(null);

  // Form data
  const [profileId, setProfileId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [copyMode, setCopyMode] = useState("fixed lot");
  const [multiplier, setMultiplier] = useState(1.0);
  const [percentage, setPercentage] = useState(10.0);
  const [fixedLot, setFixedLot] = useState(1.0);
  const [lotSize, setLotSize] = useState(1.0);
  const [maxLotSize, setMaxLotSize] = useState(10.0);
  const [minLotSize, setMinLotSize] = useState(0.01);
  const [drawdownLimit, setDrawdownLimit] = useState(20.0);
  const [totalBalance, setTotalBalance] = useState(10000.0);
  const [riskLevel, setRiskLevel] = useState("medium");
  const [maxDailyTrades, setMaxDailyTrades] = useState(50);
  const [maxOpenPositions, setMaxOpenPositions] = useState(10);
  const [stopLossPercentage, setStopLossPercentage] = useState(5.0);
  const [takeProfitPercentage, setTakeProfitPercentage] = useState(10.0);

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

      console.log('🔍 Loading follower details for:', followerName, 'User:', user.id);

      // Use the new API endpoint that bypasses RLS
      const response = await fetch(`/api/follower-details?follower_name=${encodeURIComponent(followerName)}`);
      const result = await response.json();

      if (!response.ok) {
        console.log('❌ API error:', result.error);
        setError(`Error loading follower details: ${result.error}`);
        return;
      }

      if (result.success && result.data) {
        const details = result.data;
        console.log('✅ Follower details loaded via API:', {
          follower_name: details.follower_name,
          copy_mode: details.copy_mode,
          lot_size: details.lot_size,
          multiplier: details.multiplier,
          percentage: details.percentage,
          fixed_lot: details.fixed_lot,
          user_id: details.user_id
        });
        
        setFollowerDetails(details);
        populateFormFields(details);
      } else {
        console.log('❌ API returned no data');
        setError('Follower not found');
      }
    } catch (err) {
      console.log('❌ Error in loadFollowerDetails:', err);
      setError(`Error loading follower details: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const populateFormFields = (details: FollowerDetails) => {
    console.log('📊 Populating form fields with:', {
      copy_mode: details.copy_mode,
      lot_size: details.lot_size,
      multiplier: details.multiplier,
      percentage: details.percentage,
      fixed_lot: details.fixed_lot
    });

    // Populate form fields with current values
    setProfileId(details.profile_id || "");
    setApiKey(details.api_key || "");
    setApiSecret(details.api_secret || "");
    setCopyMode(details.copy_mode || "fixed lot");
    setMultiplier(details.multiplier || 1.0);
    setPercentage(details.percentage || 10.0);
    setFixedLot(details.fixed_lot || 1.0);
    setLotSize(details.lot_size || 1.0);
    setMaxLotSize(details.max_lot_size || 10.0);
    setMinLotSize(details.min_lot_size || 0.01);
    setDrawdownLimit(details.drawdown_limit || 20.0);
    setTotalBalance(details.total_balance || 10000.0);
    setRiskLevel(details.risk_level || "medium");
    setMaxDailyTrades(details.max_daily_trades || 50);
    setMaxOpenPositions(details.max_open_positions || 10);
    setStopLossPercentage(details.stop_loss_percentage || 5.0);
    setTakeProfitPercentage(details.take_profit_percentage || 10.0);

    console.log('✅ Form fields populated successfully');
  };

  const updateFollowerAccount = async (formData: any) => {
    setSaving(true);
    setError("");
    
    try {
      console.log('🔄 Updating follower account...');
      console.log('📊 Form data:', formData);

      // Use the new API endpoint for updating
      const response = await fetch(`/api/follower-details?follower_name=${encodeURIComponent(followerName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        console.log('❌ Update API error:', result.error);
        throw new Error(result.error);
      }

      if (result.success) {
        console.log('✅ Follower updated successfully via API');
        console.log('📊 Updated data:', result.data);
        
        // Update local state with the new data
        const updatedDetails = {
          ...followerDetails,
          ...result.data
        };
        setFollowerDetails(updatedDetails);
        
        // Repopulate form fields with updated values
        populateFormFields(updatedDetails);
        
        setSuccess('Follower account updated successfully!');
        
        // Show success message for 3 seconds
        setTimeout(() => {
          setSuccess('');
        }, 3000);
        
        console.log('✅ Form fields updated with new values');
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.log('❌ Error updating follower:', error);
      setError(`Error updating follower: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const getCopyModeFields = () => {
    switch (copyMode) {
      case 'multiplier':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Multiplier <span className="text-gray-500">(Current: {followerDetails?.multiplier || 1.0})</span>
              </label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="3.0"
                value={multiplier}
                onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                placeholder="1.0"
                className="border-2 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Range: 0.1 - 3.0 | This will multiply the master's lot size</p>
            </div>
          </div>
        );
      case '% balance':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Percentage <span className="text-gray-500">(Current: {followerDetails?.percentage || 10.0}%)</span>
              </label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(parseFloat(e.target.value))}
                placeholder="10.0"
                className="border-2 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Range: 1% - 100% | Percentage of available balance to use</p>
            </div>
          </div>
        );
      case 'fixed lot':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Fixed Lot Size <span className="text-gray-500">(Current: {followerDetails?.fixed_lot || 1.0})</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="1000"
                value={fixedLot}
                onChange={(e) => setFixedLot(parseFloat(e.target.value))}
                placeholder="1.0"
                className="border-2 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Range: 0.01 - 1000 | Fixed lot size for all trades</p>
            </div>
          </div>
        );
      default:
        return null;
    }
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

  if (error && !followerDetails) {
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
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Follower Details
        </Button>
        <h1 className="text-3xl font-bold">Edit Follower Account</h1>
        <p className="text-gray-600 mt-2">
          Update settings for {followerDetails?.follower_name}
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Current Values Display */}
      {followerDetails && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Current Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Copy Mode:</span>
                <div className="text-blue-800 font-semibold">{followerDetails.copy_mode}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Lot Size:</span>
                <div className="text-blue-800 font-semibold">{followerDetails.lot_size}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Multiplier:</span>
                <div className="text-blue-800 font-semibold">{followerDetails.multiplier}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Percentage:</span>
                <div className="text-blue-800 font-semibold">{followerDetails.percentage}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {/* Broker Credentials */}
        <Card>
          <CardHeader>
            <CardTitle>Broker Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Profile ID (Optional)</label>
                <Input
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  placeholder="profile_123"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">API Key</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">API Secret</label>
                <Input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter API secret"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trading Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Trading Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Copy Mode * <span className="text-gray-500">(Current: {followerDetails?.copy_mode || "fixed lot"})</span>
              </label>
              <Select value={copyMode} onValueChange={setCopyMode}>
                <SelectTrigger className="border-2 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed lot">Fixed Lot</SelectItem>
                  <SelectItem value="multiplier">Multiplier</SelectItem>
                  <SelectItem value="% balance">% Balance</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Choose how to calculate the lot size for copied trades
              </p>
            </div>

            {getCopyModeFields()}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Lot Size <span className="text-gray-500">(Current: {followerDetails?.lot_size || 1.0})</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={lotSize}
                  onChange={(e) => setLotSize(parseFloat(e.target.value))}
                  placeholder="1.0"
                  className="border-2 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Base lot size for calculations</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Min Lot Size <span className="text-gray-500">(Current: {followerDetails?.min_lot_size || 0.01})</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={minLotSize}
                  onChange={(e) => setMinLotSize(parseFloat(e.target.value))}
                  placeholder="0.01"
                  className="border-2 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum allowed lot size</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Lot Size <span className="text-gray-500">(Current: {followerDetails?.max_lot_size || 10.0})</span>
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={maxLotSize}
                  onChange={(e) => setMaxLotSize(parseFloat(e.target.value))}
                  placeholder="10.0"
                  className="border-2 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum allowed lot size</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Total Balance</label>
                <Input
                  type="number"
                  step="0.01"
                  value={totalBalance}
                  onChange={(e) => setTotalBalance(parseFloat(e.target.value))}
                  placeholder="10000.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Drawdown Limit (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="50"
                  value={drawdownLimit}
                  onChange={(e) => setDrawdownLimit(parseFloat(e.target.value))}
                  placeholder="20.0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Risk Level</label>
                <Select value={riskLevel} onValueChange={setRiskLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Daily Trades</label>
                <Input
                  type="number"
                  min="1"
                  value={maxDailyTrades}
                  onChange={(e) => setMaxDailyTrades(parseInt(e.target.value))}
                  placeholder="50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Max Open Positions</label>
                <Input
                  type="number"
                  min="1"
                  value={maxOpenPositions}
                  onChange={(e) => setMaxOpenPositions(parseInt(e.target.value))}
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Stop Loss (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={stopLossPercentage}
                  onChange={(e) => setStopLossPercentage(parseFloat(e.target.value))}
                  placeholder="5.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Take Profit (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={takeProfitPercentage}
                  onChange={(e) => setTakeProfitPercentage(parseFloat(e.target.value))}
                  placeholder="10.0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary of Changes */}
        <Card>
          <CardHeader>
            <CardTitle>Summary of Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Copy Trading Settings</h4>
                <div className="space-y-1 text-gray-600">
                  <div>Copy Mode: <span className="font-medium">{copyMode}</span></div>
                  {copyMode === 'multiplier' && (
                    <div>Multiplier: <span className="font-medium">{multiplier}x</span></div>
                  )}
                  {copyMode === '% balance' && (
                    <div>Percentage: <span className="font-medium">{percentage}%</span></div>
                  )}
                  {copyMode === 'fixed lot' && (
                    <div>Fixed Lot: <span className="font-medium">{fixedLot}</span></div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Lot Size Settings</h4>
                <div className="space-y-1 text-gray-600">
                  <div>Base Lot Size: <span className="font-medium">{lotSize}</span></div>
                  <div>Min Lot Size: <span className="font-medium">{minLotSize}</span></div>
                  <div>Max Lot Size: <span className="font-medium">{maxLotSize}</span></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => updateFollowerAccount({
              profile_id: profileId,
              api_key: apiKey,
              api_secret: apiSecret,
              copy_mode: copyMode,
              multiplier: copyMode === 'multiplier' ? multiplier : followerDetails?.multiplier,
              percentage: copyMode === '% balance' ? percentage : followerDetails?.percentage,
              fixed_lot: copyMode === 'fixed lot' ? fixedLot : followerDetails?.fixed_lot,
              lot_size: lotSize,
              max_lot_size: maxLotSize,
              min_lot_size: minLotSize,
              drawdown_limit: drawdownLimit,
              total_balance: totalBalance,
              risk_level: riskLevel,
              max_daily_trades: maxDailyTrades,
              max_open_positions: maxOpenPositions,
              stop_loss_percentage: stopLossPercentage,
              take_profit_percentage: takeProfitPercentage
            })}
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 