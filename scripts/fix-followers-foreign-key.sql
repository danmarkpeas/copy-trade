-- Fix incorrect foreign key constraint on followers table
-- Run this in your Supabase SQL Editor

-- First, let's see what foreign key constraints exist
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
    AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.constraint_name;

-- Drop the incorrect foreign key constraint on id column
DO $$
BEGIN
    BEGIN
        ALTER TABLE followers DROP CONSTRAINT IF EXISTS followers_id_fkey;
        RAISE NOTICE 'Dropped incorrect followers_id_fkey constraint';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'No followers_id_fkey constraint to drop';
    END;
END $$;

-- Make sure id is a primary key, not a foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'followers' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE followers ADD PRIMARY KEY (id);
        RAISE NOTICE 'Added primary key constraint on id column';
    ELSE
        RAISE NOTICE 'Primary key constraint already exists on id column';
    END IF;
END $$;

-- Ensure user_id has the correct foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'followers' 
        AND constraint_name = 'followers_user_id_fkey'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE followers 
        ADD CONSTRAINT followers_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for user_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint for user_id already exists';
    END IF;
END $$;

-- Ensure master_broker_account_id has the correct foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'followers' 
        AND constraint_name = 'followers_master_broker_account_id_fkey'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE followers 
        ADD CONSTRAINT followers_master_broker_account_id_fkey 
        FOREIGN KEY (master_broker_account_id) REFERENCES broker_accounts(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for master_broker_account_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint for master_broker_account_id already exists';
    END IF;
END $$;

-- Show final constraints
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