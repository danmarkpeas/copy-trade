-- Test script to verify duplicate prevention is working
-- Run this in your Supabase SQL Editor after applying the duplicate prevention script

-- Test 1: Check current broker accounts
SELECT 'Current Broker Accounts' as test_info;
SELECT 
  user_id,
  broker_name,
  account_name,
  account_uid,
  is_active
FROM broker_accounts 
ORDER BY created_at DESC 
LIMIT 5;

-- Test 2: Check current subscriptions
SELECT 'Current Subscriptions' as test_info;
SELECT 
  follower_id,
  trader_id,
  risk_mode,
  status
FROM public.subscriptions 
ORDER BY created_at DESC 
LIMIT 5;

-- Test 3: Test broker account validation function
SELECT 'Testing Broker Account Validation' as test_info;
-- Replace with actual user ID from your database
SELECT * FROM can_add_broker_account(
  (SELECT id FROM public.users LIMIT 1), -- Replace with actual user ID
  'Binance',
  'test_account_123',
  'My Binance Account'
);

-- Test 4: Test subscription validation function
SELECT 'Testing Subscription Validation' as test_info;
-- Replace with actual user IDs from your database
SELECT * FROM can_follow_trader(
  (SELECT id FROM public.users WHERE role = 'follower' LIMIT 1), -- Replace with actual follower ID
  (SELECT id FROM public.users WHERE role = 'trader' LIMIT 1)    -- Replace with actual trader ID
);

-- Test 5: Test getting user broker accounts
SELECT 'Testing Get User Broker Accounts' as test_info;
-- Replace with actual user ID from your database
SELECT * FROM get_user_broker_accounts(
  (SELECT id FROM public.users LIMIT 1) -- Replace with actual user ID
);

-- Test 6: Test getting user subscriptions
SELECT 'Testing Get User Subscriptions' as test_info;
-- Replace with actual user ID from your database
SELECT * FROM get_user_subscriptions(
  (SELECT id FROM public.users WHERE role = 'follower' LIMIT 1) -- Replace with actual follower ID
);

-- Test 7: Check all unique constraints
SELECT 'Unique Constraints on Broker Accounts' as test_info;
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'broker_accounts' 
AND constraint_type = 'UNIQUE';

SELECT 'Unique Constraints on Subscriptions' as test_info;
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'subscriptions' 
AND constraint_type = 'UNIQUE';

-- Test 8: Check triggers
SELECT 'Triggers Created' as test_info;
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name IN (
  'validate_broker_account_trigger',
  'validate_subscription_trigger'
);

-- Test 9: Check RLS policies
SELECT 'RLS Policies on Broker Accounts' as test_info;
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'broker_accounts';

SELECT 'RLS Policies on Subscriptions' as test_info;
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'subscriptions';

-- Test 10: Simulate duplicate prevention (this should fail)
-- Uncomment and modify the user IDs to test actual duplicate prevention
/*
-- Test duplicate broker account (should fail)
INSERT INTO broker_accounts (
  user_id, 
  broker_name, 
  account_uid, 
  api_key, 
  api_secret, 
  account_name
) VALUES (
  (SELECT id FROM public.users LIMIT 1), -- Replace with actual user ID
  'Binance',
  'test_duplicate_123',
  'test_api_key_123',
  'test_api_secret_123',
  'Test Account'
);

-- Test duplicate subscription (should fail)
INSERT INTO public.subscriptions (
  follower_id,
  trader_id,
  risk_mode,
  capital_allocated
) VALUES (
  (SELECT id FROM public.users WHERE role = 'follower' LIMIT 1), -- Replace with actual follower ID
  (SELECT id FROM public.users WHERE role = 'trader' LIMIT 1),   -- Replace with actual trader ID
  'fixed',
  1000
);
*/ 