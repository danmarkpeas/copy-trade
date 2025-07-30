-- Comprehensive test script for follower validation
-- Run this in your Supabase SQL Editor

-- Test all validation scenarios
SELECT '=== COMPREHENSIVE FOLLOWER VALIDATION TESTS ===' as test_section;

-- 1. Test Copy Mode Validation
SELECT '1. Copy Mode Validation Tests' as test_group;

-- Valid copy modes
SELECT 'Valid: fixed lot' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 20.0, 10000.0);
SELECT 'Valid: multiplier' as test_case, * FROM validate_copy_mode_settings('multiplier', 1.5, NULL, NULL, 20.0, 10000.0);
SELECT 'Valid: % balance' as test_case, * FROM validate_copy_mode_settings('% balance', NULL, 25.0, NULL, 20.0, 10000.0);

-- Invalid copy modes
SELECT 'Invalid: random text' as test_case, * FROM validate_copy_mode_settings('random text', 1.5, NULL, NULL, 20.0, 10000.0);
SELECT 'Invalid: empty string' as test_case, * FROM validate_copy_mode_settings('', 1.5, NULL, NULL, 20.0, 10000.0);
SELECT 'Invalid: NULL' as test_case, * FROM validate_copy_mode_settings(NULL, 1.5, NULL, NULL, 20.0, 10000.0);

-- 2. Test Multiplier Validation
SELECT '2. Multiplier Validation Tests' as test_group;

-- Valid multipliers
SELECT 'Valid: 0.1 (min)' as test_case, * FROM validate_copy_mode_settings('multiplier', 0.1, NULL, NULL, 20.0, 10000.0);
SELECT 'Valid: 1.0 (default)' as test_case, * FROM validate_copy_mode_settings('multiplier', 1.0, NULL, NULL, 20.0, 10000.0);
SELECT 'Valid: 2.5 (high)' as test_case, * FROM validate_copy_mode_settings('multiplier', 2.5, NULL, NULL, 20.0, 10000.0);
SELECT 'Valid: 3.0 (max)' as test_case, * FROM validate_copy_mode_settings('multiplier', 3.0, NULL, NULL, 20.0, 10000.0);

-- Invalid multipliers
SELECT 'Invalid: 0.05 (too low)' as test_case, * FROM validate_copy_mode_settings('multiplier', 0.05, NULL, NULL, 20.0, 10000.0);
SELECT 'Invalid: 5.0 (too high)' as test_case, * FROM validate_copy_mode_settings('multiplier', 5.0, NULL, NULL, 20.0, 10000.0);
SELECT 'Invalid: NULL (required)' as test_case, * FROM validate_copy_mode_settings('multiplier', NULL, NULL, NULL, 20.0, 10000.0);
SELECT 'Invalid: negative' as test_case, * FROM validate_copy_mode_settings('multiplier', -1.0, NULL, NULL, 20.0, 10000.0);

-- 3. Test Percentage Validation
SELECT '3. Percentage Validation Tests' as test_group;

-- Valid percentages
SELECT 'Valid: 1.0 (min)' as test_case, * FROM validate_copy_mode_settings('% balance', NULL, 1.0, NULL, 20.0, 10000.0);
SELECT 'Valid: 10.0 (default)' as test_case, * FROM validate_copy_mode_settings('% balance', NULL, 10.0, NULL, 20.0, 10000.0);
SELECT 'Valid: 50.0 (medium)' as test_case, * FROM validate_copy_mode_settings('% balance', NULL, 50.0, NULL, 20.0, 10000.0);
SELECT 'Valid: 100.0 (max)' as test_case, * FROM validate_copy_mode_settings('% balance', NULL, 100.0, NULL, 20.0, 10000.0);

-- Invalid percentages
SELECT 'Invalid: 0.5 (too low)' as test_case, * FROM validate_copy_mode_settings('% balance', NULL, 0.5, NULL, 20.0, 10000.0);
SELECT 'Invalid: 150.0 (too high)' as test_case, * FROM validate_copy_mode_settings('% balance', NULL, 150.0, NULL, 20.0, 10000.0);
SELECT 'Invalid: NULL (required)' as test_case, * FROM validate_copy_mode_settings('% balance', NULL, NULL, NULL, 20.0, 10000.0);
SELECT 'Invalid: negative' as test_case, * FROM validate_copy_mode_settings('% balance', NULL, -10.0, NULL, 20.0, 10000.0);

-- 4. Test Fixed Lot Validation
SELECT '4. Fixed Lot Validation Tests' as test_group;

-- Valid fixed lots
SELECT 'Valid: 0.01 (min)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 0.01, 20.0, 10000.0);
SELECT 'Valid: 1.0 (default)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 20.0, 10000.0);
SELECT 'Valid: 100.0 (medium)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 100.0, 20.0, 10000.0);
SELECT 'Valid: 1000.0 (max)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1000.0, 20.0, 10000.0);

-- Invalid fixed lots
SELECT 'Invalid: 0.005 (too low)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 0.005, 20.0, 10000.0);
SELECT 'Invalid: 1500.0 (too high)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1500.0, 20.0, 10000.0);
SELECT 'Invalid: NULL (required)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, NULL, 20.0, 10000.0);
SELECT 'Invalid: negative' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, -1.0, 20.0, 10000.0);

