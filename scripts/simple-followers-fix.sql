-- Simple fix for followers system
-- Add missing columns and fix functions

-- Add created_at column to followers table if it doesn't exist
ALTER TABLE public.followers ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Add is_verified and account_status to broker_accounts if they don't exist
ALTER TABLE broker_accounts ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE broker_accounts ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active';

-- Drop existing functions
DROP FUNCTION IF EXISTS get_user_follower_accounts_with_trader_info(uuid);
DROP FUNCTION IF EXISTS get_all_broker_accounts_for_followers();
DROP FUNCTION IF EXISTS get_all_broker_accounts_by_platform(text);

-- Create simplified functions that work with existing table structure
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
    ba.broker_name as master_broker_name,
    ba.account_name as master_account_name,
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
  WHERE f.user_id = user_uuid
  ORDER BY f.created_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simplified broker accounts function
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
    COALESCE(u.name, 'Unknown Trader') as trader_name,
    COALESCE(ba.is_verified, false) as is_verified,
    COALESCE(ba.account_status, 'active') as account_status,
    COALESCE(ba.created_at, now()) as created_at
  FROM broker_accounts ba
  LEFT JOIN users u ON ba.user_id = u.id
  WHERE COALESCE(ba.is_verified, false) = true  -- Only show verified accounts
    AND COALESCE(ba.account_status, 'active') = 'active'  -- Only show active accounts
  ORDER BY u.name, ba.account_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simplified platform function
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
    COALESCE(u.name, 'Unknown Trader') as trader_name,
    COALESCE(ba.is_verified, false) as is_verified,
    COALESCE(ba.account_status, 'active') as account_status,
    COALESCE(ba.created_at, now()) as created_at
  FROM broker_accounts ba
  LEFT JOIN users u ON ba.user_id = u.id
  WHERE ba.broker_name = broker_platform_input
    AND COALESCE(ba.is_verified, false) = true  -- Only show verified accounts
    AND COALESCE(ba.account_status, 'active') = 'active'  -- Only show active accounts
  ORDER BY u.name, ba.account_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the functions
SELECT 'Followers system fixed!' as status;
SELECT COUNT(*) as follower_count FROM followers;
SELECT COUNT(*) as broker_count FROM broker_accounts; 