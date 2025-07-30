-- Complete fix for followers system
-- Step 1: Ensure followers table has all required columns
-- Step 2: Fix the functions to use correct column names

-- =====================================================
-- STEP 1: ENSURE FOLLOWERS TABLE STRUCTURE
-- =====================================================

-- First, ensure the basic followers table exists
CREATE TABLE IF NOT EXISTS public.followers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  follower_name text,
  master_broker_account_id uuid references broker_accounts(id) on delete cascade,
  broker_platform text,
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
  -- Add user_id column if it doesn't exist (for old table structure)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'user_id') THEN
    ALTER TABLE public.followers ADD COLUMN user_id uuid references users(id) on delete cascade;
  END IF;
  
  -- Add follower_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'follower_name') THEN
    ALTER TABLE public.followers ADD COLUMN follower_name text;
  END IF;
  
  -- Add master_broker_account_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'master_broker_account_id') THEN
    ALTER TABLE public.followers ADD COLUMN master_broker_account_id uuid references broker_accounts(id) on delete cascade;
  END IF;
  
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
  
  -- Add copy_mode column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'copy_mode') THEN
    ALTER TABLE public.followers ADD COLUMN copy_mode text default 'fixed lot';
  END IF;
  
  -- Add multiplier column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'multiplier') THEN
    ALTER TABLE public.followers ADD COLUMN multiplier numeric;
  END IF;
  
  -- Add percentage column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'percentage') THEN
    ALTER TABLE public.followers ADD COLUMN percentage numeric;
  END IF;
  
  -- Add fixed_lot column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'fixed_lot') THEN
    ALTER TABLE public.followers ADD COLUMN fixed_lot numeric;
  END IF;
  
  -- Add lot_size column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'lot_size') THEN
    ALTER TABLE public.followers ADD COLUMN lot_size numeric default 1.0;
  END IF;
  
  -- Add max_lot_size column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'max_lot_size') THEN
    ALTER TABLE public.followers ADD COLUMN max_lot_size numeric default 10.0;
  END IF;
  
  -- Add min_lot_size column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'min_lot_size') THEN
    ALTER TABLE public.followers ADD COLUMN min_lot_size numeric default 0.01;
  END IF;
  
  -- Add drawdown_limit column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'drawdown_limit') THEN
    ALTER TABLE public.followers ADD COLUMN drawdown_limit numeric default 20.0;
  END IF;
  
  -- Add total_balance column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'total_balance') THEN
    ALTER TABLE public.followers ADD COLUMN total_balance numeric default 10000.0;
  END IF;
  
  -- Add risk_level column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'risk_level') THEN
    ALTER TABLE public.followers ADD COLUMN risk_level text default 'medium';
  END IF;
  
  -- Add capital_allocated column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'capital_allocated') THEN
    ALTER TABLE public.followers ADD COLUMN capital_allocated numeric;
  END IF;
  
  -- Add account_status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'account_status') THEN
    ALTER TABLE public.followers ADD COLUMN account_status text default 'pending';
  END IF;
  
  -- Add is_verified column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'is_verified') THEN
    ALTER TABLE public.followers ADD COLUMN is_verified boolean default false;
  END IF;
  
  -- Add verification_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'verification_date') THEN
    ALTER TABLE public.followers ADD COLUMN verification_date timestamptz;
  END IF;
  
  -- Add max_daily_trades column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'max_daily_trades') THEN
    ALTER TABLE public.followers ADD COLUMN max_daily_trades integer default 50;
  END IF;
  
  -- Add max_open_positions column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'max_open_positions') THEN
    ALTER TABLE public.followers ADD COLUMN max_open_positions integer default 10;
  END IF;
  
  -- Add stop_loss_percentage column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'stop_loss_percentage') THEN
    ALTER TABLE public.followers ADD COLUMN stop_loss_percentage numeric default 5.0;
  END IF;
  
  -- Add take_profit_percentage column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'take_profit_percentage') THEN
    ALTER TABLE public.followers ADD COLUMN take_profit_percentage numeric default 10.0;
  END IF;
  
  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'created_at') THEN
    ALTER TABLE public.followers ADD COLUMN created_at timestamptz default now();
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followers' AND column_name = 'updated_at') THEN
    ALTER TABLE public.followers ADD COLUMN updated_at timestamptz default now();
  END IF;
END $$;

-- =====================================================
-- STEP 2: FIX FUNCTIONS
-- =====================================================

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

-- =====================================================
-- STEP 3: VERIFICATION
-- =====================================================

-- Show the current table structure
SELECT 'Followers table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'followers' 
ORDER BY ordinal_position;

-- Test the functions
SELECT 'Testing functions...' as status;

-- Test get_all_broker_accounts_for_followers
SELECT 'get_all_broker_accounts_for_followers function test:' as test_name;
SELECT COUNT(*) as broker_count FROM get_all_broker_accounts_for_followers();

SELECT 'Followers system fixed successfully!' as final_status; 