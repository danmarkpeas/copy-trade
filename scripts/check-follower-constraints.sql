-- Check follower table constraints and structure
-- Run this in your Supabase SQL Editor

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'followers' 
ORDER BY ordinal_position;

-- Check constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'followers';

-- Check current data
SELECT 
    id,
    follower_name,
    subscribed_to,
    master_broker_account_id,
    user_id,
    account_status,
    created_at
FROM followers
ORDER BY created_at DESC;

-- Check if there are any triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'followers'; 