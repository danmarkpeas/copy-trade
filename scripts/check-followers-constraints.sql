-- Check constraints on followers table
-- Run this in your Supabase SQL Editor

-- Show all constraints on followers table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'followers'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Show unique constraints specifically
SELECT 
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'followers' 
    AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name;

-- Check if there are any existing followers
SELECT COUNT(*) as total_followers FROM followers;

-- Check followers by user (replace with your user ID)
-- SELECT 
--     user_id,
--     follower_name,
--     master_broker_account_id,
--     created_at
-- FROM followers
-- WHERE user_id = 'your-user-id-here'; 