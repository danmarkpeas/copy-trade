-- Fix followers table constraints to allow multiple followers per broker
-- Run this in your Supabase SQL Editor

-- First, let's see what constraints exist
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'followers' 
    AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name;

-- Check if there's a constraint preventing multiple followers per broker
-- This would be a unique constraint on (user_id, master_broker_account_id)
-- If it exists, we need to remove it to allow multiple followers per broker

-- Remove any unique constraint that prevents multiple followers per broker
-- (This will only work if the constraint exists)
DO $$
BEGIN
    -- Try to drop constraint if it exists
    BEGIN
        ALTER TABLE followers DROP CONSTRAINT IF EXISTS unique_follower_broker_account;
        RAISE NOTICE 'Dropped unique_follower_broker_account constraint if it existed';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'No unique_follower_broker_account constraint to drop';
    END;
    
    -- Try to drop other potential constraint names
    BEGIN
        ALTER TABLE followers DROP CONSTRAINT IF EXISTS followers_user_id_master_broker_account_id_key;
        RAISE NOTICE 'Dropped followers_user_id_master_broker_account_id_key constraint if it existed';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'No followers_user_id_master_broker_account_id_key constraint to drop';
    END;
    
    -- Try to drop any constraint with user_id and master_broker_account_id
    BEGIN
        ALTER TABLE followers DROP CONSTRAINT IF EXISTS followers_user_id_master_broker_account_id_unique;
        RAISE NOTICE 'Dropped followers_user_id_master_broker_account_id_unique constraint if it existed';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'No followers_user_id_master_broker_account_id_unique constraint to drop';
    END;
END $$;

-- Now let's ensure we have the correct constraints:
-- 1. Unique constraint on (user_id, follower_name) - one follower name per user
-- 2. No constraint on (user_id, master_broker_account_id) - allow multiple followers per broker

-- Add unique constraint on follower name per user (if it doesn't exist)
DO $$
BEGIN
    BEGIN
        ALTER TABLE followers ADD CONSTRAINT unique_follower_name_per_user 
        UNIQUE (user_id, follower_name);
        RAISE NOTICE 'Added unique constraint on (user_id, follower_name)';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Unique constraint on (user_id, follower_name) already exists';
    END;
END $$;

-- Show final constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'followers' 
    AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name; 