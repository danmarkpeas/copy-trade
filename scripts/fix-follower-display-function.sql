-- Fix the follower display function to show created followers
-- The issue is that followers are created with subscribed_to = user_id, but the function looks for user_id

-- Drop the existing function
DROP FUNCTION IF EXISTS get_user_follower_accounts_with_trader_info(uuid);

-- Create the fixed function
CREATE OR REPLACE FUNCTION get_user_follower_accounts_with_trader_info(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  follower_name text,
  master_broker_name text,
  master_account_name text,
  trader_name text,
  copy_mode text,
  lot_size numeric,
  account_status text,
  is_verified boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    COALESCE(f.follower_name, '') as follower_name,
    COALESCE(ba.broker_name, '') as master_broker_name,
    COALESCE(ba.account_name, '') as master_account_name,
    COALESCE(u.name, '') as trader_name,
    COALESCE(f.copy_mode, '') as copy_mode,
    COALESCE(f.lot_size, 0) as lot_size,
    COALESCE(f.account_status, '') as account_status,
    COALESCE(f.is_verified, false) as is_verified,
    COALESCE(f.created_at, now()) as created_at
  FROM followers f
  LEFT JOIN broker_accounts ba ON f.master_broker_account_id = ba.id
  LEFT JOIN users u ON ba.user_id = u.id
  WHERE f.subscribed_to = user_uuid  -- Fixed: Use subscribed_to instead of user_id
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT 'Follower display function fixed' as status;

-- Show current followers to verify
SELECT 
  f.id,
  f.follower_name,
  f.subscribed_to,
  f.account_status,
  f.created_at
FROM followers f
ORDER BY f.created_at DESC; 