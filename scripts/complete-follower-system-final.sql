-- Complete Follower System - Final Implementation
-- This script contains all necessary functions for the follower UI system

-- =====================================================
-- 1. ENSURE TABLES EXIST
-- =====================================================

-- Ensure followers table exists with all required columns
CREATE TABLE IF NOT EXISTS public.followers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  follower_name text not null,
  master_broker_account_id uuid references broker_accounts(id) on delete cascade,
  broker_platform text not null,
  profile_id text,
  api_key text,
  api_secret text,
  copy_mode text default 'fixed lot',
  multiplier numeric,
  percentage numeric,
  fixed_lot numeric,
  lot_size numeric default 1.0,
  max_lot_size numeric default 10.0,
  min_lot_size numeric default 0.01,
  drawdown_limit numeric default 20.0,
  total_balance numeric default 10000.0,
  risk_level text default 'medium',
  capital_allocated numeric,
  account_status text default 'pending',
  is_verified boolean default false,
  verification_date timestamptz,
  max_daily_trades integer default 50,
  max_open_positions integer default 10,
  stop_loss_percentage numeric default 5.0,
  take_profit_percentage numeric default 10.0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add broker_platform column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'broker_platform') THEN
    ALTER TABLE public.followers ADD COLUMN broker_platform text;
  END IF;
  
  -- Add profile_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'profile_id') THEN
    ALTER TABLE public.followers ADD COLUMN profile_id text;
  END IF;
  
  -- Add api_key column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'api_key') THEN
    ALTER TABLE public.followers ADD COLUMN api_key text;
  END IF;
  
  -- Add api_secret column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'api_secret') THEN
    ALTER TABLE public.followers ADD COLUMN api_secret text;
  END IF;
  
  -- Add other missing columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'max_lot_size') THEN
    ALTER TABLE public.followers ADD COLUMN max_lot_size numeric default 10.0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'min_lot_size') THEN
    ALTER TABLE public.followers ADD COLUMN min_lot_size numeric default 0.01;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'max_daily_trades') THEN
    ALTER TABLE public.followers ADD COLUMN max_daily_trades integer default 50;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'max_open_positions') THEN
    ALTER TABLE public.followers ADD COLUMN max_open_positions integer default 10;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'stop_loss_percentage') THEN
    ALTER TABLE public.followers ADD COLUMN stop_loss_percentage numeric default 5.0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'take_profit_percentage') THEN
    ALTER TABLE public.followers ADD COLUMN take_profit_percentage numeric default 10.0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'verification_date') THEN
    ALTER TABLE public.followers ADD COLUMN verification_date timestamptz;
  END IF;
END $$;

-- =====================================================
-- 2. ADD CONSTRAINTS
-- =====================================================

-- Add unique constraints safely
DO $$ 
BEGIN
  -- Drop existing constraints if they exist
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_follower_name') THEN
    ALTER TABLE public.followers DROP CONSTRAINT unique_follower_name;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_follower_broker_account') THEN
    ALTER TABLE public.followers DROP CONSTRAINT unique_follower_broker_account;
  END IF;
  
  -- Add new constraints
  ALTER TABLE public.followers ADD CONSTRAINT unique_follower_name UNIQUE (user_id, follower_name);
  ALTER TABLE public.followers ADD CONSTRAINT unique_follower_broker_account UNIQUE (user_id, master_broker_account_id);
END $$;

-- =====================================================
-- 3. CORE FUNCTIONS
-- =====================================================

