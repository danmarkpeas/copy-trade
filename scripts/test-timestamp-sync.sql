-- Test Timestamp Synchronization
-- Run this in your Supabase SQL Editor to verify timestamp sync is working

-- 1. Test if the improved functions exist
SELECT 'Testing timestamp synchronization functions...' as info;

-- 2. Test the improved server time function
SELECT 'Testing get_delta_server_time_actual()...' as test_name;
SELECT get_delta_server_time_actual() as server_time;

-- 3. Test the improved synchronized timestamp
SELECT 'Testing get_synchronized_timestamp_improved()...' as test_name;
SELECT get_synchronized_timestamp_improved() as synchronized_timestamp;

-- 4. Test signature generation
SELECT 'Testing generate_delta_signature_improved()...' as test_name;
SELECT * FROM generate_delta_signature_improved('GET', '/v2/products', '', 'test_secret');

-- 5. Run the comprehensive test
SELECT 'Running comprehensive timestamp sync test...' as test_name;
SELECT * FROM test_improved_timestamp_sync();

-- 6. Show current timestamp for comparison
SELECT 'Current local timestamp:' as info, EXTRACT(EPOCH FROM NOW())::bigint as local_timestamp;

-- 7. Test multiple timestamp generations to ensure they're increasing
SELECT 'Testing timestamp increment...' as test_name;
SELECT 
  get_synchronized_timestamp_improved() as timestamp1,
  get_synchronized_timestamp_improved() as timestamp2,
  get_synchronized_timestamp_improved() as timestamp3; 