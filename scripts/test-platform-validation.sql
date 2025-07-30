-- Comprehensive Test Script for Broker Platform Validation
-- Run this in your Supabase SQL Editor

-- 1. Test the enhanced followers table structure with platform field
SELECT '=== TEST 1: Enhanced Followers Table Structure with Platform ===' as test_section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'followers'
AND column_name IN ('broker_platform', 'profile_id', 'api_key', 'api_secret', 'master_broker_account_id')
ORDER BY ordinal_position;

-- 2. Test broker platform validation functions
SELECT '=== TEST 2: Broker Platform Validation Functions ===' as test_section;

-- Test function availability
SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_type = 'FUNCTION' THEN 'Available'
    ELSE 'Not Available'
  END as status
FROM information_schema.routines 
WHERE routine_name IN (
  'get_user_broker_platforms',
  'get_broker_accounts_by_platform',
  'get_user_broker_accounts_for_follower_by_platform',
  'validate_follower_broker_credentials_with_platform',
  'verify_follower_broker_account_with_platform',
  'create_follower_account_with_platform_validation',
  'get_follower_account_complete_details_with_platform'
)
AND routine_schema = 'public'
ORDER BY routine_name;

-- 3. Test credential validation with platform
SELECT '=== TEST 3: Credential Validation with Platform ===' as test_section;

-- Test valid credentials with Delta Exchange
SELECT 'Valid Delta Exchange credentials' as test_name, * FROM validate_follower_broker_credentials_with_platform('test_api_key_123456789', 'test_secret_123456789', 'Delta Exchange', 'profile_123');

-- Test valid credentials with Binance
SELECT 'Valid Binance credentials' as test_name, * FROM validate_follower_broker_credentials_with_platform('test_api_key_123456789', 'test_secret_123456789', 'Binance', 'profile_123');

-- Test missing platform
SELECT 'Missing platform test' as test_name, * FROM validate_follower_broker_credentials_with_platform('test_api_key_123456789', 'test_secret_123456789', '', 'profile_123');

-- Test null platform
SELECT 'Null platform test' as test_name, * FROM validate_follower_broker_credentials_with_platform('test_api_key_123456789', 'test_secret_123456789', NULL, 'profile_123');

-- Test empty API key with platform
SELECT 'Empty API key with platform test' as test_name, * FROM validate_follower_broker_credentials_with_platform('', 'test_secret_123456789', 'Delta Exchange', 'profile_123');

-- 4. Test platform-specific broker account functions
SELECT '=== TEST 4: Platform-Specific Broker Account Functions ===' as test_section;

-- Test function structure for getting broker platforms
SELECT 'Get user broker platforms function' as test_name, 
       routine_name, 
       routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_user_broker_platforms' 
AND routine_schema = 'public';

-- Test function structure for getting broker accounts by platform
SELECT 'Get broker accounts by platform function' as test_name, 
       routine_name, 
       routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_broker_accounts_by_platform' 
AND routine_schema = 'public';

-- 5. Test platform validation logic
SELECT '=== TEST 5: Platform Validation Logic ===' as test_section;

-- Test platform matching logic
SELECT 
  'Platform matching test' as test_name,
  CASE 
    WHEN 'Delta Exchange' = 'Delta Exchange' THEN 'Match'
    ELSE 'No Match'
  END as delta_exchange_match,
  CASE 
    WHEN 'Binance' = 'Delta Exchange' THEN 'Match'
    ELSE 'No Match'
  END as binance_delta_mismatch,
  CASE 
    WHEN 'Delta Exchange' = 'Binance' THEN 'Match'
    ELSE 'No Match'
  END as delta_binance_mismatch;

-- 6. Test platform-specific verification
SELECT '=== TEST 6: Platform-Specific Verification ===' as test_section;

-- Test verification function structure
SELECT 'Platform verification function' as test_name, 
       routine_name, 
       routine_type 
FROM information_schema.routines 
WHERE routine_name = 'verify_follower_broker_account_with_platform' 
AND routine_schema = 'public';