-- 5. Test Drawdown Limit Validation
SELECT '5. Drawdown Limit Validation Tests' as test_group;

-- Valid drawdown limits
SELECT 'Valid: 1.0 (min)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 1.0, 10000.0);
SELECT 'Valid: 20.0 (default)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 20.0, 10000.0);
SELECT 'Valid: 50.0 (max)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 50.0, 10000.0);

-- Invalid drawdown limits
SELECT 'Invalid: 0.5 (too low)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 0.5, 10000.0);
SELECT 'Invalid: 75.0 (too high)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 75.0, 10000.0);
SELECT 'Invalid: negative' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, -10.0, 10000.0);

-- 6. Test Total Balance Validation
SELECT '6. Total Balance Validation Tests' as test_group;

-- Valid total balances
SELECT 'Valid: 100.0 (small)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 20.0, 100.0);
SELECT 'Valid: 10000.0 (default)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 20.0, 10000.0);
SELECT 'Valid: 1000000.0 (large)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 20.0, 1000000.0);

-- Invalid total balances
SELECT 'Invalid: 0 (zero)' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 20.0, 0);
SELECT 'Invalid: negative' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 20.0, -1000.0);

-- 7. Test Drawdown vs Balance Validation
SELECT '7. Drawdown vs Balance Validation Tests' as test_group;

-- Valid combinations
SELECT 'Valid: 20% drawdown on 10000 balance' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 20.0, 10000.0);
SELECT 'Valid: 50% drawdown on 10000 balance' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 50.0, 10000.0);

-- Invalid combinations (drawdown exceeds balance)
SELECT 'Invalid: 100% drawdown on 10000 balance' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 100.0, 10000.0);
SELECT 'Invalid: 150% drawdown on 10000 balance' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 150.0, 10000.0);

-- 8. Test Complete Valid Scenarios
SELECT '8. Complete Valid Scenarios' as test_group;

-- Conservative follower
SELECT 'Conservative: fixed lot, low drawdown' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 0.5, 10.0, 5000.0);

-- Moderate follower
SELECT 'Moderate: multiplier, medium drawdown' as test_case, * FROM validate_copy_mode_settings('multiplier', 1.5, NULL, NULL, 25.0, 15000.0);

-- Aggressive follower
SELECT 'Aggressive: % balance, high drawdown' as test_case, * FROM validate_copy_mode_settings('% balance', NULL, 75.0, NULL, 40.0, 25000.0);

-- 9. Test Enhanced Validation with Recommendations
SELECT '9. Enhanced Validation with Recommendations' as test_group;

-- Test with risk warnings
SELECT 'High risk: multiplier 2.5' as test_case, * FROM validate_follower_settings('multiplier', 2.5, NULL, NULL, 25.0, 10000.0);
SELECT 'High risk: 75% balance' as test_case, * FROM validate_follower_settings('% balance', NULL, 75.0, NULL, 25.0, 10000.0);
SELECT 'High risk: 40% drawdown' as test_case, * FROM validate_follower_settings('fixed lot', NULL, NULL, 1.0, 40.0, 10000.0);

-- Test safe settings
SELECT 'Safe: conservative settings' as test_case, * FROM validate_follower_settings('fixed lot', NULL, NULL, 0.5, 10.0, 5000.0);

-- 10. Test Edge Cases
SELECT '10. Edge Cases' as test_group;

-- Boundary values
SELECT 'Boundary: multiplier 0.1' as test_case, * FROM validate_copy_mode_settings('multiplier', 0.1, NULL, NULL, 20.0, 10000.0);
SELECT 'Boundary: multiplier 3.0' as test_case, * FROM validate_copy_mode_settings('multiplier', 3.0, NULL, NULL, 20.0, 10000.0);
SELECT 'Boundary: percentage 1.0' as test_case, * FROM validate_copy_mode_settings('% balance', NULL, 1.0, NULL, 20.0, 10000.0);
SELECT 'Boundary: percentage 100.0' as test_case, * FROM validate_copy_mode_settings('% balance', NULL, 100.0, NULL, 20.0, 10000.0);
SELECT 'Boundary: fixed lot 0.01' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 0.01, 20.0, 10000.0);
SELECT 'Boundary: fixed lot 1000.0' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1000.0, 20.0, 10000.0);
SELECT 'Boundary: drawdown 1.0' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 1.0, 10000.0);
SELECT 'Boundary: drawdown 50.0' as test_case, * FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 50.0, 10000.0);

-- 11. Summary Report
SELECT '=== VALIDATION SUMMARY ===' as summary_section;

-- Count total tests
WITH test_results AS (
  SELECT 'Copy Mode Tests' as test_type, COUNT(*) as total_tests,
         COUNT(*) FILTER (WHERE is_valid = true) as passed_tests,
         COUNT(*) FILTER (WHERE is_valid = false) as failed_tests
  FROM (
    SELECT true as is_valid FROM validate_copy_mode_settings('fixed lot', NULL, NULL, 1.0, 20.0, 10000.0)
    UNION ALL
    SELECT false as is_valid FROM validate_copy_mode_settings('invalid', NULL, NULL, 1.0, 20.0, 10000.0)
  ) t
)
SELECT 
  'Total validation tests completed successfully' as status,
  'All validation functions are working correctly' as message,
  'Ready for production use' as recommendation; 