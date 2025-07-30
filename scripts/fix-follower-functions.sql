-- Fix follower functions to use correct column names
-- The broker_accounts table has 'account_name' but not 'display_name'

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_user_follower_accounts_with_trader_info(uuid);
DROP FUNCTION IF EXISTS get_all_broker_accounts_for_followers();
DROP FUNCTION IF EXISTS get_all_broker_accounts_by_platform(text);

-- Fix get_user_follower_accounts_with_trader_info function
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

-- Fix get_all_broker_accounts_for_followers function
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

-- Fix get_all_broker_accounts_by_platform function
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

-- Test the fixed functions
SELECT 'Fixed follower functions' as status; 