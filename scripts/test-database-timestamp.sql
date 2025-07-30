-- Test Database Timestamp Functions
-- Run this in your Supabase SQL Editor to verify timestamp sync is working

-- 1. Test if the functions exist
SELECT 'Testing if timestamp functions exist...' as info;

-- 2. Test get_delta_server_time function
SELECT 'Testing get_delta_server_time()...' as test_name;
SELECT get_delta_server_time() as server_time;

-- 3. Test get_synchronized_timestamp function
SELECT 'Testing get_synchronized_timestamp()...' as test_name;
SELECT get_synchronized_timestamp() as synchronized_timestamp;

-- 4. Test get_current_delta_timestamp function
SELECT 'Testing get_current_delta_timestamp()...' as test_name;
SELECT get_current_delta_timestamp() as current_timestamp;

-- 5. Test multiple calls to ensure they're increasing
SELECT 'Testing timestamp increment...' as test_name;
SELECT 
  get_synchronized_timestamp() as timestamp1,
  get_synchronized_timestamp() as timestamp2,
  get_synchronized_timestamp() as timestamp3;

-- 6. Compare with local time
SELECT 'Time comparison:' as info;
SELECT 
  EXTRACT(EPOCH FROM NOW())::bigint as local_time,
  get_delta_server_time() as server_time,
  get_synchronized_timestamp() as synchronized_time,
  get_delta_server_time() - EXTRACT(EPOCH FROM NOW())::bigint as server_offset,
  get_synchronized_timestamp() - EXTRACT(EPOCH FROM NOW())::bigint as sync_offset;

-- 7. Test RPC call (what the API will use)
SELECT 'Testing RPC call (API method)...' as test_name;
SELECT get_current_delta_timestamp() as rpc_timestamp; 