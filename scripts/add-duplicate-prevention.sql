-- Add duplicate prevention for broker accounts and follower accounts
-- Run this in your Supabase SQL Editor

-- 1. Add additional unique constraints to broker_accounts table
-- Prevent duplicate broker accounts for the same user with same broker and account_uid
ALTER TABLE broker_accounts 
ADD CONSTRAINT IF NOT EXISTS unique_user_broker_account 
UNIQUE (user_id, broker_name, account_uid);

-- Prevent duplicate API keys (encrypted) for the same user
ALTER TABLE broker_accounts 
ADD CONSTRAINT IF NOT EXISTS unique_user_api_key 
UNIQUE (user_id, api_key);

-- 2. Add unique constraint to subscriptions table to prevent duplicate follower-trader relationships
ALTER TABLE public.subscriptions 
ADD CONSTRAINT IF NOT EXISTS unique_follower_trader 
UNIQUE (follower_id, trader_id);

-- 3. Create a function to validate broker account creation
CREATE OR REPLACE FUNCTION validate_broker_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already has an account with the same broker and account_uid
  IF EXISTS (
    SELECT 1 FROM broker_accounts 
    WHERE user_id = NEW.user_id 
    AND broker_name = NEW.broker_name 
    AND account_uid = NEW.account_uid
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'You already have an account with this broker and account ID';
  END IF;
  
  -- Check if user already has an account with the same account_name
  IF EXISTS (
    SELECT 1 FROM broker_accounts 
    WHERE user_id = NEW.user_id 
    AND account_name = NEW.account_name
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'You already have an account with this name';
  END IF;
  
  -- Check if user already has an account with the same API key
  IF EXISTS (
    SELECT 1 FROM broker_accounts 
    WHERE user_id = NEW.user_id 
    AND api_key = NEW.api_key
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'You already have an account with this API key';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for broker account validation
DROP TRIGGER IF EXISTS validate_broker_account_trigger ON broker_accounts;
CREATE TRIGGER validate_broker_account_trigger
  BEFORE INSERT OR UPDATE ON broker_accounts
  FOR EACH ROW
  EXECUTE FUNCTION validate_broker_account();

-- 5. Create a function to validate subscription creation
CREATE OR REPLACE FUNCTION validate_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user is trying to follow themselves
  IF NEW.follower_id = NEW.trader_id THEN
    RAISE EXCEPTION 'You cannot follow yourself';
  END IF;
  
  -- Check if user already follows this trader
  IF EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE follower_id = NEW.follower_id 
    AND trader_id = NEW.trader_id
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'You are already following this trader';
  END IF;
  
  -- Check if the trader exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = NEW.trader_id 
    AND role = 'trader'
  ) THEN
    RAISE EXCEPTION 'Trader does not exist or is not a trader';
  END IF;
  
  -- Check if the follower exists
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = NEW.follower_id
  ) THEN
    RAISE EXCEPTION 'Follower does not exist';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for subscription validation
DROP TRIGGER IF EXISTS validate_subscription_trigger ON public.subscriptions;
CREATE TRIGGER validate_subscription_trigger
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_subscription();

-- 7. Add RLS policies for broker_accounts
ALTER TABLE broker_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own broker accounts" ON broker_accounts;
DROP POLICY IF EXISTS "Users can view own broker accounts" ON broker_accounts;

-- Create new policies
CREATE POLICY "Users can manage own broker accounts"
  ON broker_accounts
  FOR ALL
  USING (auth.uid() = user_id);

-- 8. Add RLS policies for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Traders can view their followers" ON public.subscriptions;

-- Create new policies
CREATE POLICY "Users can manage own subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (auth.uid() = follower_id);

CREATE POLICY "Traders can view their followers"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = trader_id);

-- 9. Create a function to get user's broker accounts with duplicate checking
CREATE OR REPLACE FUNCTION get_user_broker_accounts(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  broker_name text,
  account_name text,
  account_uid text,
  is_active boolean,
  account_type text,
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
    ba.account_type,
    ba.created_at
  FROM broker_accounts ba
  WHERE ba.user_id = user_uuid
  ORDER BY ba.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create a function to get user's subscriptions with duplicate checking
CREATE OR REPLACE FUNCTION get_user_subscriptions(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  trader_id uuid,
  trader_name text,
  trader_email text,
  risk_mode text,
  capital_allocated numeric,
  status text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.trader_id,
    u.name as trader_name,
    u.email as trader_email,
    s.risk_mode,
    s.capital_allocated,
    s.status,
    s.created_at
  FROM public.subscriptions s
  JOIN public.users u ON s.trader_id = u.id
  WHERE s.follower_id = user_uuid
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create a function to check if user can add broker account
CREATE OR REPLACE FUNCTION can_add_broker_account(
  user_uuid uuid,
  broker_name_input text,
  account_uid_input text,
  account_name_input text
)
RETURNS TABLE (
  can_add boolean,
  reason text
) AS $$
BEGIN
  -- Check if account with same broker and account_uid exists
  IF EXISTS (
    SELECT 1 FROM broker_accounts 
    WHERE user_id = user_uuid 
    AND broker_name = broker_name_input 
    AND account_uid = account_uid_input
  ) THEN
    RETURN QUERY SELECT false, 'Account with this broker and account ID already exists';
    RETURN;
  END IF;
  
  -- Check if account with same name exists
  IF EXISTS (
    SELECT 1 FROM broker_accounts 
    WHERE user_id = user_uuid 
    AND account_name = account_name_input
  ) THEN
    RETURN QUERY SELECT false, 'Account with this name already exists';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'Account can be added';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create a function to check if user can follow trader
CREATE OR REPLACE FUNCTION can_follow_trader(
  follower_uuid uuid,
  trader_uuid uuid
)
RETURNS TABLE (
  can_follow boolean,
  reason text
) AS $$
BEGIN
  -- Check if trying to follow self
  IF follower_uuid = trader_uuid THEN
    RETURN QUERY SELECT false, 'You cannot follow yourself';
    RETURN;
  END IF;
  
  -- Check if already following
  IF EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE follower_id = follower_uuid 
    AND trader_id = trader_uuid
  ) THEN
    RETURN QUERY SELECT false, 'You are already following this trader';
    RETURN;
  END IF;
  
  -- Check if trader exists and is a trader
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = trader_uuid 
    AND role = 'trader'
  ) THEN
    RETURN QUERY SELECT false, 'Trader does not exist or is not a trader';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'You can follow this trader';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Verify all constraints and functions were created
SELECT 'Broker Accounts Constraints' as info;
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'broker_accounts' 
AND constraint_type = 'UNIQUE';

SELECT 'Subscriptions Constraints' as info;
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'subscriptions' 
AND constraint_type = 'UNIQUE';

SELECT 'Functions Created' as info;
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'validate_broker_account',
  'validate_subscription',
  'get_user_broker_accounts',
  'get_user_subscriptions',
  'can_add_broker_account',
  'can_follow_trader'
); 