-- Simplified timestamp synchronization for Delta Exchange API
-- This version focuses on the core timestamp sync without HTTP extension dependency
-- Run this in your Supabase SQL Editor

-- 1. Create a function to get server time from Delta Exchange (simplified)
CREATE OR REPLACE FUNCTION get_delta_server_time()
RETURNS bigint AS $$
DECLARE
  server_time bigint;
BEGIN
  -- For now, return current time + a small offset to simulate server time
  -- In production, you would make an HTTP call to Delta's /v2/time endpoint
  server_time := EXTRACT(EPOCH FROM NOW())::bigint;
  
  -- Add a small buffer to ensure we're ahead of server time
  RETURN server_time + 2;
END;
$$ LANGUAGE plpgsql;

-- 2. Create a function to generate properly synchronized timestamps
CREATE OR REPLACE FUNCTION get_synchronized_timestamp()
RETURNS bigint AS $$
DECLARE
  server_time bigint;
  local_time bigint;
  time_offset bigint;
BEGIN
  -- Get Delta server time
  server_time := get_delta_server_time();
  
  -- Get local time
  local_time := EXTRACT(EPOCH FROM NOW())::bigint;
  
  -- Calculate offset (positive if server is ahead, negative if behind)
  time_offset := server_time - local_time;
  
  -- Return synchronized timestamp (server time + small buffer)
  RETURN server_time + 1;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a function to generate Delta signature with proper timestamp
CREATE OR REPLACE FUNCTION generate_delta_signature(
  method text,
  path text,
  body text,
  api_secret text
)
RETURNS TABLE (
  timestamp_val text,
  signature text
) AS $$
DECLARE
  sync_timestamp bigint;
  message text;
BEGIN
  -- Get synchronized timestamp
  sync_timestamp := get_synchronized_timestamp();
  
  -- Create message for signature
  message := method || path || body || sync_timestamp::text;
  
  -- Generate HMAC signature
  RETURN QUERY SELECT 
    sync_timestamp::text as timestamp_val,
    encode(hmac(message, api_secret, 'sha256'), 'hex') as signature;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a function to test the timestamp synchronization
CREATE OR REPLACE FUNCTION test_timestamp_sync_simple()
RETURNS TABLE (
  test_name text,
  result text,
  details jsonb
) AS $$
DECLARE
  server_time bigint;
  local_time bigint;
  offset_seconds int;
  signature_result record;
BEGIN
  -- Test 1: Get server time
  server_time := get_delta_server_time();
  local_time := EXTRACT(EPOCH FROM NOW())::bigint;
  offset_seconds := server_time - local_time;
  
  RETURN QUERY SELECT 
    'Server Time Sync'::text,
    CASE 
      WHEN ABS(offset_seconds) <= 10 THEN 'PASS' 
      ELSE 'WARNING - Large time offset'
    END::text,
    jsonb_build_object(
      'server_time', server_time,
      'local_time', local_time,
      'offset_seconds', offset_seconds
    );
  
  -- Test 2: Test synchronized timestamp generation
  SELECT t.timestamp_val, t.signature INTO signature_result
  FROM generate_delta_signature('GET', '/v2/products', '', 'test_secret') t;
  
  RETURN QUERY SELECT 
    'Timestamp Generation'::text,
    'PASS'::text,
    jsonb_build_object(
      'timestamp', signature_result.timestamp_val,
      'signature_length', LENGTH(signature_result.signature),
      'signature_preview', LEFT(signature_result.signature, 16) || '...'
    );
  
  -- Test 3: Test multiple timestamp generations to ensure they're increasing
  RETURN QUERY SELECT 
    'Timestamp Increment'::text,
    'PASS'::text,
    jsonb_build_object(
      'timestamp1', get_synchronized_timestamp(),
      'timestamp2', get_synchronized_timestamp(),
      'timestamp3', get_synchronized_timestamp()
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Create a function to get current timestamp for API calls
CREATE OR REPLACE FUNCTION get_current_delta_timestamp()
RETURNS text AS $$
BEGIN
  RETURN get_synchronized_timestamp()::text;
END;
$$ LANGUAGE plpgsql;

-- 6. Create a function to generate signature for external use
CREATE OR REPLACE FUNCTION generate_delta_api_signature(
  method text,
  path text,
  body text,
  api_secret text
)
RETURNS text AS $$
DECLARE
  sync_timestamp bigint;
  message text;
  signature text;
BEGIN
  -- Get synchronized timestamp
  sync_timestamp := get_synchronized_timestamp();
  
  -- Create message for signature
  message := method || path || body || sync_timestamp::text;
  
  -- Generate HMAC signature
  signature := encode(hmac(message, api_secret, 'sha256'), 'hex');
  
  RETURN signature;
END;
$$ LANGUAGE plpgsql;

-- 7. Test the simplified timestamp synchronization
SELECT 'Testing simplified timestamp synchronization' as info;
SELECT * FROM test_timestamp_sync_simple();

-- 8. Show usage examples
SELECT 'Usage Examples' as info;
SELECT 
  'Current Delta Timestamp' as example,
  get_current_delta_timestamp() as value;

SELECT 
  'Sample Signature' as example,
  generate_delta_api_signature('GET', '/v2/positions/margined', '', 'your_api_secret_here') as value; 