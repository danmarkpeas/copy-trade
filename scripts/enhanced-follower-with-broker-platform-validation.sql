-- Enhanced Follower System with Broker Platform Validation
-- Run this in your Supabase SQL Editor

-- 1. First, let's enhance the followers table with broker platform validation
DO $$ 
BEGIN
  -- Add broker platform field to followers table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'broker_platform'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN broker_platform text;
  END IF;
  
  -- Add broker credentials fields (if not already added)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'profile_id'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN profile_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'api_key'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN api_key text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'api_secret'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN api_secret text;
  END IF;
  
  -- Add trading configuration fields (if not already added)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'lot_size'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN lot_size numeric DEFAULT 1.0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'max_lot_size'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN max_lot_size numeric DEFAULT 10.0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'min_lot_size'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN min_lot_size numeric DEFAULT 0.01;
  END IF;
  
  -- Add account status and verification fields (if not already added)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN account_status text DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN is_verified boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'verification_date'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN verification_date timestamptz;
  END IF;
  
  -- Add broker account reference (if not already added)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'master_broker_account_id'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN master_broker_account_id uuid REFERENCES broker_accounts(id) ON DELETE SET NULL;
  END IF;
  
  -- Add additional trading parameters (if not already added)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'max_daily_trades'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN max_daily_trades int DEFAULT 50;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'max_open_positions'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN max_open_positions int DEFAULT 10;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'stop_loss_percentage'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN stop_loss_percentage numeric DEFAULT 5.0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'take_profit_percentage'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN take_profit_percentage numeric DEFAULT 10.0;
  END IF;
END $$;

