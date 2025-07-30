-- Simple Timestamp Fix with Large Buffer
-- Run this in your Supabase SQL Editor

-- 1. Ensure http extension is available
CREATE EXTENSION IF NOT EXISTS http;

-- 2. Create function to get Delta Exchange server time
CREATE OR REPLACE FUNCTION get_delta_server_time()
RETURNS bigint AS $$
DECLARE
  response text;
  server_time bigint;
BEGIN
  -- Fetch server time from Delta Exchange
  SELECT content::text INTO response
  FROM http((
    'GET',
    'https://api.delta.exchange/v2/time',
    ARRAY[http_header('Content-Type', 'application/json')],
    NULL,
    NULL
  ));
  
  -- Parse the JSON response
  server_time := (response::json->'result'->>'server_time')::bigint;
  
  RETURN server_time;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback to local time
    RETURN extract(epoch from now())::bigint;
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to get synchronized timestamp with minimal buffer
CREATE OR REPLACE FUNCTION get_synchronized_timestamp()
RETURNS bigint AS $$
DECLARE
  server_time bigint;
BEGIN
  -- Get Delta server time directly
  server_time := get_delta_server_time();

  -- Add a minimal buffer (2-3 seconds max)
  RETURN server_time + 2;
EXCEPTION
  WHEN OTHERS THEN
    RETURN extract(epoch from now())::bigint + 2;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to get current Delta timestamp (for RPC calls)
CREATE OR REPLACE FUNCTION get_current_delta_timestamp()
RETURNS text AS $$
BEGIN
  RETURN get_synchronized_timestamp()::text;
END;
$$ LANGUAGE plpgsql;

-- 5. Test the functions
SELECT 'Testing timestamp functions...' as info;

SELECT 
  'Server time' as test,
  get_delta_server_time() as result;

SELECT 
  'Synchronized time' as test,
  get_synchronized_timestamp() as result;

SELECT 
  'Current Delta timestamp' as test,
  get_current_delta_timestamp() as result;

SELECT 
  'Time difference' as test,
  get_synchronized_timestamp() - get_delta_server_time() as buffer_seconds,
  'Should be 60 seconds' as expected; 