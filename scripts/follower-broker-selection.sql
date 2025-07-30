-- Follower Broker Selection Functions
-- These functions allow followers to select from all available broker accounts

-- =====================================================
-- 1. GET ALL BROKER PLATFORMS
-- =====================================================

-- Get all available broker platforms (for followers to choose from)
CREATE OR REPLACE FUNCTION get_all_broker_platforms()
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
      WHEN ba.broker_name = 'okx' THEN 'OKX'
      WHEN ba.broker_name = 'kraken' THEN 'Kraken'
      ELSE ba.broker_name
    END as platform_display_name,
    COUNT(*) as account_count
  FROM broker_accounts ba
  WHERE ba.is_verified = true  -- Only show verified accounts
    AND ba.account_status = 'active'  -- Only show active accounts
  GROUP BY ba.broker_name
  ORDER BY ba.broker_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. GET ALL BROKER ACCOUNTS FOR FOLLOWERS
-- =====================================================

-- Get all available broker accounts for followers to choose from (all platforms)
CREATE OR REPLACE FUNCTION get_all_broker_accounts_for_followers()
RETURNS TABLE (
  id uuid,
  broker_name text,
  account_name text,
  trader_name text,
  is_verified boolean,
  account_status text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ba.id,
    ba.broker_name,
    ba.account_name,
    u.name as trader_name,
    ba.is_verified,
    ba.account_status,
    ba.created_at
  FROM broker_accounts ba
  JOIN users u ON ba.user_id = u.id
  WHERE ba.is_verified = true  -- Only show verified accounts
    AND ba.account_status = 'active'  -- Only show active accounts
  ORDER BY u.name, ba.account_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all available broker accounts for a specific platform (for followers to choose from)
CREATE OR REPLACE FUNCTION get_all_broker_accounts_by_platform(broker_platform_input text)
RETURNS TABLE (
  id uuid,
  broker_name text,
  account_name text,
  trader_name text,
  is_verified boolean,
  account_status text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ba.id,
    ba.broker_name,
    ba.account_name,
    u.name as trader_name,
    ba.is_verified,
    ba.account_status,
    ba.created_at
  FROM broker_accounts ba
  JOIN users u ON ba.user_id = u.id
  WHERE ba.broker_name = broker_platform_input
    AND ba.is_verified = true  -- Only show verified accounts
    AND ba.account_status = 'active'  -- Only show active accounts
  ORDER BY u.name, ba.account_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. GET BROKER ACCOUNT DETAILS FOR FOLLOWER
-- =====================================================

-- Get detailed broker account information for follower selection
CREATE OR REPLACE FUNCTION get_broker_account_details_for_follower(broker_account_id uuid)
RETURNS TABLE (
  id uuid,
  broker_name text,
  account_name text,
  display_name text,
  trader_name text,
  trader_id uuid,
  is_verified boolean,
  account_status text,
  verification_date timestamptz,
  created_at timestamptz,
  total_trades bigint,
  success_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ba.id,
    ba.broker_name,
    ba.account_name,
    ba.display_name,
    u.name as trader_name,
    u.id as trader_id,
    ba.is_verified,
    ba.account_status,
    ba.verification_date,
    ba.created_at,
    COALESCE(trade_stats.total_trades, 0) as total_trades,
    COALESCE(trade_stats.success_rate, 0) as success_rate
  FROM broker_accounts ba
  JOIN users u ON ba.user_id = u.id
  LEFT JOIN (
    SELECT 
      trader_id,
      COUNT(*) as total_trades,
      ROUND(
        (COUNT(CASE WHEN pnl > 0 THEN 1 END)::numeric / COUNT(*)) * 100, 2
      ) as success_rate
    FROM trades
    WHERE created_at >= now() - interval '30 days'
    GROUP BY trader_id
  ) trade_stats ON u.id = trade_stats.trader_id
  WHERE ba.id = broker_account_id
    AND ba.is_verified = true
    AND ba.account_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. VALIDATE FOLLOWER BROKER SELECTION
-- =====================================================

-- Validate that a follower can follow a specific broker account
CREATE OR REPLACE FUNCTION validate_follower_broker_selection(
  follower_user_id uuid,
  broker_account_id uuid
)
RETURNS TABLE (
  is_valid boolean,
  error_message text,
  broker_details jsonb
) AS $$
DECLARE
  broker_record record;
  existing_follower boolean;
BEGIN
  -- Check if broker account exists and is active
  SELECT * INTO broker_record
  FROM broker_accounts ba
  WHERE ba.id = broker_account_id
    AND ba.is_verified = true
    AND ba.account_status = 'active';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Broker account not found or not available for following', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check if follower is trying to follow their own account
  IF broker_record.user_id = follower_user_id THEN
    RETURN QUERY SELECT false, 'You cannot follow your own broker account', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check if follower already follows this broker
  SELECT EXISTS(
    SELECT 1 FROM followers 
    WHERE user_id = follower_user_id 
      AND master_broker_account_id = broker_account_id
  ) INTO existing_follower;
  
  IF existing_follower THEN
    RETURN QUERY SELECT false, 'You are already following this broker account', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Return success with broker details
  RETURN QUERY SELECT 
    true, 
    'Broker account is available for following',
    jsonb_build_object(
      'broker_name', broker_record.broker_name,
      'display_name', broker_record.display_name,
      'trader_id', broker_record.user_id,
      'is_verified', broker_record.is_verified
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CREATE FOLLOWER ACCOUNT WITH BROKER SELECTION
-- =====================================================

-- Create follower account with selected broker (updated version)
CREATE OR REPLACE FUNCTION create_follower_account_with_broker_selection(
  user_uuid uuid,
  follower_name_input text,
  selected_broker_account_id uuid,
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
  validation_result record;
BEGIN
  -- Validate broker selection first
  SELECT * INTO validation_result
  FROM validate_follower_broker_selection(user_uuid, selected_broker_account_id);
  
  IF NOT validation_result.is_valid THEN
    RETURN QUERY SELECT false, validation_result.error_message, NULL::uuid;
    RETURN;
  END IF;
  
  -- Get broker account details
  SELECT * INTO broker_account_record
  FROM broker_accounts
  WHERE id = selected_broker_account_id;
  
  -- Validate inputs
  IF follower_name_input IS NULL OR follower_name_input = '' THEN
    RETURN QUERY SELECT false, 'Follower name is required', NULL::uuid;
    RETURN;
  END IF;
  
  -- Check for duplicate follower name
  IF EXISTS (SELECT 1 FROM followers WHERE user_id = user_uuid AND follower_name = follower_name_input) THEN
    RETURN QUERY SELECT false, 'Follower account with this name already exists', NULL::uuid;
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
    selected_broker_account_id,
    broker_account_record.broker_name,
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

-- =====================================================
-- 6. TEST FUNCTIONS
-- =====================================================

-- Test the broker selection system
CREATE OR REPLACE FUNCTION test_follower_broker_selection()
RETURNS TABLE (
  test_name text,
  result text,
  details jsonb
) AS $$
BEGIN
  -- Test 1: Check if functions exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_broker_platforms') THEN
    RETURN QUERY SELECT 'Function Existence', 'PASS', jsonb_build_object('function', 'get_all_broker_platforms', 'exists', true);
  ELSE
    RETURN QUERY SELECT 'Function Existence', 'FAIL', jsonb_build_object('function', 'get_all_broker_platforms', 'exists', false);
  END IF;
  
  -- Test 2: Check if broker accounts exist
  IF EXISTS (SELECT 1 FROM broker_accounts WHERE is_verified = true AND account_status = 'active') THEN
    RETURN QUERY SELECT 'Available Brokers', 'PASS', jsonb_build_object('count', (SELECT COUNT(*) FROM broker_accounts WHERE is_verified = true AND account_status = 'active'));
  ELSE
    RETURN QUERY SELECT 'Available Brokers', 'WARNING', jsonb_build_object('message', 'No verified broker accounts found');
  END IF;
  
  RETURN QUERY SELECT 'Broker Selection System', 'READY', jsonb_build_object('status', 'System ready for follower broker selection');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. GET USER FOLLOWER ACCOUNTS WITH TRADER INFO
-- =====================================================

-- Get user's follower accounts with trader information (updated for broker selection)
CREATE OR REPLACE FUNCTION get_user_follower_accounts_with_trader_info(user_uuid uuid)
RETURNS TABLE (
  follower_name text,
  master_broker_name text,
  master_account_name text,
  trader_name text,
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
    ba.account_name as master_account_name,
    u.name as trader_name,
    f.copy_mode,
    f.lot_size,
    f.total_balance,
    f.risk_level,
    f.account_status,
    f.is_verified,
    f.created_at
  FROM followers f
  JOIN broker_accounts ba ON f.master_broker_account_id = ba.id
  JOIN users u ON ba.user_id = u.id
  WHERE f.user_id = user_uuid
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FINAL VERIFICATION
-- =====================================================

-- Display system status
SELECT 'Follower Broker Selection System' as system_name, 'Ready' as status;

-- Show all created functions
SELECT 
  'Function' as type,
  proname as name,
  'Created' as status
FROM pg_proc 
WHERE proname IN (
  'get_all_broker_platforms',
  'get_all_broker_accounts_for_followers',
  'get_all_broker_accounts_by_platform',
  'get_broker_account_details_for_follower',
  'validate_follower_broker_selection',
  'create_follower_account_with_broker_selection',
  'get_user_follower_accounts_with_trader_info',
  'test_follower_broker_selection'
); 