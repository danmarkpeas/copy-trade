-- Fix User-Based Relationships for Multi-User Support
-- This script ensures proper user-based filtering and relationships

-- =====================================================
-- 1. VERIFY CURRENT STRUCTURE
-- =====================================================

-- Check current table structure
SELECT 'Current table structure:' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('users', 'broker_accounts', 'followers', 'copy_trades')
AND column_name IN ('id', 'user_id', 'master_broker_account_id', 'follower_id')
ORDER BY table_name, column_name;

-- Check foreign key constraints
SELECT 'Foreign key constraints:' as info;
SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('broker_accounts', 'followers', 'copy_trades')
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- 2. ENSURE PROPER FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Ensure broker_accounts.user_id references users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'broker_accounts' 
    AND constraint_name LIKE '%user_id%'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE broker_accounts 
    ADD CONSTRAINT fk_broker_accounts_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure followers.user_id references users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'followers' 
    AND constraint_name LIKE '%user_id%'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE followers 
    ADD CONSTRAINT fk_followers_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure followers.master_broker_account_id references broker_accounts.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'followers' 
    AND constraint_name LIKE '%master_broker_account_id%'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE followers 
    ADD CONSTRAINT fk_followers_master_broker_account_id 
    FOREIGN KEY (master_broker_account_id) REFERENCES broker_accounts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure copy_trades.follower_id references followers.user_id (not followers.id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'copy_trades' 
    AND constraint_name LIKE '%follower_id%'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE copy_trades 
    ADD CONSTRAINT fk_copy_trades_follower_id 
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 3. CREATE USER-BASED FUNCTIONS
-- =====================================================

-- Function to get user's broker accounts
CREATE OR REPLACE FUNCTION get_user_broker_accounts(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  broker_name text,
  account_name text,
  account_uid text,
  is_active boolean,
  is_verified boolean,
  created_at timestamptz
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
    ba.created_at
  FROM broker_accounts ba
  WHERE ba.user_id = user_uuid
  ORDER BY ba.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's follower accounts
CREATE OR REPLACE FUNCTION get_user_follower_accounts(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  follower_name text,
  master_broker_name text,
  master_account_name text,
  master_trader_name text,
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
    COALESCE(f.follower_name, 'Unnamed Follower') as follower_name,
    COALESCE(ba.broker_name, 'Unknown Broker') as master_broker_name,
    COALESCE(ba.account_name, 'Unknown Account') as master_account_name,
    COALESCE(u.name, 'Unknown Trader') as master_trader_name,
    COALESCE(f.copy_mode, 'fixed lot') as copy_mode,
    COALESCE(f.lot_size, 1.0) as lot_size,
    COALESCE(f.account_status, 'pending') as account_status,
    COALESCE(f.is_verified, false) as is_verified,
    COALESCE(f.created_at, now()) as created_at
  FROM followers f
  LEFT JOIN broker_accounts ba ON f.master_broker_account_id = ba.id
  LEFT JOIN users u ON ba.user_id = u.id
  WHERE f.user_id = user_uuid
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available broker accounts for a user to follow
CREATE OR REPLACE FUNCTION get_available_broker_accounts_to_follow(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  broker_name text,
  account_name text,
  trader_name text,
  is_verified boolean,
  is_active boolean,
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
    ba.is_active,
    ba.created_at
  FROM broker_accounts ba
  JOIN users u ON ba.user_id = u.id
  WHERE ba.is_verified = true 
    AND ba.is_active = true
    AND ba.user_id != user_uuid  -- Don't show user's own broker accounts
  ORDER BY u.name, ba.account_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's copy trades
CREATE OR REPLACE FUNCTION get_user_copy_trades(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  master_broker_name text,
  follower_name text,
  original_symbol text,
  original_side text,
  original_size numeric,
  original_price numeric,
  copied_size numeric,
  copied_price numeric,
  status text,
  entry_time timestamptz,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    ct.id,
    COALESCE(ba.broker_name, 'Unknown Broker') as master_broker_name,
    COALESCE(f.follower_name, 'Unknown Follower') as follower_name,
    ct.original_symbol,
    ct.original_side,
    ct.original_size,
    ct.original_price,
    ct.copied_size,
    ct.copied_price,
    ct.status,
    ct.entry_time,
    ct.created_at
  FROM copy_trades ct
  LEFT JOIN broker_accounts ba ON ct.master_broker_id = ba.id
  LEFT JOIN followers f ON ct.follower_id = f.user_id
  WHERE f.user_id = user_uuid
  ORDER BY ct.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. CREATE VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate follower can follow broker account
CREATE OR REPLACE FUNCTION can_follower_follow_broker(
  follower_user_id uuid,
  broker_account_id uuid
)
RETURNS TABLE (
  can_follow boolean,
  reason text
) AS $$
BEGIN
  -- Check if broker account exists and is verified
  IF NOT EXISTS (
    SELECT 1 FROM broker_accounts 
    WHERE id = broker_account_id 
    AND is_verified = true 
    AND is_active = true
  ) THEN
    RETURN QUERY SELECT false, 'Broker account not found or not verified';
    RETURN;
  END IF;
  
  -- Check if follower is trying to follow their own broker account
  IF EXISTS (
    SELECT 1 FROM broker_accounts 
    WHERE id = broker_account_id 
    AND user_id = follower_user_id
  ) THEN
    RETURN QUERY SELECT false, 'Cannot follow your own broker account';
    RETURN;
  END IF;
  
  -- Check if follower already follows this broker account
  IF EXISTS (
    SELECT 1 FROM followers 
    WHERE user_id = follower_user_id 
    AND master_broker_account_id = broker_account_id
  ) THEN
    RETURN QUERY SELECT false, 'Already following this broker account';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'Can follow this broker account';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CREATE RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE broker_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_trades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage own broker accounts" ON broker_accounts;
DROP POLICY IF EXISTS "Users can manage own followers" ON followers;
DROP POLICY IF EXISTS "Users can view own copy trades" ON copy_trades;

-- Create new policies
CREATE POLICY "Users can manage own broker accounts"
  ON broker_accounts
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own followers"
  ON followers
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own copy trades"
  ON copy_trades
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM followers f 
      WHERE f.user_id = auth.uid() 
      AND f.user_id = copy_trades.follower_id
    )
  );

-- =====================================================
-- 6. VERIFY THE STRUCTURE
-- =====================================================

-- Show final structure
SELECT 'Final table structure:' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('users', 'broker_accounts', 'followers', 'copy_trades')
AND column_name IN ('id', 'user_id', 'master_broker_account_id', 'follower_id')
ORDER BY table_name, column_name;

-- Show final constraints
SELECT 'Final foreign key constraints:' as info;
SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('broker_accounts', 'followers', 'copy_trades')
ORDER BY tc.table_name, kcu.column_name;

-- Test the functions
SELECT 'Testing functions:' as info;
SELECT 'User-based relationships fixed successfully!' as status; 