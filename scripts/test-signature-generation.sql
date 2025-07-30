-- Test Signature Generation
-- Run this in your Supabase SQL Editor to verify signature generation

-- 1. Create a test signature generation function
CREATE OR REPLACE FUNCTION test_delta_signature(
  method text,
  path text,
  body text,
  timestamp text,
  api_secret text
)
RETURNS text AS $$
DECLARE
  signature_string text;
  signature text;
BEGIN
  -- Create signature string
  signature_string := method || path || body || timestamp;
  
  -- Generate HMAC signature
  signature := encode(hmac(signature_string, api_secret, 'sha256'), 'hex');
  
  RETURN signature;
END;
$$ LANGUAGE plpgsql;

-- 2. Test signature generation
SELECT 'Testing signature generation...' as info;

-- Test with sample data
SELECT 
  'GET' as method,
  '/v2/positions/margined' as path,
  '' as body,
  '1753545765' as timestamp,
  'test_secret_123456789012345678901234567890' as api_secret,
  test_delta_signature('GET', '/v2/positions/margined', '', '1753545765', 'test_secret_123456789012345678901234567890') as signature;

-- 3. Test with current timestamp
SELECT 
  'Current timestamp test' as test_name,
  get_current_delta_timestamp() as current_timestamp,
  test_delta_signature('GET', '/v2/positions/margined', '', get_current_delta_timestamp(), 'test_secret_123456789012345678901234567890') as signature;

-- 4. Show signature format
SELECT 
  'Signature format check' as info,
  LENGTH(test_delta_signature('GET', '/v2/positions/margined', '', '1753545765', 'test_secret_123456789012345678901234567890')) as signature_length,
  'Should be 64 characters' as expected; 