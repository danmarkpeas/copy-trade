"use client"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { sendAccountCreationEmail } from "@/lib/email";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Eye, Edit, Trash2, CheckCircle, XCircle, AlertCircle, ArrowRight, Info, ChevronDown, ChevronUp } from "lucide-react";
import CopyModeExplanation from "@/components/CopyModeExplanation";

interface FollowerAccount {
  id: string;
  follower_name: string;
  master_broker_name: string;
  master_account_name: string;
  trader_name: string;
  copy_mode: string;
  lot_size: number;
  multiplier?: number;
  fixed_lot?: number;
  min_lot_size?: number;
  max_lot_size?: number;
  account_status: string;
  is_verified: boolean;
  created_at: string;
}

interface BrokerAccount {
  id: string;
  broker_name: string;
  account_name: string;
  trader_name: string;
  is_verified: boolean;
  account_status: string;
  created_at: string;
}

export default function FollowersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followerAccounts, setFollowerAccounts] = useState<FollowerAccount[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingFollower, setEditingFollower] = useState<FollowerAccount | null>(null);
  const [brokerAccounts, setBrokerAccounts] = useState<BrokerAccount[]>([]);
  const [selectedBroker, setSelectedBroker] = useState("");
  const [followerName, setFollowerName] = useState("");
  const [profileId, setProfileId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [success, setSuccess] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [lotSize, setLotSize] = useState(1.0);
  const [copyMode, setCopyMode] = useState("fixed lot");
  const [modalError, setModalError] = useState("");
  const [showCopyModeExplanation, setShowCopyModeExplanation] = useState(false);

  useEffect(() => {
    loadFollowerAccounts();
    loadAllBrokerAccounts();
  }, []);

  useEffect(() => {
    console.log('Follower accounts state changed:', followerAccounts);
  }, [followerAccounts]);

  const loadFollowerAccounts = async () => {
    try {
      console.log('🔍 Loading follower accounts...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error:', authError);
        setError("Authentication error: " + authError.message);
        return;
      }
      
      let currentUser = user;
      if (!currentUser) {
        console.log('❌ No user found, trying session...');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setError("User not authenticated - please login");
          return;
        }
        console.log('✅ Found user from session:', session.user.email);
        currentUser = session.user;
      } else {
        console.log('✅ Found user:', currentUser.email);
      }
      if (!currentUser) {
        setError("User not authenticated");
        return;
      }
      
      console.log('🔍 Querying followers through brokers for user ID:', currentUser.id);

      // NEW ARCHITECTURE: Get followers through brokers
      // Step 1: Get user's active brokers
      const { data: brokers, error: brokersError } = await supabase
        .from('broker_accounts')
        .select('id, account_name, broker_name')
        .eq('user_id', currentUser.id)
        .eq('is_active', true);

      if (brokersError) {
        console.error('Error loading brokers:', brokersError);
        setError(`Error loading broker accounts: ${brokersError.message}`);
        return;
      }

      console.log(`Found ${brokers?.length || 0} active brokers for user`);

      if (!brokers || brokers.length === 0) {
        console.log('No active brokers found for user');
        setFollowerAccounts([]);
        return;
      }

      // Step 2: Get followers for each broker
      let allFollowers: any[] = [];
      for (const broker of brokers) {
        console.log(`Loading followers for broker: ${broker.account_name}`);
        
        const { data: followers, error: followersError } = await supabase
          .from('followers')
          .select(`
            id,
            follower_name,
            copy_mode,
            lot_size,
            multiplier,
            fixed_lot,
            min_lot_size,
            max_lot_size,
            account_status,
            is_verified,
            created_at,
            master_broker_account_id
          `)
          .eq('master_broker_account_id', broker.id)
          .order('created_at', { ascending: false });

        if (followersError) {
          console.error(`Error loading followers for broker ${broker.account_name}:`, followersError);
          continue;
        }

        if (followers && followers.length > 0) {
          console.log(`Found ${followers.length} followers for broker ${broker.account_name}`);
          allFollowers = allFollowers.concat(followers);
        }
      }

      const data = allFollowers;

      // Transform the data to match our interface
      const transformedData = data?.map(follower => {
        // Find the broker for this follower
        const broker = brokers?.find(b => b.id === follower.master_broker_account_id);
        
        return {
          id: follower.id,
          follower_name: follower.follower_name || 'Unnamed Follower',
          master_broker_name: broker?.broker_name || 'Delta Exchange',
          master_account_name: broker?.account_name || 'Unknown',
          trader_name: currentUser.email || 'Unknown',
          copy_mode: follower.copy_mode || 'fixed_lot',
          lot_size: follower.lot_size || 1.0,
          multiplier: follower.multiplier,
          fixed_lot: follower.fixed_lot,
          min_lot_size: follower.min_lot_size,
          max_lot_size: follower.max_lot_size,
          account_status: follower.account_status || 'active',
          is_verified: follower.is_verified || false,
          created_at: follower.created_at
        };
      }) || [];

      console.log('Loaded followers:', transformedData);
      console.log('Setting follower accounts state with:', transformedData.length, 'followers');
      setFollowerAccounts(transformedData);
    } catch (err) {
      console.error('Error in loadFollowerAccounts:', err);
      setError(`Error loading follower accounts: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAllBrokerAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }
      // Only get Delta Exchange broker accounts
      const { data, error } = await supabase
        .from('broker_accounts')
        .select(`
          id,
          broker_name,
          account_name,
          is_verified,
          account_status,
          created_at,
          users(name)
        `)
        .eq('broker_name', 'delta')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        setError(`Error loading broker accounts: ${error.message}`);
        return;
      }

      const formattedData = data?.map(account => ({
        ...account,
        trader_name: (account.users as any)?.name || 'Unknown'
      })) || [];

      setBrokerAccounts(formattedData);
    } catch (err) {
      setError(`Error loading broker accounts: ${err}`);
    }
  };

  const openEditModal = (follower: FollowerAccount) => {
    setEditingFollower(follower);
    setCopyMode(follower.copy_mode);
    
    // Set a default lot size based on the basic follower data
    // This provides immediate feedback while we load the full data
    if (follower.copy_mode === 'multiplier') {
      setLotSize(follower.multiplier || 1.0);
    } else if (follower.copy_mode === 'fixed_amount') {
      // Fixed amount not available in current schema, use lot_size as fallback
      setLotSize(follower.lot_size || 10.0);
    } else if (follower.copy_mode === 'fixed_lot') {
      setLotSize(follower.fixed_lot || 0.001);
    } else {
      setLotSize(follower.lot_size || 1.0);
    }
    
    // Load the full follower data to get all fields
    loadFollowerDataForEdit(follower.id);
    
    setModalError("");
    setShowEdit(true);
  };

  const loadFollowerDataForEdit = async (followerId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      console.log('Loading follower data for ID:', followerId, 'User ID:', user.id);

      // First, let's check if the follower exists
      const { data: followerCheck, error: checkError } = await supabase
        .from('followers')
        .select('id, follower_name, user_id')
        .eq('id', followerId)
        .single();

      if (checkError) {
        console.error('Error checking follower existence:', checkError);
        // Try to load without user_id filter as fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('followers')
          .select('*')
          .eq('id', followerId)
          .single();

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return;
        }

        if (fallbackData) {
          console.log('Loaded follower data (fallback):', fallbackData);
          setLotSizeFromFollowerData(fallbackData);
        }
        return;
      }

      if (!followerCheck) {
        console.error('Follower not found');
        return;
      }

      console.log('Follower found:', followerCheck);

      // Now load the full data
      const { data, error } = await supabase
        .from('followers')
        .select('*')
        .eq('id', followerId)
        .single();

      if (error) {
        console.error('Error loading full follower data:', error);
        return;
      }

      if (data) {
        console.log('Successfully loaded follower data:', data);
        setLotSizeFromFollowerData(data);
      }
    } catch (err) {
      console.error('Error loading follower data for edit:', err);
    }
  };

  const setLotSizeFromFollowerData = (data: any) => {
    // Set the appropriate value based on copy mode
    if (data.copy_mode === 'multiplier') {
      setLotSize(data.multiplier || 1.0);
    } else if (data.copy_mode === 'fixed_amount') {
      // Fixed amount not available in current schema, use lot_size as fallback
      setLotSize(data.lot_size || 10.0);
    } else if (data.copy_mode === 'fixed_lot') {
      setLotSize(data.fixed_lot || 0.001);
    } else {
      setLotSize(data.lot_size || 1.0);
    }
  };

  const closeEditModal = () => {
    setShowEdit(false);
    setEditingFollower(null);
    setModalError("");
  };

  const updateFollowerSettings = async () => {
    if (!editingFollower) return;

    if (lotSize <= 0) {
      setModalError("Lot size must be greater than 0");
      return;
    }

    setEditLoading(true);
    setModalError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setModalError("User not authenticated");
        return;
      }

                          // Prepare update data based on copy mode
                    const updateData: any = {
                      copy_mode: copyMode,
                      lot_size: lotSize
                    };

                          // Add mode-specific fields
                    if (copyMode === 'multiplier') {
                      updateData.multiplier = lotSize; // Use lotSize as multiplier value
                      updateData.fixed_lot = null;
                    } else if (copyMode === 'fixed_amount') {
                      // Fixed amount not supported in current schema, convert to fixed lot
                      updateData.fixed_lot = lotSize; // Use lotSize as fixed lot value
                      updateData.multiplier = null;
                      updateData.copy_mode = 'fixed_lot'; // Update the copy mode as well
                    } else if (copyMode === 'fixed_lot') {
                      updateData.fixed_lot = lotSize; // Use lotSize as fixed lot value
                      updateData.multiplier = null;
                    }

      // Update the follower's settings
      const { error } = await supabase
        .from('followers')
        .update(updateData)
        .eq('id', editingFollower.id)
        .eq('user_id', user.id);

      if (error) {
        setModalError(`Error updating follower settings: ${error.message}`);
        return;
      }

      setSuccess(`Follower "${editingFollower.follower_name}" settings updated successfully!`);
      closeEditModal();
      loadFollowerAccounts(); // Refresh the list
    } catch (err) {
      setModalError(`Error updating follower settings: ${err}`);
    } finally {
      setEditLoading(false);
    }
  };

  const createFollowerAccount = async () => {
    if (!followerName.trim()) {
      setModalError("Follower account name is required");
      return;
    }
    if (!selectedBroker) {
      setModalError("Please select a broker to follow");
      return;
    }
    if (!profileId.trim()) {
      setModalError("Profile ID is required");
      return;
    }
    if (!apiKey.trim()) {
      setModalError("API Key is required");
      return;
    }
    if (!apiSecret.trim()) {
      setModalError("API Secret is required");
      return;
    }
    if (lotSize <= 0) {
      setModalError("Lot size must be greater than 0");
      return;
    }

    setAddLoading(true);
    setModalError("");

    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Authentication error:', authError);
        setModalError(`Authentication error: ${authError.message}`);
        return;
      }
      
      if (!user) {
        console.error('No authenticated user found');
        setModalError("User not authenticated. Please log in to the application first.");
        return;
      }

      console.log('Creating follower for user:', user.email, 'ID:', user.id);

      // First, verify the API credentials
      const verifyResponse = await fetch('/api/broker-account/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_name: 'delta',
          api_key: apiKey,
          api_secret: apiSecret
        })
      });

      const verifyResult = await verifyResponse.json();
      if (!verifyResult.valid) {
        setModalError(`API verification failed: ${verifyResult.message || 'Invalid credentials'}`);
        return;
      }

      // Create the follower account
      const { data, error } = await supabase.rpc('create_follower_account', {
        follower_name: followerName.trim(),
        master_broker_id: selectedBroker,
        profile_id: profileId.trim(),
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
        copy_mode: copyMode,
        lot_size: lotSize
      });

      if (error) {
        setModalError(`Error creating follower account: ${error.message}`);
        return;
      }

      // Check if the function returned a successful result
      if (!data || !data.success) {
        const errorMessage = data?.error || 'Unknown error occurred';
        setModalError(`Error creating follower account: ${errorMessage}`);
        return;
      }

      // Send confirmation email
      try {
        await sendAccountCreationEmail(
          user.email || '',
          'follower',
          followerName.trim()
        );
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the account creation if email fails
      }

      setSuccess(`Follower account "${followerName}" created successfully!`);
      setShowAdd(false);
      setFollowerName("");
      setSelectedBroker("");
      setProfileId("");
      setApiKey("");
      setApiSecret("");
      setLotSize(1.0);
      setCopyMode("fixed lot");
      loadFollowerAccounts(); // Refresh the list
    } catch (err) {
      setModalError(`Error creating follower account: ${err}`);
    } finally {
      setAddLoading(false);
    }
  };

  const deleteFollowerAccount = async (followerId: string, followerName: string) => {
    if (!confirm(`Are you sure you want to delete the follower account "${followerName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Use direct deletion instead of RPC function
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('id', followerId);

      if (error) {
        setError(`Error deleting follower account: ${error.message}`);
        return;
      }

      setSuccess(`Follower account "${followerName}" deleted successfully!`);
      loadFollowerAccounts(); // Refresh the list
    } catch (err) {
      setError(`Error deleting follower account: ${err}`);
    }
  };

  const getStatusBadge = (status: string, isVerified: boolean) => {
    if (!isVerified) {
      return <Badge variant="destructive">Unverified</Badge>;
    }
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCopyModeDisplay = (copyMode: string) => {
    switch (copyMode) {
      case 'fixed lot':
        return <Badge variant="secondary">Fixed Lot</Badge>;
      case 'multiplier':
        return <Badge variant="secondary">Multiplier</Badge>;
      case 'fixed_amount':
        return <Badge variant="secondary">Fixed Lot</Badge>; // Convert to fixed lot display
      default:
        return <Badge variant="secondary">{copyMode}</Badge>;
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Follower Accounts</h1>
          <p className="text-gray-600 mt-2">Manage your follower accounts to copy trades from verified traders</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowCopyModeExplanation(!showCopyModeExplanation)} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Info className="w-4 h-4" />
            {showCopyModeExplanation ? 'Hide' : 'Show'} Copy Mode Guide
            {showCopyModeExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Follower Account
          </Button>
        </div>
      </div>

      {/* Copy Mode Explanation Section */}
      {showCopyModeExplanation && (
        <div className="mb-6">
          <CopyModeExplanation 
            selectedMode={copyMode === "multiplier" ? "multiplier" : copyMode === "fixed_amount" ? "fixed_amount" : "fixed_lot"}
            onModeSelect={(mode) => setCopyMode(mode === "multiplier" ? "multiplier" : mode === "fixed_amount" ? "fixed_amount" : "fixed lot")}
          />
        </div>
      )}

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

      {/* Add Follower Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => {
              setShowAdd(false);
              setModalError("");
            }}>
              <XCircle className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Add Follower Account</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Follower Account Name *</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={followerName}
                  onChange={e => setFollowerName(e.target.value)}
                  placeholder="My Follower Account"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Select Delta Exchange Broker to Follow *</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={selectedBroker}
                  onChange={e => setSelectedBroker(e.target.value)}
                >
                  <option value="">Select a Delta Exchange broker account</option>
                  {brokerAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} ({account.trader_name} • Delta Exchange)
                      {account.is_verified ? ' ✓ Verified' : ' ⚠ Unverified'}
                    </option>
                  ))}
                </select>
                {brokerAccounts.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">No Delta Exchange broker accounts found. Please add a Delta Exchange broker account first.</p>
                )}
                {brokerAccounts.length > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    <strong>Note:</strong> Only Delta Exchange brokers are supported. Your API credentials will be verified before creating the follower account.
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Profile ID *</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={profileId}
                  onChange={e => setProfileId(e.target.value)}
                  placeholder="Enter profile ID"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">API Key *</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">API Secret *</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  type="password"
                  value={apiSecret}
                  onChange={e => setApiSecret(e.target.value)}
                  placeholder="Enter API secret"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Copy Mode *</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={copyMode}
                  onChange={e => setCopyMode(e.target.value)}
                >
                  <option value="fixed lot">Fixed Lot</option>
                  <option value="multiplier">Multiplier</option>
                  
                </select>
                <div className="text-xs text-gray-600 mt-1 min-h-[32px]">
                  {copyMode === "fixed lot" ? (
                    <><strong>Fixed Lot:</strong> Always trade the same lot size (e.g., 0.01 BTC) regardless of broker size.</>
                  ) : copyMode === "multiplier" ? (
                    <><strong>Multiplier:</strong> Trade proportionally to broker (e.g., 0.5x = 50% of broker size).</>
                  ) : (
                    <><strong>Fixed Lot:</strong> Always trade the same lot size (e.g., 0.01 BTC) regardless of broker size.</>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  "Lot Size *"
                </label>
                <input
                  className="w-full border rounded px-3 py-2"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={lotSize}
                  onChange={e => setLotSize(Number(e.target.value))}
                  placeholder="Enter lot size (e.g., 1.0)"
                />
                <div className="text-xs text-gray-500 mt-1">
                  "This is the lot size that will be used for trading."
                </div>
              </div>
            </div>
            
            {modalError && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{modalError}</AlertDescription>
              </Alert>
            )}

            <Button onClick={createFollowerAccount} disabled={addLoading} className="w-full mt-6">
              {addLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Follower Account
            </Button>
          </div>
        </div>
      )}

      {/* Edit Follower Modal */}
      {showEdit && editingFollower && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={closeEditModal}>
              <XCircle className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Edit Follower Settings</h2>
            <p className="text-sm text-gray-600 mb-4">Editing settings for: <strong>{editingFollower.follower_name}</strong></p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Copy Mode *</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={copyMode}
                  onChange={e => setCopyMode(e.target.value)}
                >
                  <option value="fixed lot">Fixed Lot</option>
                  <option value="multiplier">Multiplier</option>
                  
                </select>
                <div className="text-xs text-gray-600 mt-1 min-h-[32px]">
                  {copyMode === "fixed lot" ? (
                    <><strong>Fixed Lot:</strong> Always trade the same lot size (e.g., 0.01 BTC) regardless of broker size.</>
                  ) : copyMode === "multiplier" ? (
                    <><strong>Multiplier:</strong> Trade proportionally to broker (e.g., 0.5x = 50% of broker size).</>
                  ) : (
                    <><strong>Fixed Lot:</strong> Always trade the same lot size (e.g., 0.01 BTC) regardless of broker size.</>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  "Lot Size *"
                </label>
                <input
                  className="w-full border rounded px-3 py-2"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={lotSize}
                  onChange={e => setLotSize(Number(e.target.value))}
                  placeholder="Enter lot size (e.g., 1.0)"
                />
                <div className="text-xs text-gray-500 mt-1">
                  "This is the lot size that will be used for trading."
                </div>
              </div>
            </div>
            
            {modalError && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{modalError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 mt-6">
              <Button onClick={closeEditModal} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={updateFollowerSettings} disabled={editLoading} className="flex-1">
                {editLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Update Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {(() => { console.log('Rendering followers page - loading:', loading, 'followerAccounts:', followerAccounts.length, 'data:', followerAccounts); return null; })()}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading follower accounts...</span>
        </div>
      ) : followerAccounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Follower Accounts</h3>
            <p className="text-gray-600 text-center mb-6">
              You haven't created any follower accounts yet. Create your first follower account to start following verified traders.
            </p>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Follower Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
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
                        {account.lot_size > 0 ? account.lot_size.toString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(account.account_status, account.is_verified)}
                      </TableCell>
                      <TableCell>
                        {formatDate(account.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(account)}
                            className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteFollowerAccount(account.id, account.follower_name)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
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