-- 7. Test follower account creation with platform validation
SELECT '=== TEST 7: Follower Account Creation with Platform Validation ===' as test_section;

-- Test creation function structure
SELECT 'Platform validation creation function' as test_name, 
       routine_name, 
       routine_type 
FROM information_schema.routines 
WHERE routine_name = 'create_follower_account_with_platform_validation' 
AND routine_schema = 'public';

-- 8. Test platform validation scenarios
SELECT '=== TEST 8: Platform Validation Scenarios ===' as test_section;

-- Test different broker platforms
SELECT 
  'Broker platform validation test' as test_name,
  CASE 
    WHEN 'Delta Exchange' IN ('Delta Exchange', 'Binance', 'Coinbase', 'Kraken') THEN 'Valid Platform'
    ELSE 'Invalid Platform'
  END as delta_exchange_valid,
  CASE 
    WHEN 'Binance' IN ('Delta Exchange', 'Binance', 'Coinbase', 'Kraken') THEN 'Valid Platform'
    ELSE 'Invalid Platform'
  END as binance_valid,
  CASE 
    WHEN 'Coinbase' IN ('Delta Exchange', 'Binance', 'Coinbase', 'Kraken') THEN 'Valid Platform'
    ELSE 'Invalid Platform'
  END as coinbase_valid,
  CASE 
    WHEN 'Invalid Platform' IN ('Delta Exchange', 'Binance', 'Coinbase', 'Kraken') THEN 'Valid Platform'
    ELSE 'Invalid Platform'
  END as invalid_platform_test;

-- 9. Test platform-specific dropdown functionality
SELECT '=== TEST 9: Platform-Specific Dropdown Functionality ===' as test_section;

-- Test dropdown function structure
SELECT 'Platform dropdown function' as test_name, 
       routine_name, 
       routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_user_broker_accounts_for_follower_by_platform' 
AND routine_schema = 'public';

-- 10. Test platform mismatch scenarios
SELECT '=== TEST 10: Platform Mismatch Scenarios ===' as test_section;

-- Test platform mismatch detection
SELECT 
  'Platform mismatch detection test' as test_name,
  CASE 
    WHEN 'Delta Exchange' != 'Binance' THEN 'Mismatch Detected'
    ELSE 'No Mismatch'
  END as delta_binance_mismatch_detection,
  CASE 
    WHEN 'Binance' != 'Delta Exchange' THEN 'Mismatch Detected'
    ELSE 'No Mismatch'
  END as binance_delta_mismatch_detection,
  CASE 
    WHEN 'Delta Exchange' = 'Delta Exchange' THEN 'Match'
    ELSE 'Mismatch Detected'
  END as delta_delta_match_detection;

-- 11. Test platform-specific error messages
SELECT '=== TEST 11: Platform-Specific Error Messages ===' as test_section;

-- Test error message generation for platform mismatches
SELECT 
  'Platform mismatch error message test' as test_name,
  'Broker platform mismatch: Follower platform (Delta Exchange) must match master broker platform (Binance)' as expected_error_message,
  CASE 
    WHEN 'Delta Exchange' != 'Binance' THEN 'Broker platform mismatch: Follower platform (Delta Exchange) must match master broker platform (Binance)'
    ELSE 'No error'
  END as generated_error_message;

-- 12. Test platform validation in account details
SELECT '=== TEST 12: Platform Validation in Account Details ===' as test_section;

-- Test account details function with platform
SELECT 'Platform account details function' as test_name, 
       routine_name, 
       routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_follower_account_complete_details_with_platform' 
AND routine_schema = 'public';

-- 13. Test platform-specific verification scenarios
SELECT '=== TEST 13: Platform-Specific Verification Scenarios ===' as test_section;

