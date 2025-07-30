-- Quick Timestamp Fix for Delta Exchange API
-- Run this in your Supabase SQL Editor to fix the expired_signature error

-- 1. Ensure the http extension is available
CREATE EXTENSION IF NOT EXISTS "http";

-- 2. Create a simple function to get Delta server time
CREATE OR REPLACE FUNCTION get_delta_server_time()
RETURNS bigint AS $$
DECLARE
  server_time bigint;
  response text;
BEGIN
  -- Make HTTP call to Delta Exchange time endpoint
  SELECT content INTO response
  FROM http((
    'GET',
    'https://api.delta.exchange/v2/time',
    ARRAY[http_header('Content-Type', 'application/json')],
    NULL,
    NULL
  )::http_request);
  
  -- Parse the response
  server_time := (response::jsonb->'result'->>'server_time')::bigint;
  
  -- Fallback if parsing fails
  IF server_time IS NULL THEN
    server_time := EXTRACT(EPOCH FROM NOW())::bigint + 5;
  END IF;
  
  RETURN server_time;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback to local time + buffer
    RETURN EXTRACT(EPOCH FROM NOW())::bigint + 5;
END;
$$ LANGUAGE plpgsql;

-- 3. Create synchronized timestamp function
CREATE OR REPLACE FUNCTION get_synchronized_timestamp()
RETURNS bigint AS $$
DECLARE
  server_time bigint;
BEGIN
  server_time := get_delta_server_time();
  -- Add buffer to ensure we're ahead
  RETURN server_time + 1;
END;
$$ LANGUAGE plpgsql;

-- 4. Update client functions
CREATE OR REPLACE FUNCTION get_current_delta_timestamp()
RETURNS text AS $$
BEGIN
  RETURN get_synchronized_timestamp()::text;
END;
$$ LANGUAGE plpgsql;

-- 5. Test the functions
SELECT 'Testing timestamp synchronization...' as info;
SELECT 
  'Server Time' as test,
  get_delta_server_time() as value
UNION ALL
SELECT 
  'Synchronized Timestamp' as test,
  get_synchronized_timestamp() as value
UNION ALL
SELECT 
  'Current Delta Timestamp' as test,
  get_current_delta_timestamp()::bigint as value;

-- 6. Show the difference
SELECT 
  'Time Analysis' as info,
  get_delta_server_time() as server_time,
  EXTRACT(EPOCH FROM NOW())::bigint as local_time,
  get_delta_server_time() - EXTRACT(EPOCH FROM NOW())::bigint as offset_seconds; 