"use client"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, AlertCircle, ArrowLeft } from "lucide-react";

interface BrokerPlatform {
  broker_platform: string;
  platform_display_name: string;
  account_count: number;
}

interface BrokerAccount {
  id: string;
  broker_name: string;
  account_name: string;
  display_name: string;
  trader_name: string;
  is_verified: boolean;
  account_status: string;
  created_at: string;
}

interface ValidationResult {
  is_valid: boolean;
  error_message: string;
  validation_details: any;
}

export default function AddFollowerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form data
  const [followerName, setFollowerName] = useState("");
  const [selectedBroker, setSelectedBroker] = useState("");
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

  // Data from API
  const [brokerAccounts, setBrokerAccounts] = useState<BrokerAccount[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Load all available broker accounts on component mount
  useEffect(() => {
    loadAllBrokerAccounts();
  }, []);

  const loadAllBrokerAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      // Get all available broker accounts from all platforms
      const { data, error } = await supabase.rpc('get_all_broker_accounts_for_followers');

      if (error) {
        setError(`Error loading broker accounts: ${error.message}`);
        return;
      }

      setBrokerAccounts(data || []);
    } catch (err) {
      setError(`Error loading broker accounts: ${err}`);
    }
  };

  const validateCredentials = async () => {
    if (!apiKey || !apiSecret) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.rpc('validate_follower_broker_credentials_with_platform', {
        api_key_input: apiKey,
        api_secret_input: apiSecret,
        broker_platform_input: 'delta', // Default to delta for now
        profile_id_input: profileId || null
      });

      if (error) {
        setError(`Validation error: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        const result = data[0];
        setValidationResult(result);
        
        if (result.is_valid) {
          setSuccess("Credentials validated successfully!");
          setStep(3);
        } else {
          setError(result.error_message);
        }
      }
    } catch (err) {
      setError(`Validation error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const createFollowerAccount = async () => {
    if (!followerName || !selectedBroker) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      const { data, error } = await supabase.rpc('create_follower_account_with_broker_selection', {
        user_uuid: user.id,
        follower_name_input: followerName,
        selected_broker_account_id: selectedBroker,
        profile_id_input: profileId || null,
        api_key_input: apiKey || null,
        api_secret_input: apiSecret || null,
        copy_mode_input: copyMode,
        multiplier_input: copyMode === 'multiplier' ? multiplier : null,
        percentage_input: copyMode === '% balance' ? percentage : null,
        fixed_lot_input: copyMode === 'fixed lot' ? fixedLot : null,
        lot_size_input: lotSize,
        max_lot_size_input: maxLotSize,
        min_lot_size_input: minLotSize,
        drawdown_limit_input: drawdownLimit,
        total_balance_input: totalBalance,
        risk_level_input: riskLevel,
        max_daily_trades_input: maxDailyTrades,
        max_open_positions_input: maxOpenPositions,
        stop_loss_percentage_input: stopLossPercentage,
        take_profit_percentage_input: takeProfitPercentage
      });

      if (error) {
        setError(`Error creating follower account: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          setSuccess("Follower account created successfully!");
          setTimeout(() => {
            router.push('/dashboard/follower');
          }, 2000);
        } else {
          setError(result.message);
        }
      }
    } catch (err) {
      setError(`Error creating follower account: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const getCopyModeFields = () => {
    switch (copyMode) {
      case 'multiplier':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Multiplier</label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="3.0"
                value={multiplier}
                onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                placeholder="1.0"
              />
              <p className="text-xs text-gray-500 mt-1">Range: 0.1 - 3.0</p>
            </div>
          </div>
        );
      case '% balance':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Percentage</label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(parseFloat(e.target.value))}
                placeholder="10.0"
              />
              <p className="text-xs text-gray-500 mt-1">Range: 1% - 100%</p>
            </div>
          </div>
        );
      case 'fixed lot':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fixed Lot Size</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="1000"
                value={fixedLot}
                onChange={(e) => setFixedLot(parseFloat(e.target.value))}
                placeholder="1.0"
              />
              <p className="text-xs text-gray-500 mt-1">Range: 0.01 - 1000</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Add Follower Account</h1>
        <p className="text-gray-600 mt-2">
          Create a new follower account with platform validation and broker credentials
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
          <div className={`w-16 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            3
          </div>
        </div>
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

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Follower Account Name *</label>
              <Input
                value={followerName}
                onChange={(e) => setFollowerName(e.target.value)}
                placeholder="My Delta Follower"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Select Broker to Follow *</label>
              <Select value={selectedBroker} onValueChange={setSelectedBroker}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a broker account to follow" />
                </SelectTrigger>
                <SelectContent>
                  {brokerAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex flex-col w-full">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{account.display_name}</span>
                          {account.is_verified && (
                            <Badge variant="secondary" className="ml-2">Verified</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {account.trader_name} • {account.broker_name}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {brokerAccounts.length === 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  No verified broker accounts available to follow.
                </p>
              )}
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!followerName || !selectedBroker}
              className="w-full"
            >
              Next Step
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Broker Credentials */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Broker Credentials</CardTitle>
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
                <label className="block text-sm font-medium mb-2">API Key *</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">API Secret *</label>
                <Input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter API secret"
                />
              </div>
            </div>

            {validationResult && (
              <Alert className={validationResult.is_valid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {validationResult.is_valid ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={validationResult.is_valid ? "text-green-800" : "text-red-800"}>
                  {validationResult.error_message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Previous
              </Button>
              <Button
                onClick={validateCredentials}
                disabled={!apiKey || !apiSecret || loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Validate Credentials'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Trading Settings */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Trading Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Copy Mode *</label>
              <Select value={copyMode} onValueChange={setCopyMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed lot">Fixed Lot</SelectItem>
                  <SelectItem value="multiplier">Multiplier</SelectItem>
                  <SelectItem value="% balance">% Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {getCopyModeFields()}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Lot Size</label>
                <Input
                  type="number"
                  step="0.01"
                  value={lotSize}
                  onChange={(e) => setLotSize(parseFloat(e.target.value))}
                  placeholder="1.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Min Lot Size</label>
                <Input
                  type="number"
                  step="0.01"
                  value={minLotSize}
                  onChange={(e) => setMinLotSize(parseFloat(e.target.value))}
                  placeholder="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Lot Size</label>
                <Input
                  type="number"
                  step="0.1"
                  value={maxLotSize}
                  onChange={(e) => setMaxLotSize(parseFloat(e.target.value))}
                  placeholder="10.0"
                />
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

            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1"
              >
                Previous
              </Button>
              <Button
                onClick={createFollowerAccount}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Follower Account'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 