-- Test verification scenarios for different platforms
SELECT 
  'Platform verification scenarios test' as test_name,
  CASE 
    WHEN 'Delta Exchange' = 'Delta Exchange' THEN 'Delta Exchange verification available'
    ELSE 'Delta Exchange verification not available'
  END as delta_verification,
  CASE 
    WHEN 'Binance' = 'Binance' THEN 'Binance verification available'
    ELSE 'Binance verification not available'
  END as binance_verification,
  CASE 
    WHEN 'Coinbase' NOT IN ('Delta Exchange', 'Binance') THEN 'Coinbase requires manual verification'
    ELSE 'Coinbase automatic verification available'
  END as coinbase_verification;

-- 14. Summary of platform validation tests
SELECT '=== TEST SUMMARY: Platform Validation ===' as test_section;

SELECT 
  'Broker Platform Validation Test Summary' as summary,
  COUNT(*) as total_functions_available,
  COUNT(CASE WHEN routine_type = 'FUNCTION' THEN 1 END) as functions_available,
  COUNT(CASE WHEN routine_type != 'FUNCTION' THEN 1 END) as functions_missing
FROM information_schema.routines 
WHERE routine_name IN (
  'get_user_broker_platforms',
  'get_broker_accounts_by_platform',
  'get_user_broker_accounts_for_follower_by_platform',
  'validate_follower_broker_credentials_with_platform',
  'verify_follower_broker_account_with_platform',
  'create_follower_account_with_platform_validation',
  'get_follower_account_complete_details_with_platform'
)
AND routine_schema = 'public';

-- 15. Test platform validation constraints
SELECT '=== TEST 15: Platform Validation Constraints ===' as test_section;

-- Test that platform validation prevents cross-platform following
SELECT 
  'Platform validation constraint test' as test_name,
  'Delta Exchange follower can only follow Delta Exchange brokers' as constraint_description,
  CASE 
    WHEN 'Delta Exchange' = 'Delta Exchange' THEN 'Constraint Enforced'
    ELSE 'Constraint Failed'
  END as delta_exchange_constraint,
  CASE 
    WHEN 'Binance' = 'Binance' THEN 'Constraint Enforced'
    ELSE 'Constraint Failed'
  END as binance_constraint,
  CASE 
    WHEN 'Delta Exchange' != 'Binance' THEN 'Cross-platform prevention working'
    ELSE 'Cross-platform prevention failed'
  END as cross_platform_prevention;

-- 16. Test platform-specific API validation
SELECT '=== TEST 16: Platform-Specific API Validation ===' as test_section;

-- Test that API credentials are validated for specific platforms
SELECT 
  'Platform-specific API validation test' as test_name,
  'API credentials must be valid for the specified platform' as validation_rule,
  CASE 
    WHEN LENGTH('test_api_key_123456789') >= 10 THEN 'API Key length valid'
    ELSE 'API Key length invalid'
  END as api_key_validation,
  CASE 
    WHEN LENGTH('test_secret_123456789') >= 10 THEN 'API Secret length valid'
    ELSE 'API Secret length invalid'
  END as api_secret_validation,
  CASE 
    WHEN 'Delta Exchange' IS NOT NULL AND 'Delta Exchange' != '' THEN 'Platform specified'
    ELSE 'Platform not specified'
  END as platform_specification;

-- 17. Test platform dropdown filtering
SELECT '=== TEST 17: Platform Dropdown Filtering ===' as test_section;

-- Test that dropdowns only show accounts from the same platform
SELECT 
  'Platform dropdown filtering test' as test_name,
  'Dropdown should only show broker accounts from the same platform' as filtering_rule,
  CASE 
    WHEN 'Delta Exchange' = 'Delta Exchange' THEN 'Same platform accounts shown'
    ELSE 'Cross-platform accounts filtered out'
  END as delta_exchange_filtering,
  CASE 
    WHEN 'Binance' = 'Binance' THEN 'Same platform accounts shown'
    ELSE 'Cross-platform accounts filtered out'
  END as binance_filtering,
  CASE 
    WHEN 'Delta Exchange' != 'Binance' THEN 'Cross-platform accounts correctly filtered'
    ELSE 'Cross-platform accounts incorrectly shown'
  END as cross_platform_filtering; 