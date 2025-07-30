-- Add duplicate prevention for broker accounts and follower accounts
-- Run this in your Supabase SQL Editor

-- 1. Add additional unique constraints to broker_accounts table
-- Prevent duplicate broker accounts for the same user with same broker and account_uid
-- First, drop the constraint if it exists to avoid errors
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_user_broker_account' 
    AND table_name = 'broker_accounts'
  ) THEN
    ALTER TABLE broker_accounts DROP CONSTRAINT unique_user_broker_account;
  END IF;
END $$;

ALTER TABLE broker_accounts 
ADD CONSTRAINT unique_user_broker_account 
UNIQUE (user_id, broker_name, account_uid);

-- 2. Add unique constraint to subscriptions table to prevent duplicate follower-trader relationships
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_follower_trader' 
    AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT unique_follower_trader;
  END IF;
END $$;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT unique_follower_trader 
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

-- 9. Verify all constraints and functions were created
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