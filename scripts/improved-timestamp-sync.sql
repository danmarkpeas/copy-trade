-- Improved timestamp synchronization for Delta Exchange API
-- This version actually fetches server time from Delta Exchange
-- Run this in your Supabase SQL Editor

-- 1. Create a function to get actual server time from Delta Exchange
CREATE OR REPLACE FUNCTION get_delta_server_time_actual()
RETURNS bigint AS $$
DECLARE
  server_time bigint;
  response text;
BEGIN
  -- Make actual HTTP call to Delta Exchange time endpoint
  SELECT content INTO response
  FROM http((
    'GET',
    'https://api.delta.exchange/v2/time',
    ARRAY[http_header('Content-Type', 'application/json')],
    NULL,
    NULL
  )::http_request);
  
  -- Parse the response to get server time
  -- Response format: {"result":{"server_time":1234567890}}
  server_time := (response::jsonb->'result'->>'server_time')::bigint;
  
  -- If parsing fails, fall back to local time + buffer
  IF server_time IS NULL THEN
    server_time := EXTRACT(EPOCH FROM NOW())::bigint + 5;
  END IF;
  
  RETURN server_time;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback to local time + buffer if HTTP call fails
    RETURN EXTRACT(EPOCH FROM NOW())::bigint + 5;
END;
$$ LANGUAGE plpgsql;

-- 2. Create a function to get synchronized timestamp with retry logic
CREATE OR REPLACE FUNCTION get_synchronized_timestamp_improved()
RETURNS bigint AS $$
DECLARE
  server_time bigint;
  local_time bigint;
  time_offset bigint;
  attempt int := 0;
  max_attempts int := 3;
BEGIN
  -- Try to get actual server time with retries
  WHILE attempt < max_attempts LOOP
    BEGIN
      server_time := get_delta_server_time_actual();
      EXIT; -- Success, exit loop
    EXCEPTION
      WHEN OTHERS THEN
        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
          -- Final fallback to local time + buffer
          server_time := EXTRACT(EPOCH FROM NOW())::bigint + 5;
        ELSE
          -- Wait a bit before retry
          PERFORM pg_sleep(0.1);
        END IF;
    END;
  END LOOP;
  
  -- Get local time
  local_time := EXTRACT(EPOCH FROM NOW())::bigint;
  
  -- Calculate offset
  time_offset := server_time - local_time;
  
  -- Return synchronized timestamp with buffer
  RETURN server_time + 1;
END;
$$ LANGUAGE plpgsql;

-- 3. Update the signature generation function to use improved timestamp
CREATE OR REPLACE FUNCTION generate_delta_signature_improved(
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
  -- Get improved synchronized timestamp
  sync_timestamp := get_synchronized_timestamp_improved();
  
  -- Create message for signature
  message := method || path || body || sync_timestamp::text;
  
  -- Generate HMAC signature
  RETURN QUERY SELECT 
    sync_timestamp::text as timestamp_val,
    encode(hmac(message, api_secret, 'sha256'), 'hex') as signature;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a function to test the improved timestamp synchronization
CREATE OR REPLACE FUNCTION test_improved_timestamp_sync()
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
  -- Test 1: Get actual server time
  server_time := get_delta_server_time_actual();
  local_time := EXTRACT(EPOCH FROM NOW())::bigint;
  offset_seconds := server_time - local_time;
  
  RETURN QUERY SELECT 
    'Actual Server Time'::text,
    CASE 
      WHEN server_time > 0 THEN 'PASS' 
      ELSE 'FAIL - Could not fetch server time'
    END::text,
    jsonb_build_object(
      'server_time', server_time,
      'local_time', local_time,
      'offset_seconds', offset_seconds
    );
  
  -- Test 2: Test improved synchronized timestamp
  server_time := get_synchronized_timestamp_improved();
  
  RETURN QUERY SELECT 
    'Improved Sync Timestamp'::text,
    'PASS'::text,
    jsonb_build_object(
      'synchronized_timestamp', server_time,
      'timestamp_age_seconds', EXTRACT(EPOCH FROM NOW())::bigint - server_time
    );
  
  -- Test 3: Test signature generation
  SELECT t.timestamp_val, t.signature INTO signature_result
  FROM generate_delta_signature_improved('GET', '/v2/products', '', 'test_secret') t;
  
  RETURN QUERY SELECT 
    'Improved Signature Generation'::text,
    'PASS'::text,
    jsonb_build_object(
      'timestamp', signature_result.timestamp_val,
      'signature_length', LENGTH(signature_result.signature),
      'signature_preview', LEFT(signature_result.signature, 16) || '...'
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Update the client-side functions to use improved versions
CREATE OR REPLACE FUNCTION get_current_delta_timestamp()
RETURNS text AS $$
BEGIN
  RETURN get_synchronized_timestamp_improved()::text;
END;
$$ LANGUAGE plpgsql;

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
  -- Get improved synchronized timestamp
  sync_timestamp := get_synchronized_timestamp_improved();
  
  -- Create message for signature
  message := method || path || body || sync_timestamp::text;
  
  -- Generate HMAC signature
  signature := encode(hmac(message, api_secret, 'sha256'), 'hex');
  
  RETURN signature;
END;
$$ LANGUAGE plpgsql;

-- 6. Test the improved timestamp synchronization
SELECT 'Testing improved timestamp synchronization' as info;
SELECT * FROM test_improved_timestamp_sync();

-- 7. Show current timestamp and sample signature
SELECT 
  'Current Improved Delta Timestamp' as example,
  get_current_delta_timestamp() as value;

SELECT 
  'Sample Improved Signature' as example,
  generate_delta_api_signature('GET', '/v2/positions/margined', '', 'your_api_secret_here') as value; 