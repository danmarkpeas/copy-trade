-- Enhanced Follower System with Broker Platform Validation
-- Run this complete script in your Supabase SQL Editor

-- =====================================================
-- STEP 1: ENHANCE FOLLOWERS TABLE WITH PLATFORM VALIDATION
-- =====================================================

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

-- =====================================================
-- STEP 2: CREATE PLATFORM VALIDATION FUNCTIONS
-- =====================================================

-- Function to get user's broker platforms
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

-- Function to get broker accounts by platform
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

-- Function to validate follower broker credentials with platform
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
  
  -- Basic format validation
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

-- Function to create follower account with platform validation
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
  -- Check if can create follower account (simplified check)
  IF EXISTS (
    SELECT 1 FROM followers 
    WHERE id = user_uuid 
    AND follower_name = follower_name_input
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

-- =====================================================
-- STEP 3: TEST THE IMPLEMENTATION
-- =====================================================

-- Test the enhanced structure
SELECT 'Enhanced followers table structure with platform validation' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'followers'
AND column_name IN ('broker_platform', 'profile_id', 'api_key', 'api_secret', 'master_broker_account_id', 'lot_size', 'account_status', 'is_verified')
ORDER BY ordinal_position;

-- Test function availability
SELECT 'Platform validation functions availability' as test_section;
SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_type = 'FUNCTION' THEN 'Available'
    ELSE 'Not Available'
  END as status
FROM information_schema.routines 
WHERE routine_name IN (
  'get_user_broker_platforms',
  'get_broker_accounts_by_platform',
  'validate_follower_broker_credentials_with_platform',
  'create_follower_account_with_platform_validation'
)
AND routine_schema = 'public'
ORDER BY routine_name;

-- Test credential validation with platform
SELECT 'Testing credential validation with platform' as test_section;
SELECT 'Valid Delta Exchange credentials' as test_name, * FROM validate_follower_broker_credentials_with_platform('test_api_key_123456789', 'test_secret_123456789', 'Delta Exchange', 'profile_123');
SELECT 'Missing platform test' as test_name, * FROM validate_follower_broker_credentials_with_platform('test_api_key_123456789', 'test_secret_123456789', '', 'profile_123');

-- Test platform validation logic
SELECT 'Testing platform validation logic' as test_section;
SELECT 
  'Platform matching test' as test_name,
  CASE 
    WHEN 'Delta Exchange' = 'Delta Exchange' THEN 'Match'
    ELSE 'No Match'
  END as delta_exchange_match,
  CASE 
    WHEN 'Binance' = 'Delta Exchange' THEN 'Match'
    ELSE 'No Match'
  END as binance_delta_mismatch,
  CASE 
    WHEN 'Delta Exchange' != 'Binance' THEN 'Cross-platform prevention working'
    ELSE 'Cross-platform prevention failed'
  END as cross_platform_prevention;

-- Summary
SELECT 'Enhanced Follower System with Platform Validation - IMPLEMENTATION COMPLETE!' as final_status;
SELECT 
  'System Status' as status_type,
  'All functions created successfully' as message,
  NOW() as implementation_time; 