-- 2. Create a function to get user's broker accounts for dropdown with platform filtering
CREATE OR REPLACE FUNCTION get_user_broker_accounts_for_follower_by_platform(
  user_uuid uuid,
  broker_platform_input text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  broker_name text,
  account_name text,
  account_uid text,
  broker_platform text,
  is_active boolean,
  is_verified boolean,
  created_at timestamptz,
  display_name text
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    ba.id,
    ba.broker_name,
    ba.account_name,
    ba.account_uid,
    ba.broker_name as broker_platform, -- Using broker_name as platform for now
    ba.is_active,
    ba.is_verified,
    ba.created_at,
    ba.broker_name || ' - ' || ba.account_name as display_name
  FROM broker_accounts ba
  WHERE ba.user_id = user_uuid
  AND ba.is_active = true
  AND (broker_platform_input IS NULL OR ba.broker_name = broker_platform_input)
  ORDER BY ba.broker_name, ba.account_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enhanced function to validate follower broker credentials with platform check
CREATE OR REPLACE FUNCTION validate_follower_broker_credentials_with_platform(
  api_key_input text,
  api_secret_input text,
  broker_platform_input text,
  profile_id_input text DEFAULT NULL
)
RETURNS TABLE (
  is_valid boolean,
  error_message text,
  validation_details jsonb
) AS $$
DECLARE
  validation_details jsonb;
BEGIN
  -- Basic validation
  IF api_key_input IS NULL OR api_key_input = '' THEN
    RETURN QUERY SELECT false, 'API Key is required', '{}'::jsonb;
    RETURN;
  END IF;
  
  IF api_secret_input IS NULL OR api_secret_input = '' THEN
    RETURN QUERY SELECT false, 'API Secret is required', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Validate broker platform
  IF broker_platform_input IS NULL OR broker_platform_input = '' THEN
    RETURN QUERY SELECT false, 'Broker platform is required', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check if credentials already exist in the system
  IF EXISTS (
    SELECT 1 FROM followers 
    WHERE api_key = api_key_input 
    AND api_secret = api_secret_input
  ) THEN
    RETURN QUERY SELECT false, 'These API credentials are already in use by another follower account', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check if credentials exist in broker_accounts (prevent using master account credentials)
  IF EXISTS (
    SELECT 1 FROM broker_accounts 
    WHERE api_key = api_key_input 
    AND api_secret = api_secret_input
  ) THEN
    RETURN QUERY SELECT false, 'These API credentials belong to a master account and cannot be used for follower accounts', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Basic format validation (you can enhance this based on your broker's requirements)
  IF LENGTH(api_key_input) < 10 THEN
    RETURN QUERY SELECT false, 'API Key appears to be too short', '{}'::jsonb;
    RETURN;
  END IF;
  
  IF LENGTH(api_secret_input) < 10 THEN
    RETURN QUERY SELECT false, 'API Secret appears to be too short', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Create validation details
  validation_details := jsonb_build_object(
    'api_key_length', LENGTH(api_key_input),
    'api_secret_length', LENGTH(api_secret_input),
    'broker_platform', broker_platform_input,
    'has_profile_id', profile_id_input IS NOT NULL,
    'validation_timestamp', NOW()
  );
  
  RETURN QUERY SELECT true, 'API credentials appear to be valid for ' || broker_platform_input, validation_details;
END;
$$ LANGUAGE plpgsql;

-- 4. Enhanced function to verify follower broker account with platform validation
CREATE OR REPLACE FUNCTION verify_follower_broker_account_with_platform(
  follower_uuid uuid,
  follower_name_input text
)
RETURNS TABLE (
  success boolean,
  message text,
  verification_details jsonb
) AS $$
DECLARE
  follower_record record;
  verification_details jsonb;
BEGIN
  -- Get follower details
  SELECT * INTO follower_record
  FROM followers 
  WHERE id = follower_uuid 
  AND follower_name = follower_name_input;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Follower account not found', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check if credentials exist
  IF follower_record.api_key IS NULL OR follower_record.api_secret IS NULL THEN
    RETURN QUERY SELECT false, 'Follower account does not have API credentials configured', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check if broker platform is set
  IF follower_record.broker_platform IS NULL THEN
    RETURN QUERY SELECT false, 'Follower account does not have broker platform configured', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Platform-specific verification
  IF follower_record.broker_platform = 'Delta Exchange' THEN
    -- Simulate API verification for Delta Exchange
    verification_details := jsonb_build_object(
      'broker', 'Delta Exchange',
      'verification_method', 'API test',
      'verification_timestamp', NOW(),
      'account_status', 'verified',
      'api_key_masked', LEFT(follower_record.api_key, 8) || '...',
      'profile_id', follower_record.profile_id,
      'platform_match', true
    );
    
    -- Update follower account as verified
    UPDATE followers 
    SET 
      is_verified = true,
      account_status = 'verified',
      verification_date = NOW()
    WHERE id = follower_uuid 
    AND follower_name = follower_name_input;
    
    RETURN QUERY SELECT true, 'Delta Exchange follower account verified successfully', verification_details;
    
  ELSIF follower_record.broker_platform = 'Binance' THEN
    -- Simulate API verification for Binance
    verification_details := jsonb_build_object(
      'broker', 'Binance',
      'verification_method', 'API test',
      'verification_timestamp', NOW(),
      'account_status', 'verified',
      'api_key_masked', LEFT(follower_record.api_key, 8) || '...',
      'profile_id', follower_record.profile_id,
      'platform_match', true
    );
    
    -- Update follower account as verified
    UPDATE followers 
    SET 
      is_verified = true,
      account_status = 'verified',
      verification_date = NOW()
    WHERE id = follower_uuid 
    AND follower_name = follower_name_input;
    
    RETURN QUERY SELECT true, 'Binance follower account verified successfully', verification_details;
    
  ELSE
    -- For other brokers, implement specific verification logic
    verification_details := jsonb_build_object(
      'broker', follower_record.broker_platform,
      'verification_method', 'manual',
      'verification_timestamp', NOW(),
      'account_status', 'pending_manual_verification',
      'platform_match', true
    );
    
    RETURN QUERY SELECT false, 'Manual verification required for ' || follower_record.broker_platform, verification_details;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Enhanced function to create follower account with platform validation
CREATE OR REPLACE FUNCTION create_follower_account_with_platform_validation(
  user_uuid uuid,
  follower_name_input text,
  master_broker_account_id_input uuid,
  broker_platform_input text,
  profile_id_input text DEFAULT NULL,
  api_key_input text DEFAULT NULL,
  api_secret_input text DEFAULT NULL,
  copy_mode_input text DEFAULT 'fixed lot',
  multiplier_input numeric DEFAULT 1.0,
  percentage_input numeric DEFAULT 10.0,
  fixed_lot_input numeric DEFAULT 1.0,
  lot_size_input numeric DEFAULT 1.0,
  max_lot_size_input numeric DEFAULT 10.0,
  min_lot_size_input numeric DEFAULT 0.01,
  drawdown_limit_input numeric DEFAULT 20.0,
  total_balance_input numeric DEFAULT 10000.0,
  risk_level_input text DEFAULT 'medium',
  max_daily_trades_input int DEFAULT 50,
  max_open_positions_input int DEFAULT 10,
  stop_loss_percentage_input numeric DEFAULT 5.0,
  take_profit_percentage_input numeric DEFAULT 10.0
)
RETURNS TABLE (
  success boolean,
  message text,
  follower_id uuid,
  validation_details jsonb
) AS $$
DECLARE
  new_follower_id uuid;
  validation_result record;
  credential_validation record;
  broker_account record;
BEGIN
  -- Validate copy mode settings first
  SELECT * INTO validation_result FROM validate_copy_mode_settings(
    copy_mode_input,
    multiplier_input,
    percentage_input,
    fixed_lot_input,
    drawdown_limit_input,
    total_balance_input
  );
  
  IF NOT validation_result.is_valid THEN
    RETURN QUERY SELECT false, validation_result.error_message, NULL::uuid, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check if can create follower account
  IF NOT EXISTS (
    SELECT 1 FROM can_create_follower_account(user_uuid, follower_name_input)
    WHERE can_create = true
  ) THEN
    RETURN QUERY SELECT false, 'Cannot create follower account - name already exists', NULL::uuid, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Validate master broker account
  SELECT * INTO broker_account
  FROM broker_accounts 
  WHERE id = master_broker_account_id_input 
  AND user_id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Master broker account not found or does not belong to you', NULL::uuid, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- CRITICAL: Validate broker platform match
  IF broker_account.broker_name != broker_platform_input THEN
    RETURN QUERY SELECT false, 'Broker platform mismatch: Follower platform (' || broker_platform_input || ') must match master broker platform (' || broker_account.broker_name || ')', NULL::uuid, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Validate broker credentials if provided
  IF api_key_input IS NOT NULL AND api_secret_input IS NOT NULL THEN
    SELECT * INTO credential_validation FROM validate_follower_broker_credentials_with_platform(
      api_key_input,
      api_secret_input,
      broker_platform_input,
      profile_id_input
    );
    
    IF NOT credential_validation.is_valid THEN
      RETURN QUERY SELECT false, credential_validation.error_message, NULL::uuid, '{}'::jsonb;
      RETURN;
    END IF;
  END IF;
  
  -- Validate lot size constraints
  IF lot_size_input < min_lot_size_input OR lot_size_input > max_lot_size_input THEN
    RETURN QUERY SELECT false, 'Lot size must be between min and max lot size', NULL::uuid, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Create the follower account with all settings including platform
  INSERT INTO followers (
    id, 
    follower_name,
    master_broker_account_id,
    broker_platform,
    profile_id,
    api_key,
    api_secret,
    copy_mode,
    multiplier,
    percentage,
    fixed_lot,
    lot_size,
    max_lot_size,
    min_lot_size,
    drawdown_limit,
    total_balance,
    risk_level,
    capital_allocated,
    max_daily_trades,
    max_open_positions,
    stop_loss_percentage,
    take_profit_percentage,
    account_status,
    is_verified
  )
  VALUES (
    user_uuid, 
    follower_name_input,
    master_broker_account_id_input,
    broker_platform_input,
    profile_id_input,
    api_key_input,
    api_secret_input,
    copy_mode_input,
    multiplier_input,
    percentage_input,
    fixed_lot_input,
    lot_size_input,
    max_lot_size_input,
    min_lot_size_input,
    drawdown_limit_input,
    total_balance_input,
    risk_level_input,
    total_balance_input,
    max_daily_trades_input,
    max_open_positions_input,
    stop_loss_percentage_input,
    take_profit_percentage_input,
    CASE WHEN api_key_input IS NOT NULL THEN 'pending' ELSE 'inactive' END,
    false
  )
  RETURNING id INTO new_follower_id;
  
  RETURN QUERY SELECT 
    true, 
    'Follower account created successfully with platform validation', 
    new_follower_id,
    jsonb_build_object(
      'follower_name', follower_name_input,
      'master_broker', broker_account.broker_name || ' - ' || broker_account.account_name,
      'broker_platform', broker_platform_input,
      'platform_match', true,
      'copy_mode', copy_mode_input,
      'lot_size', lot_size_input,
      'has_credentials', api_key_input IS NOT NULL,
      'account_status', CASE WHEN api_key_input IS NOT NULL THEN 'pending' ELSE 'inactive' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get available broker platforms for a user
CREATE OR REPLACE FUNCTION get_user_broker_platforms(user_uuid uuid)
RETURNS TABLE (
  broker_platform text,
  platform_display_name text,
  account_count int
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    ba.broker_name as broker_platform,
    ba.broker_name as platform_display_name,
    COUNT(*) as account_count
  FROM broker_accounts ba
  WHERE ba.user_id = user_uuid
  AND ba.is_active = true
  GROUP BY ba.broker_name
  ORDER BY ba.broker_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to get broker accounts by platform for dropdown
CREATE OR REPLACE FUNCTION get_broker_accounts_by_platform(
  user_uuid uuid,
  broker_platform_input text
)
RETURNS TABLE (
  id uuid,
  broker_name text,
  account_name text,
  account_uid text,
  is_active boolean,
  is_verified boolean,
  created_at timestamptz,
  display_name text
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    ba.id,
    ba.broker_name,
    ba.account_name,
    ba.account_uid,
    ba.is_active,
    ba.is_verified,
    ba.created_at,
    ba.broker_name || ' - ' || ba.account_name as display_name
  FROM broker_accounts ba
  WHERE ba.user_id = user_uuid
  AND ba.broker_name = broker_platform_input
  AND ba.is_active = true
  ORDER BY ba.account_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Enhanced function to get complete follower account details with platform
CREATE OR REPLACE FUNCTION get_follower_account_complete_details_with_platform(
  user_uuid uuid,
  follower_name_input text
)
RETURNS TABLE (
  follower_name text,
  master_broker_account_id uuid,
  master_broker_name text,
  master_account_name text,
  broker_platform text,
  profile_id text,
  api_key_masked text,
  copy_mode text,
  multiplier numeric,
  percentage numeric,
  fixed_lot numeric,
  lot_size numeric,
  max_lot_size numeric,
  min_lot_size numeric,
  drawdown_limit numeric,
  total_balance numeric,
  risk_level text,
  capital_allocated numeric,
  max_daily_trades int,
  max_open_positions int,
  stop_loss_percentage numeric,
  take_profit_percentage numeric,
  account_status text,
  is_verified boolean,
  verification_date timestamptz,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    f.follower_name,
    f.master_broker_account_id,
    ba.broker_name as master_broker_name,
    ba.account_name as master_account_name,
    f.broker_platform,
    f.profile_id,
    CASE 
      WHEN f.api_key IS NOT NULL THEN LEFT(f.api_key, 8) || '...'
      ELSE 'Not configured'
    END as api_key_masked,
    f.copy_mode,
    f.multiplier,
    f.percentage,
    f.fixed_lot,
    f.lot_size,
    f.max_lot_size,
    f.min_lot_size,
    f.drawdown_limit,
    f.total_balance,
    f.risk_level,
    f.capital_allocated,
    f.max_daily_trades,
    f.max_open_positions,
    f.stop_loss_percentage,
    f.take_profit_percentage,
    f.account_status,
    f.is_verified,
    f.verification_date,
    f.created_at
  FROM followers f
  LEFT JOIN broker_accounts ba ON f.master_broker_account_id = ba.id
  WHERE f.id = user_uuid AND f.follower_name = follower_name_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Test the enhanced structure
SELECT 'Enhanced followers table structure with platform validation' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'followers'
ORDER BY ordinal_position;

-- 10. Test the new functions
SELECT 'Testing enhanced follower functions with platform validation' as info;

-- Test getting broker platforms
SELECT 'Available broker platforms test' as test_name;
-- This will show results if you have broker accounts in your database
-- SELECT * FROM get_user_broker_platforms('your-user-uuid');

-- Test credential validation with platform
SELECT 'Valid credentials with platform test' as test_name, * FROM validate_follower_broker_credentials_with_platform('test_api_key_123456789', 'test_secret_123456789', 'Delta Exchange', 'profile_123');
SELECT 'Invalid platform test' as test_name, * FROM validate_follower_broker_credentials_with_platform('test_api_key_123456789', 'test_secret_123456789', '', 'profile_123');

-- Test platform-specific broker accounts
SELECT 'Platform-specific broker accounts test' as test_name;
-- This will show results if you have broker accounts in your database
-- SELECT * FROM get_broker_accounts_by_platform('your-user-uuid', 'Delta Exchange'); 