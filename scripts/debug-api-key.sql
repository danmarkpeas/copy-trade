-- Debug API Key Issues for Delta Exchange
-- This script helps diagnose API key problems

-- 1. Test Delta Exchange public endpoints (no API key needed)
SELECT 'Testing Delta Exchange connectivity...' as info;

-- 2. Test server time endpoint
SELECT 'Server time endpoint test:' as test_name;
-- This would be tested via HTTP call in practice

-- 3. Common API key issues and solutions
SELECT 'Common API Key Issues:' as issue_type, 'Description' as details, 'Solution' as fix
UNION ALL
SELECT 'Invalid API Key', 'API key is incorrect or malformed', 'Check API key in Delta Exchange dashboard'
UNION ALL
SELECT 'Inactive API Key', 'API key exists but is not active', 'Activate API key in Delta Exchange dashboard'
UNION ALL
SELECT 'IP Not Whitelisted', 'Your IP address is not allowed', 'Add your IP to whitelist in Delta Exchange'
UNION ALL
SELECT 'Wrong Permissions', 'API key lacks required permissions', 'Enable "Read" permissions for wallet/balances'
UNION ALL
SELECT 'Expired API Key', 'API key has expired', 'Generate new API key in Delta Exchange'
UNION ALL
SELECT 'Wrong Environment', 'Using test key for production or vice versa', 'Use correct environment API keys';

-- 4. API key format validation
SELECT 'API Key Format Guidelines:' as guideline, 'Details' as info
UNION ALL
SELECT 'Length', 'Should be 64 characters long'
UNION ALL
SELECT 'Characters', 'Should contain only hexadecimal characters (0-9, a-f)'
UNION ALL
SELECT 'No Spaces', 'Should not contain spaces or special characters'
UNION ALL
SELECT 'Case Sensitive', 'Should be entered exactly as shown in dashboard';

-- 5. Troubleshooting steps
SELECT 'Troubleshooting Steps:' as step_number, 'Action' as action, 'Expected Result' as result
UNION ALL
SELECT '1', 'Check API key in Delta Exchange dashboard', 'Key should be active and have correct permissions'
UNION ALL
SELECT '2', 'Verify API key format (64 hex characters)', 'No spaces, correct length, valid characters'
UNION ALL
SELECT '3', 'Check IP whitelist settings', 'Your current IP should be in allowed list'
UNION ALL
SELECT '4', 'Test with Delta Exchange test environment', 'Use test API keys for development'
UNION ALL
SELECT '5', 'Check API key permissions', 'Should have "Read" access for wallet endpoints'
UNION ALL
SELECT '6', 'Verify account status', 'Delta Exchange account should be active and verified';

-- 6. Test API key format (basic validation)
-- Note: This is a placeholder - actual validation would be done in application code
SELECT 'API Key Validation:' as validation_type, 'Check' as check_item
UNION ALL
SELECT 'Length Check', 'API key should be exactly 64 characters'
UNION ALL
SELECT 'Format Check', 'Should contain only 0-9 and a-f characters'
UNION ALL
SELECT 'Whitespace Check', 'Should not contain spaces or tabs'
UNION ALL
SELECT 'Case Check', 'Should be lowercase hexadecimal'; 