-- Check and fix foreign key constraints for followers table
-- This script will help identify and resolve the foreign key constraint error

-- 1. Check the current foreign key constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='followers';

-- 2. Check if there are any triggers on the followers table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'followers';

-- 3. Check the followers table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'followers' 
ORDER BY ordinal_position;

-- 4. Check if there are any RLS policies that might be interfering
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'followers';

-- 5. If there are problematic triggers, disable them temporarily
-- (Uncomment the lines below if you find problematic triggers)

-- ALTER TABLE followers DISABLE TRIGGER ALL;

-- 6. Test insertion with proper UUID
-- (This will help verify if the constraint issue is resolved)

-- INSERT INTO followers (
--     id,
--     subscribed_to,
--     capital_allocated,
--     risk_level,
--     copy_mode,
--     follower_name,
--     lot_size,
--     master_broker_account_id,
--     profile_id,
--     api_key,
--     api_secret,
--     account_status,
--     is_verified,
--     created_at
-- ) VALUES (
--     gen_random_uuid(),
--     'fdb32e0d-0778-4f76-b153-c72b8656ab47',
--     1000,
--     'medium',
--     'fixed lot',
--     'Test Follower',
--     0.01,
--     'f1bff339-23e2-4763-9aad-a3a02d18cf22',
--     NULL,
--     'test_key',
--     'test_secret',
--     'active',
--     true,
--     NOW()
-- );

-- 7. If the insertion works, re-enable triggers
-- ALTER TABLE followers ENABLE TRIGGER ALL; 