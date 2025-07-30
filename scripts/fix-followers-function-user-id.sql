-- Fix the followers function to handle different table structures
-- This version works whether the table uses 'id' or 'user_id' as the user reference

DROP FUNCTION IF EXISTS get_user_follower_accounts_with_trader_info(uuid);

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
    COALESCE(f.follower_name, 'Unnamed Follower') as follower_name,
    COALESCE(ba.broker_name, 'Unknown Broker') as master_broker_name,
    COALESCE(ba.account_name, 'Unknown Account') as master_account_name,
    COALESCE(u.name, 'Unknown Trader') as trader_name,
    COALESCE(f.copy_mode, 'fixed lot') as copy_mode,
    COALESCE(f.lot_size, 1.0) as lot_size,
    COALESCE(f.total_balance, 10000.0) as total_balance,
    COALESCE(f.risk_level, 'medium') as risk_level,
    COALESCE(f.account_status, 'pending') as account_status,
    COALESCE(f.is_verified, false) as is_verified,
    COALESCE(f.created_at, now()) as created_at
  FROM followers f
  LEFT JOIN broker_accounts ba ON f.master_broker_account_id = ba.id
  LEFT JOIN users u ON ba.user_id = u.id
  WHERE (f.user_id = user_uuid OR f.id = user_uuid)  -- Handle both table structures
  ORDER BY f.created_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT 'Followers function fixed to handle user_id column' as status; 