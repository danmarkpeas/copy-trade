-- Simple Timestamp Test with Large Buffer
-- Run this in your Supabase SQL Editor

-- 1. Create a simple timestamp function with large buffer
CREATE OR REPLACE FUNCTION get_delta_timestamp_with_buffer()
RETURNS bigint AS $$
BEGIN
  -- Return current time + large buffer to ensure we're ahead
  RETURN EXTRACT(EPOCH FROM NOW())::bigint + 20;
END;
$$ LANGUAGE plpgsql;

-- 2. Test the function
SELECT 'Testing timestamp with large buffer...' as info;
SELECT 
  EXTRACT(EPOCH FROM NOW())::bigint as current_time,
  get_delta_timestamp_with_buffer() as timestamp_with_buffer,
  get_delta_timestamp_with_buffer() - EXTRACT(EPOCH FROM NOW())::bigint as buffer_seconds;

-- 3. Test multiple calls
SELECT 'Multiple timestamp calls:' as info;
SELECT 
  get_delta_timestamp_with_buffer() as timestamp1,
  get_delta_timestamp_with_buffer() as timestamp2,
  get_delta_timestamp_with_buffer() as timestamp3;

-- 4. Update the main function to use large buffer
CREATE OR REPLACE FUNCTION get_current_delta_timestamp()
RETURNS text AS $$
BEGIN
  -- Use large buffer to ensure we're ahead
  RETURN (EXTRACT(EPOCH FROM NOW())::bigint + 20)::text;
END;
$$ LANGUAGE plpgsql;

-- 5. Test the updated function
SELECT 'Testing updated get_current_delta_timestamp()...' as info;
SELECT get_current_delta_timestamp() as timestamp; 