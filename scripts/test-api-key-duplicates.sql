-- Test API key duplicate prevention
-- Run this in your Supabase SQL Editor after applying the fix

-- 1. Test the updated can_add_broker_account function with API key validation
SELECT 'Testing API key validation function' as test_info;

-- Get a sample user ID for testing
DO $$
DECLARE
  test_user_id uuid;
  test_result record;
BEGIN
  -- Get a user ID for testing
  SELECT id INTO test_user_id FROM public.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test 1: Check if we can add a new account with unique API keys
    SELECT * INTO test_result FROM can_add_broker_account(
      test_user_id,
      'Binance',
      'test_account_123',
      'Test Account',
      'unique_api_key_123',
      'unique_secret_123'
    );
    
    RAISE LOG 'Test 1 - Unique API keys: can_add=%, reason=%', test_result.can_add, test_result.reason;
    
    -- Test 2: Check if we can add account with duplicate API key + secret
    SELECT * INTO test_result FROM can_add_broker_account(
      test_user_id,
      'Binance',
      'test_account_456',
      'Test Account 2',
      'unique_api_key_123', -- Same API key
      'unique_secret_123'   -- Same secret
    );
    
    RAISE LOG 'Test 2 - Duplicate API key + secret: can_add=%, reason=%', test_result.can_add, test_result.reason;
    
    -- Test 3: Check if we can add account with same API key but different secret
    SELECT * INTO test_result FROM can_add_broker_account(
      test_user_id,
      'Binance',
      'test_account_789',
      'Test Account 3',
      'unique_api_key_123', -- Same API key
      'different_secret_456' -- Different secret
    );
    
    RAISE LOG 'Test 3 - Same API key, different secret: can_add=%, reason=%', test_result.can_add, test_result.reason;
  END IF;
END $$;

-- 2. Test the check_api_key_usage function
SELECT 'Testing API key usage check' as test_info;
-- Replace 'your_test_api_key' with an actual API key from your database
SELECT * FROM check_api_key_usage('your_test_api_key');

-- 3. Find any existing duplicate API keys
SELECT 'Finding existing duplicate API keys' as test_info;
SELECT * FROM find_duplicate_api_keys();

-- 4. Show current broker accounts with masked API keys
SELECT 'Current broker accounts (API keys masked for security)' as test_info;
SELECT 
  ba.user_id,
  u.email as user_email,
  ba.broker_name,
  ba.account_name,
  ba.account_uid,
  CASE 
    WHEN ba.api_key IS NOT NULL THEN '***' || RIGHT(ba.api_key, 4)
    ELSE 'NULL'
  END as api_key_masked,
  CASE 
    WHEN ba.api_secret IS NOT NULL THEN '***' || RIGHT(ba.api_secret, 4)
    ELSE 'NULL'
  END as api_secret_masked,
  ba.is_active,
  ba.created_at
FROM broker_accounts ba
JOIN public.users u ON ba.user_id = u.id
ORDER BY ba.created_at DESC 
LIMIT 10;

-- 5. Test the constraint by attempting to insert a duplicate (this should fail)
SELECT 'Testing constraint enforcement' as test_info;

-- This will show the current constraints
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'broker_accounts' 
AND constraint_type = 'UNIQUE';

-- 6. Manual test: Try to insert a duplicate (uncomment to test)
/*
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Get a user ID
  SELECT id INTO test_user_id FROM public.users LIMIT 1;
  
  -- Try to insert a broker account
  INSERT INTO broker_accounts (
    user_id, 
    broker_name, 
    account_uid, 
    api_key, 
    api_secret, 
    account_name
  ) VALUES (
    test_user_id,
    'Test Broker',
    'test_uid_123',
    'test_api_key_123',
    'test_secret_123',
    'Test Account'
  );
  
  RAISE LOG 'Successfully inserted test account';
  
  -- Try to insert another account with the same API key + secret (should fail)
  BEGIN
    INSERT INTO broker_accounts (
      user_id, 
      broker_name, 
      account_uid, 
      api_key, 
      api_secret, 
      account_name
    ) VALUES (
      test_user_id,
      'Test Broker 2',
      'test_uid_456',
      'test_api_key_123', -- Same API key
      'test_secret_123',  -- Same secret
      'Test Account 2'
    );
    
    RAISE LOG 'ERROR: Duplicate was allowed!';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'SUCCESS: Duplicate was properly rejected with error: %', SQLERRM;
  END;
  
  -- Clean up test data
  DELETE FROM broker_accounts WHERE account_name LIKE 'Test Account%';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Test failed: %', SQLERRM;
END $$;
*/

-- 7. Show the updated validation function
SELECT 'Updated validation function details' as test_info;
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_name = 'validate_broker_account' 
AND routine_schema = 'public';

-- 8. Show the trigger
SELECT 'Trigger details' as test_info;
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'validate_broker_account_trigger'; 