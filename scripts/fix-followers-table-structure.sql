-- Fix followers table structure
-- Run this in your Supabase SQL Editor

-- First, let's see the current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    is_identity
FROM information_schema.columns 
WHERE table_name = 'followers' 
ORDER BY ordinal_position;

-- Check if id column exists and has proper defaults
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    is_identity
FROM information_schema.columns 
WHERE table_name = 'followers' 
    AND column_name = 'id';

-- Fix the id column to have proper defaults
-- Add UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update id column to have proper default
ALTER TABLE followers 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Make sure id is not nullable
ALTER TABLE followers 
ALTER COLUMN id SET NOT NULL;

-- Add primary key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'followers' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE followers ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Check if user_id column exists and has proper foreign key
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'followers' 
    AND column_name = 'user_id';

-- Add foreign key constraint for user_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'followers' 
        AND constraint_name LIKE '%user_id%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE followers 
        ADD CONSTRAINT followers_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for master_broker_account_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'followers' 
        AND constraint_name LIKE '%master_broker_account_id%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE followers 
        ADD CONSTRAINT followers_master_broker_account_id_fkey 
        FOREIGN KEY (master_broker_account_id) REFERENCES broker_accounts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Show final table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    is_identity
FROM information_schema.columns 
WHERE table_name = 'followers' 
ORDER BY ordinal_position;

-- Show constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'followers'
ORDER BY tc.constraint_type, tc.constraint_name; 