-- Comprehensive Test Script for Enhanced Follower System
-- Run this in your Supabase SQL Editor

-- 1. Test the enhanced followers table structure
SELECT '=== TEST 1: Enhanced Followers Table Structure ===' as test_section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'followers'
ORDER BY ordinal_position;

-- 2. Test broker credential validation
SELECT '=== TEST 2: Broker Credential Validation ===' as test_section;

-- Test valid credentials
SELECT 'Valid credentials test' as test_name, * FROM validate_follower_broker_credentials('test_api_key_123456789', 'test_secret_123456789', 'profile_123');

-- Test missing API key
SELECT 'Missing API key test' as test_name, * FROM validate_follower_broker_credentials('', 'test_secret_123456789', 'profile_123');

-- Test missing API secret
SELECT 'Missing API secret test' as test_name, * FROM validate_follower_broker_credentials('test_api_key_123456789', '', 'profile_123');

-- Test short API key
SELECT 'Short API key test' as test_name, * FROM validate_follower_broker_credentials('short', 'test_secret_123456789', 'profile_123');

-- Test short API secret
SELECT 'Short API secret test' as test_name, * FROM validate_follower_broker_credentials('test_api_key_123456789', 'short', 'profile_123');

-- 3. Test copy mode validation (using existing function)
SELECT '=== TEST 3: Copy Mode Validation ===' as test_section;

-- Test valid copy modes
SELECT 'Valid fixed lot test' as test_name, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 20.0, 10000.0);
SELECT 'Valid multiplier test' as test_name, * FROM validate_copy_mode_settings('multiplier', 2.0, NULL, NULL, 20.0, 10000.0);
SELECT 'Valid percentage test' as test_name, * FROM validate_copy_mode_settings('% balance', NULL, 50.0, NULL, 20.0, 10000.0);

-- Test invalid copy modes
SELECT 'Invalid copy mode test' as test_name, * FROM validate_copy_mode_settings('invalid_mode', NULL, NULL, 1.0, 20.0, 10000.0);
SELECT 'Invalid multiplier test' as test_name, * FROM validate_copy_mode_settings('multiplier', 5.0, NULL, NULL, 20.0, 10000.0);
SELECT 'Invalid percentage test' as test_name, * FROM validate_copy_mode_settings('% balance', NULL, 150.0, NULL, 20.0, 10000.0);
SELECT 'Invalid fixed lot test' as test_name, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 0.001, 20.0, 10000.0);

-- 4. Test broker accounts dropdown function (simulation)
SELECT '=== TEST 4: Broker Accounts Dropdown Function ===' as test_section;

