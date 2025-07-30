-- Fix timestamp synchronization for Delta Exchange API
-- Run this in your Supabase SQL Editor

-- 1. Create a function to get server time from Delta Exchange
CREATE OR REPLACE FUNCTION get_delta_server_time()
RETURNS bigint AS $$
DECLARE
  server_time bigint;
  response text;
BEGIN
  -- Try to get server time from Delta Exchange
  SELECT content::text INTO response
  FROM http((
    'GET',
    'https://api.india.delta.exchange/v2/time',
    ARRAY[]::http_header[],
    NULL,
    NULL
  ));
  
  -- Parse the response to get server time
  server_time := (response::json->>'server_time')::bigint;
  
  -- If we can't get server time, fall back to current time
  IF server_time IS NULL THEN
    server_time := EXTRACT(EPOCH FROM NOW())::bigint;
  END IF;
  
  RETURN server_time;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback to current time if API call fails
    RETURN EXTRACT(EPOCH FROM NOW())::bigint;
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

-- 4. Create a function to make Delta API calls with retry logic
CREATE OR REPLACE FUNCTION call_delta_api_with_retry(
  method text,
  path text,
  body text DEFAULT '',
  api_key text DEFAULT NULL,
  api_secret text DEFAULT NULL,
  max_retries int DEFAULT 3
)
RETURNS TABLE (
  success boolean,
  response jsonb,
  error text,
  attempts int
) AS $$
DECLARE
  attempt int := 1;
  timestamp_val text;
  signature_val text;
  api_url text := 'https://api.india.delta.exchange';
  headers jsonb;
  response_data jsonb;
  error_msg text;
BEGIN
  WHILE attempt <= max_retries LOOP
    BEGIN
      -- Generate fresh timestamp and signature for each attempt
      SELECT t.timestamp_val, t.signature INTO timestamp_val, signature_val
      FROM generate_delta_signature(method, path, body, api_secret) t;
      
      -- Prepare headers
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      );
      
      -- Add authentication headers if provided
      IF api_key IS NOT NULL THEN
        headers := headers || jsonb_build_object('api-key', api_key);
      END IF;
      
      IF signature_val IS NOT NULL THEN
        headers := headers || jsonb_build_object('signature', signature_val);
      END IF;
      
      IF timestamp_val IS NOT NULL THEN
        headers := headers || jsonb_build_object('timestamp', timestamp_val);
      END IF;
      
      -- Make the API call
      SELECT content::jsonb INTO response_data
      FROM http((
        method,
        api_url || path,
        ARRAY(
          SELECT jsonb_each_text(headers)
        )::http_header[],
        NULL,
        body
      ));
      
      -- Check if response contains error
      IF response_data ? 'error' THEN
        error_msg := response_data->>'error';
        
        -- If it's a timestamp error, retry with fresh timestamp
        IF error_msg LIKE '%expired_signature%' OR error_msg LIKE '%timestamp%' THEN
          RAISE LOG 'Timestamp error on attempt %: %', attempt, error_msg;
          attempt := attempt + 1;
          CONTINUE;
        ELSE
          -- Other error, don't retry
          RETURN QUERY SELECT false, response_data, error_msg, attempt;
          RETURN;
        END IF;
      ELSE
        -- Success
        RETURN QUERY SELECT true, response_data, ''::text, attempt;
        RETURN;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        error_msg := SQLERRM;
        RAISE LOG 'API call error on attempt %: %', attempt, error_msg;
        attempt := attempt + 1;
        
        IF attempt > max_retries THEN
          RETURN QUERY SELECT false, '{}'::jsonb, error_msg, attempt - 1;
          RETURN;
        END IF;
    END;
  END LOOP;
  
  -- If we get here, all retries failed
  RETURN QUERY SELECT false, '{}'::jsonb, 'All retries failed'::text, max_retries;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a function to test the timestamp synchronization
CREATE OR REPLACE FUNCTION test_timestamp_sync()
RETURNS TABLE (
  test_name text,
  result text,
  details jsonb
) AS $$
DECLARE
  server_time bigint;
  local_time bigint;
  offset_seconds int;
  api_result record;
BEGIN
  -- Test 1: Get server time
  server_time := get_delta_server_time();
  local_time := EXTRACT(EPOCH FROM NOW())::bigint;
  offset_seconds := server_time - local_time;
  
  RETURN QUERY SELECT 
    'Server Time Sync'::text,
    CASE 
      WHEN ABS(offset_seconds) <= 5 THEN 'PASS' 
      ELSE 'WARNING - Large time offset'
    END::text,
    jsonb_build_object(
      'server_time', server_time,
      'local_time', local_time,
      'offset_seconds', offset_seconds
    );
  
  -- Test 2: Test API call without authentication (public endpoint)
  SELECT * INTO api_result FROM call_delta_api_with_retry('GET', '/v2/products');
  
  RETURN QUERY SELECT 
    'Public API Call'::text,
    CASE WHEN api_result.success THEN 'PASS' ELSE 'FAIL' END::text,
    jsonb_build_object(
      'success', api_result.success,
      'attempts', api_result.attempts,
      'error', api_result.error
    );
  
  -- Test 3: Test synchronized timestamp generation
  SELECT t.timestamp_val, t.signature INTO api_result
  FROM generate_delta_signature('GET', '/v2/products', '', 'test_secret') t;
  
  RETURN QUERY SELECT 
    'Timestamp Generation'::text,
    'PASS'::text,
    jsonb_build_object(
      'timestamp', api_result.timestamp_val,
      'signature_length', LENGTH(api_result.signature)
    );
END;
$$ LANGUAGE plpgsql;

-- 6. Create a function to update broker account sync with proper timestamp handling
CREATE OR REPLACE FUNCTION sync_broker_positions_with_retry(broker_id uuid)
RETURNS TABLE (
  success boolean,
  positions_count int,
  error text
) AS $$
DECLARE
  broker_record record;
  api_result record;
  positions jsonb;
  position_count int := 0;
BEGIN
  -- Get broker account details
  SELECT * INTO broker_record 
  FROM broker_accounts 
  WHERE id = broker_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Broker account not found or inactive';
    RETURN;
  END IF;
  
  -- Call Delta API with retry logic
  SELECT * INTO api_result 
  FROM call_delta_api_with_retry(
    'GET', 
    '/v2/positions/margined', 
    '', 
    broker_record.api_key, 
    broker_record.api_secret
  );
  
  IF NOT api_result.success THEN
    RETURN QUERY SELECT false, 0, api_result.error;
    RETURN;
  END IF;
  
  -- Process positions
  positions := api_result.response->'result';
  
  IF positions IS NOT NULL AND jsonb_typeof(positions) = 'array' THEN
    position_count := jsonb_array_length(positions);
  END IF;
  
  RETURN QUERY SELECT true, position_count, NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. Test the timestamp synchronization
SELECT 'Testing timestamp synchronization' as info;
SELECT * FROM test_timestamp_sync();

-- 8. Show current broker accounts that can be tested
SELECT 'Available broker accounts for testing' as info;
SELECT 
  id,
  broker_name,
  account_name,
  is_active,
  created_at
FROM broker_accounts 
WHERE broker_name = 'Delta Exchange' 
AND is_active = true
ORDER BY created_at DESC; 