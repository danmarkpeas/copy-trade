-- Test script to manually test name extraction
-- Run this in your Supabase SQL Editor

-- First, let's see what data we have
SELECT 
  'Current auth.users data:' as info,
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 3;

-- Test the name extraction logic manually
WITH test_data AS (
  SELECT 
    id,
    email,
    raw_user_meta_data,
    CASE 
      WHEN raw_user_meta_data ? 'name' and raw_user_meta_data->>'name' != '' THEN raw_user_meta_data->>'name'
      WHEN raw_user_meta_data ? 'full_name' and raw_user_meta_data->>'full_name' != '' THEN raw_user_meta_data->>'full_name'
      WHEN raw_user_meta_data ? 'given_name' THEN
        CASE 
          WHEN raw_user_meta_data ? 'family_name' and raw_user_meta_data->>'family_name' != '' 
            THEN (raw_user_meta_data->>'given_name') || ' ' || (raw_user_meta_data->>'family_name')
          WHEN raw_user_meta_data->>'given_name' != '' THEN raw_user_meta_data->>'given_name'
          ELSE NULL
        END
      WHEN raw_user_meta_data ? 'display_name' and raw_user_meta_data->>'display_name' != '' THEN raw_user_meta_data->>'display_name'
      WHEN raw_user_meta_data ? 'nickname' and raw_user_meta_data->>'nickname' != '' THEN raw_user_meta_data->>'nickname'
      ELSE split_part(email, '@', 1)
    END as extracted_name
  FROM auth.users 
  WHERE raw_user_meta_data IS NOT NULL
  ORDER BY created_at DESC 
  LIMIT 5
)
SELECT 
  'Name extraction test:' as info,
  id,
  email,
  raw_user_meta_data,
  extracted_name,
  CASE 
    WHEN extracted_name IS NULL OR extracted_name = '' THEN 'FAILED - No name extracted'
    ELSE 'SUCCESS - Name: ' || extracted_name
  END as result
FROM test_data;

-- Check if the trigger function is working by looking at logs
-- (This will show recent log entries related to the trigger)
SELECT 
  'Recent log entries:' as info,
  log_time,
  message
FROM pg_stat_activity 
WHERE message LIKE '%handle_new_user%'
ORDER BY log_time DESC 
LIMIT 5;

-- Manual test: Try to insert a test user record
-- (This will help us see if the trigger is being called)
DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
  test_email text := 'test@example.com';
  test_metadata jsonb := '{"name": "Test User", "given_name": "Test", "family_name": "User"}'::jsonb;
BEGIN
  -- Simulate what the trigger should do
  INSERT INTO public.users (id, email, name, created_at)
  VALUES (
    test_user_id, 
    test_email, 
    CASE 
      WHEN test_metadata ? 'name' and test_metadata->>'name' != '' THEN test_metadata->>'name'
      WHEN test_metadata ? 'full_name' and test_metadata->>'full_name' != '' THEN test_metadata->>'full_name'
      WHEN test_metadata ? 'given_name' THEN
        CASE 
          WHEN test_metadata ? 'family_name' and test_metadata->>'family_name' != '' 
            THEN (test_metadata->>'given_name') || ' ' || (test_metadata->>'family_name')
          WHEN test_metadata->>'given_name' != '' THEN test_metadata->>'given_name'
          ELSE NULL
        END
      ELSE split_part(test_email, '@', 1)
    END,
    now()
  );
  
  RAISE LOG 'Test insert successful for: %', test_email;
  
  -- Clean up
  DELETE FROM public.users WHERE id = test_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Test insert failed: %', SQLERRM;
END $$; 