-- This will show the function structure (won't return data unless you have broker accounts)
SELECT 'Function exists test' as test_name, 
       routine_name, 
       routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_user_broker_accounts_for_follower' 
AND routine_schema = 'public';

-- 5. Test follower account verification function
SELECT '=== TEST 5: Follower Account Verification ===' as test_section;

-- Test verification function structure
SELECT 'Verification function exists test' as test_name, 
       routine_name, 
       routine_type 
FROM information_schema.routines 
WHERE routine_name = 'verify_follower_broker_account' 
AND routine_schema = 'public';

-- 6. Test complete follower account creation function
SELECT '=== TEST 6: Complete Follower Account Creation ===' as test_section;

-- Test function structure
SELECT 'Creation function exists test' as test_name, 
       routine_name, 
       routine_type 
FROM information_schema.routines 
WHERE routine_name = 'create_follower_account_complete' 
AND routine_schema = 'public';

-- 7. Test follower account details function
SELECT '=== TEST 7: Follower Account Details ===' as test_section;

-- Test function structure
SELECT 'Details function exists test' as test_name, 
       routine_name, 
       routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_follower_account_complete_details' 
AND routine_schema = 'public';

-- 8. Test follower account update function
SELECT '=== TEST 8: Follower Account Update ===' as test_section;

-- Test function structure
SELECT 'Update function exists test' as test_name, 
       routine_name, 
       routine_type 
FROM information_schema.routines 
WHERE routine_name = 'update_follower_account_complete' 
AND routine_schema = 'public';

-- 9. Test user follower accounts list function
SELECT '=== TEST 9: User Follower Accounts List ===' as test_section;

-- Test function structure
SELECT 'List function exists test' as test_name, 
       routine_name, 
       routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_user_follower_accounts_complete' 
AND routine_schema = 'public';

-- 10. Test all functions exist and are callable
SELECT '=== TEST 10: Function Availability Check ===' as test_section;

SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_type = 'FUNCTION' THEN 'Available'
    ELSE 'Not Available'
  END as status
FROM information_schema.routines 
WHERE routine_name IN (
  'validate_follower_broker_credentials',
  'verify_follower_broker_account',
  'create_follower_account_complete',
  'get_follower_account_complete_details',
  'update_follower_account_complete',
  'get_user_follower_accounts_complete',
  'get_user_broker_accounts_for_follower',
  'validate_copy_mode_settings'
)
AND routine_schema = 'public'
ORDER BY routine_name;

-- 11. Test sample data insertion (if you want to test with actual data)
SELECT '=== TEST 11: Sample Data Test ===' as test_section;

-- Note: Replace 'your-user-uuid' with an actual user UUID from your database
-- This test will only work if you have actual user data

-- Example of how to test with real data (commented out):
/*
-- First, get a user UUID
SELECT id, name, email FROM users LIMIT 1;

-- Then test the functions with that UUID
-- SELECT * FROM get_user_broker_accounts_for_follower('actual-user-uuid-here');
-- SELECT * FROM get_user_follower_accounts_complete('actual-user-uuid-here');
*/

-- 12. Test validation scenarios
SELECT '=== TEST 12: Validation Scenarios ===' as test_section;

-- Test lot size validation logic
SELECT 
  'Lot size validation test' as test_name,
  CASE 
    WHEN 1.0 BETWEEN 0.01 AND 10.0 THEN 'Valid'
    ELSE 'Invalid'
  END as lot_size_1_0,
  CASE 
    WHEN 0.5 BETWEEN 0.01 AND 10.0 THEN 'Valid'
    ELSE 'Invalid'
  END as lot_size_0_5,
  CASE 
    WHEN 15.0 BETWEEN 0.01 AND 10.0 THEN 'Valid'
    ELSE 'Invalid'
  END as lot_size_15_0;

-- Test risk level validation
SELECT 
  'Risk level validation test' as test_name,
  CASE 
    WHEN 'low' IN ('low', 'medium', 'high') THEN 'Valid'
    ELSE 'Invalid'
  END as risk_low,
  CASE 
    WHEN 'medium' IN ('low', 'medium', 'high') THEN 'Valid'
    ELSE 'Invalid'
  END as risk_medium,
  CASE 
    WHEN 'high' IN ('low', 'medium', 'high') THEN 'Valid'
    ELSE 'Invalid'
  END as risk_high,
  CASE 
    WHEN 'extreme' IN ('low', 'medium', 'high') THEN 'Valid'
    ELSE 'Invalid'
  END as risk_extreme;

-- 13. Test account status validation
SELECT '=== TEST 13: Account Status Validation ===' as test_section;

SELECT 
  'Account status validation test' as test_name,
  CASE 
    WHEN 'pending' IN ('pending', 'verified', 'inactive', 'suspended') THEN 'Valid'
    ELSE 'Invalid'
  END as status_pending,
  CASE 
    WHEN 'verified' IN ('pending', 'verified', 'inactive', 'suspended') THEN 'Valid'
    ELSE 'Invalid'
  END as status_verified,
  CASE 
    WHEN 'inactive' IN ('pending', 'verified', 'inactive', 'suspended') THEN 'Valid'
    ELSE 'Invalid'
  END as status_inactive,
  CASE 
    WHEN 'invalid_status' IN ('pending', 'verified', 'inactive', 'suspended') THEN 'Valid'
    ELSE 'Invalid'
  END as status_invalid;

-- 14. Summary of all tests
SELECT '=== TEST SUMMARY ===' as test_section;

SELECT 
  'Enhanced Follower System Test Summary' as summary,
  COUNT(*) as total_functions_available,
  COUNT(CASE WHEN routine_type = 'FUNCTION' THEN 1 END) as functions_available,
  COUNT(CASE WHEN routine_type != 'FUNCTION' THEN 1 END) as functions_missing
FROM information_schema.routines 
WHERE routine_name IN (
  'validate_follower_broker_credentials',
  'verify_follower_broker_account',
  'create_follower_account_complete',
  'get_follower_account_complete_details',
  'update_follower_account_complete',
  'get_user_follower_accounts_complete',
  'get_user_broker_accounts_for_follower',
  'validate_copy_mode_settings'
)
AND routine_schema = 'public';

-- 15. Test the enhanced table constraints
SELECT '=== TEST 15: Table Constraints ===' as test_section;

SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'followers' 
AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name; 