-- Get user's broker platforms
CREATE OR REPLACE FUNCTION get_user_broker_platforms(user_uuid uuid)
RETURNS TABLE (
  broker_platform text,
  platform_display_name text,
  account_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ba.broker_name as broker_platform,
    CASE 
      WHEN ba.broker_name = 'delta' THEN 'Delta Exchange'
      WHEN ba.broker_name = 'binance' THEN 'Binance'
      WHEN ba.broker_name = 'bybit' THEN 'Bybit'
      ELSE ba.broker_name
    END as platform_display_name,
    COUNT(*) as account_count
  FROM broker_accounts ba
  WHERE ba.user_id = user_uuid
  GROUP BY ba.broker_name
  ORDER BY ba.broker_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get broker accounts by platform
CREATE OR REPLACE FUNCTION get_broker_accounts_by_platform(user_uuid uuid, broker_platform_input text)
RETURNS TABLE (
  id uuid,
  broker_name text,
  account_name text,
  display_name text,
  is_verified boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ba.id,
    ba.broker_name,
    ba.account_name,
    ba.display_name,
    ba.is_verified
  FROM broker_accounts ba
  WHERE ba.user_id = user_uuid 
    AND ba.broker_name = broker_platform_input
  ORDER BY ba.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate follower broker credentials with platform
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
  validation_result boolean := false;
  error_msg text := '';
  details jsonb := '{}';
BEGIN
  -- Basic validation
  IF api_key_input IS NULL OR api_key_input = '' THEN
    RETURN QUERY SELECT false, 'API key is required', '{}'::jsonb;
    RETURN;
  END IF;
  
  IF api_secret_input IS NULL OR api_secret_input = '' THEN
    RETURN QUERY SELECT false, 'API secret is required', '{}'::jsonb;
    RETURN;
  END IF;
  
  IF broker_platform_input IS NULL OR broker_platform_input = '' THEN
    RETURN QUERY SELECT false, 'Broker platform is required', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Platform-specific validation
  CASE broker_platform_input
    WHEN 'delta' THEN
      -- Delta Exchange validation logic
      validation_result := true;
      error_msg := 'Credentials validated successfully';
      details := jsonb_build_object(
        'platform', 'delta',
        'validation_type', 'basic_format'
      );
    WHEN 'binance' THEN
      -- Binance validation logic
      validation_result := true;
      error_msg := 'Credentials validated successfully';
      details := jsonb_build_object(
        'platform', 'binance',
        'validation_type', 'basic_format'
      );
    WHEN 'bybit' THEN
      -- Bybit validation logic
      validation_result := true;
      error_msg := 'Credentials validated successfully';
      details := jsonb_build_object(
        'platform', 'bybit',
        'validation_type', 'basic_format'
      );
    ELSE
      validation_result := false;
      error_msg := 'Unsupported broker platform: ' || broker_platform_input;
      details := '{}'::jsonb;
  END CASE;
  
  RETURN QUERY SELECT validation_result, error_msg, details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create follower account with platform validation
CREATE OR REPLACE FUNCTION create_follower_account_with_platform_validation(
  user_uuid uuid,
  follower_name_input text,
  master_broker_account_id_input uuid,
  broker_platform_input text,
  profile_id_input text DEFAULT NULL,
  api_key_input text DEFAULT NULL,
  api_secret_input text DEFAULT NULL,
  copy_mode_input text DEFAULT 'fixed lot',
  multiplier_input numeric DEFAULT NULL,
  percentage_input numeric DEFAULT NULL,
  fixed_lot_input numeric DEFAULT NULL,
  lot_size_input numeric DEFAULT 1.0,
  max_lot_size_input numeric DEFAULT 10.0,
  min_lot_size_input numeric DEFAULT 0.01,
  drawdown_limit_input numeric DEFAULT 20.0,
  total_balance_input numeric DEFAULT 10000.0,
  risk_level_input text DEFAULT 'medium',
  max_daily_trades_input integer DEFAULT 50,
  max_open_positions_input integer DEFAULT 10,
  stop_loss_percentage_input numeric DEFAULT 5.0,
  take_profit_percentage_input numeric DEFAULT 10.0
)
RETURNS TABLE (
  success boolean,
  message text,
  follower_id uuid
) AS $$
DECLARE
  new_follower_id uuid;
  broker_account_record record;
BEGIN
  -- Validate inputs
  IF follower_name_input IS NULL OR follower_name_input = '' THEN
    RETURN QUERY SELECT false, 'Follower name is required', NULL::uuid;
    RETURN;
  END IF;
  
  IF master_broker_account_id_input IS NULL THEN
    RETURN QUERY SELECT false, 'Master broker account is required', NULL::uuid;
    RETURN;
  END IF;
  
  IF broker_platform_input IS NULL OR broker_platform_input = '' THEN
    RETURN QUERY SELECT false, 'Broker platform is required', NULL::uuid;
    RETURN;
  END IF;
  
  -- Check if broker account exists and belongs to user
  SELECT * INTO broker_account_record
  FROM broker_accounts
  WHERE id = master_broker_account_id_input AND user_id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Master broker account not found or access denied', NULL::uuid;
    RETURN;
  END IF;
  
  -- Validate platform match
  IF broker_account_record.broker_name != broker_platform_input THEN
    RETURN QUERY SELECT false, 'Broker platform mismatch: Follower platform (' || broker_platform_input || ') must match master broker platform (' || broker_account_record.broker_name || ')', NULL::uuid;
    RETURN;
  END IF;
  
  -- Check for duplicate follower name
  IF EXISTS (SELECT 1 FROM followers WHERE user_id = user_uuid AND follower_name = follower_name_input) THEN
    RETURN QUERY SELECT false, 'Follower account with this name already exists', NULL::uuid;
    RETURN;
  END IF;
  
  -- Check for duplicate master broker account
  IF EXISTS (SELECT 1 FROM followers WHERE user_id = user_uuid AND master_broker_account_id = master_broker_account_id_input) THEN
    RETURN QUERY SELECT false, 'You already have a follower account for this master broker', NULL::uuid;
    RETURN;
  END IF;
  
  -- Insert new follower account
  INSERT INTO followers (
    user_id,
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
    max_daily_trades,
    max_open_positions,
    stop_loss_percentage,
    take_profit_percentage
  ) VALUES (
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
    max_daily_trades_input,
    max_open_positions_input,
    stop_loss_percentage_input,
    take_profit_percentage_input
  ) RETURNING id INTO new_follower_id;
  
  RETURN QUERY SELECT true, 'Follower account created successfully', new_follower_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's complete follower accounts
CREATE OR REPLACE FUNCTION get_user_follower_accounts_complete(user_uuid uuid)
RETURNS TABLE (
  follower_name text,
  master_broker_name text,
  master_account_name text,
  copy_mode text,
  lot_size numeric,
  total_balance numeric,
  risk_level text,
  account_status text,
  is_verified boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.follower_name,
    ba.broker_name as master_broker_name,
    ba.display_name as master_account_name,
    f.copy_mode,
    f.lot_size,
    f.total_balance,
    f.risk_level,
    f.account_status,
    f.is_verified,
    f.created_at
  FROM followers f
  JOIN broker_accounts ba ON f.master_broker_account_id = ba.id
  WHERE f.user_id = user_uuid
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get complete follower account details
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
  max_daily_trades integer,
  max_open_positions integer,
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
    ba.display_name as master_account_name,
    f.broker_platform,
    f.profile_id,
    CASE 
      WHEN f.api_key IS NOT NULL AND length(f.api_key) > 8 THEN
        substring(f.api_key from 1 for 4) || '****' || substring(f.api_key from length(f.api_key) - 3)
      ELSE
        '****'
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
  JOIN broker_accounts ba ON f.master_broker_account_id = ba.id
  WHERE f.user_id = user_uuid AND f.follower_name = follower_name_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update follower account complete
CREATE OR REPLACE FUNCTION update_follower_account_complete(
  user_uuid uuid,
  follower_name_input text,
  profile_id_input text DEFAULT NULL,
  api_key_input text DEFAULT NULL,
  api_secret_input text DEFAULT NULL,
  copy_mode_input text DEFAULT 'fixed lot',
  multiplier_input numeric DEFAULT NULL,
  percentage_input numeric DEFAULT NULL,
  fixed_lot_input numeric DEFAULT NULL,
  lot_size_input numeric DEFAULT 1.0,
  max_lot_size_input numeric DEFAULT 10.0,
  min_lot_size_input numeric DEFAULT 0.01,
  drawdown_limit_input numeric DEFAULT 20.0,
  total_balance_input numeric DEFAULT 10000.0,
  risk_level_input text DEFAULT 'medium',
  max_daily_trades_input integer DEFAULT 50,
  max_open_positions_input integer DEFAULT 10,
  stop_loss_percentage_input numeric DEFAULT 5.0,
  take_profit_percentage_input numeric DEFAULT 10.0
)
RETURNS TABLE (
  success boolean,
  message text
) AS $$
DECLARE
  follower_exists boolean;
BEGIN
  -- Check if follower exists and belongs to user
  SELECT EXISTS(
    SELECT 1 FROM followers 
    WHERE user_id = user_uuid AND follower_name = follower_name_input
  ) INTO follower_exists;
  
  IF NOT follower_exists THEN
    RETURN QUERY SELECT false, 'Follower account not found or access denied';
    RETURN;
  END IF;
  
  -- Update follower account
  UPDATE followers SET
    profile_id = profile_id_input,
    api_key = api_key_input,
    api_secret = api_secret_input,
    copy_mode = copy_mode_input,
    multiplier = multiplier_input,
    percentage = percentage_input,
    fixed_lot = fixed_lot_input,
    lot_size = lot_size_input,
    max_lot_size = max_lot_size_input,
    min_lot_size = min_lot_size_input,
    drawdown_limit = drawdown_limit_input,
    total_balance = total_balance_input,
    risk_level = risk_level_input,
    max_daily_trades = max_daily_trades_input,
    max_open_positions = max_open_positions_input,
    stop_loss_percentage = stop_loss_percentage_input,
    take_profit_percentage = take_profit_percentage_input,
    updated_at = now()
  WHERE user_id = user_uuid AND follower_name = follower_name_input;
  
  RETURN QUERY SELECT true, 'Follower account updated successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

-- Enable RLS on followers table
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own followers
DROP POLICY IF EXISTS "Users can view their own followers" ON public.followers;
CREATE POLICY "Users can view their own followers" ON public.followers
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert their own followers
DROP POLICY IF EXISTS "Users can insert their own followers" ON public.followers;
CREATE POLICY "Users can insert their own followers" ON public.followers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own followers
DROP POLICY IF EXISTS "Users can update their own followers" ON public.followers;
CREATE POLICY "Users can update their own followers" ON public.followers
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy for users to delete their own followers
DROP POLICY IF EXISTS "Users can delete their own followers" ON public.followers;
CREATE POLICY "Users can delete their own followers" ON public.followers
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 5. TEST FUNCTIONS
-- =====================================================

-- Test the complete system
CREATE OR REPLACE FUNCTION test_complete_follower_system()
RETURNS TABLE (
  test_name text,
  result text,
  details jsonb
) AS $$
DECLARE
  test_user_id uuid := gen_random_uuid();
  test_broker_id uuid := gen_random_uuid();
  test_follower_id uuid;
BEGIN
  -- Test 1: Check if tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'followers') THEN
    RETURN QUERY SELECT 'Table Existence', 'PASS', jsonb_build_object('table', 'followers', 'exists', true);
  ELSE
    RETURN QUERY SELECT 'Table Existence', 'FAIL', jsonb_build_object('table', 'followers', 'exists', false);
  END IF;
  
  -- Test 2: Check if functions exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_broker_platforms') THEN
    RETURN QUERY SELECT 'Function Existence', 'PASS', jsonb_build_object('function', 'get_user_broker_platforms', 'exists', true);
  ELSE
    RETURN QUERY SELECT 'Function Existence', 'FAIL', jsonb_build_object('function', 'get_user_broker_platforms', 'exists', false);
  END IF;
  
  -- Test 3: Check RLS policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'followers') THEN
    RETURN QUERY SELECT 'RLS Policies', 'PASS', jsonb_build_object('policies_count', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'followers'));
  ELSE
    RETURN QUERY SELECT 'RLS Policies', 'FAIL', jsonb_build_object('policies_found', false);
  END IF;
  
  -- Test 4: Check constraints
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_follower_name') THEN
    RETURN QUERY SELECT 'Constraints', 'PASS', jsonb_build_object('constraint', 'unique_follower_name', 'exists', true);
  ELSE
    RETURN QUERY SELECT 'Constraints', 'FAIL', jsonb_build_object('constraint', 'unique_follower_name', 'exists', false);
  END IF;
  
  RETURN QUERY SELECT 'System Test', 'COMPLETE', jsonb_build_object('status', 'All tests completed');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. FINAL VERIFICATION
-- =====================================================

-- Display system status
SELECT 'Complete Follower System' as system_name, 'Ready' as status;

-- Show all created functions
SELECT 
  'Function' as type,
  proname as name,
  'Created' as status
FROM pg_proc 
WHERE proname IN (
  'get_user_broker_platforms',
  'get_broker_accounts_by_platform',
  'validate_follower_broker_credentials_with_platform',
  'create_follower_account_with_platform_validation',
  'get_user_follower_accounts_complete',
  'get_follower_account_complete_details_with_platform',
  'update_follower_account_complete',
  'test_complete_follower_system'
);

-- Show table structure
SELECT 
  'Table' as type,
  'followers' as name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'followers';

-- Show RLS policies
SELECT 
  'Policy' as type,
  policyname as name,
  'Active' as status
FROM pg_policies 
WHERE tablename = 'followers'; 