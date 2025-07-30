-- Fix Foreign Key Relationships for User ID
-- This script adds proper foreign key constraints to ensure data integrity

-- Step 1: Check current table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('users', 'broker_accounts', 'followers', 'copy_trades')
AND column_name = 'user_id'
ORDER BY table_name;

-- Step 2: Add foreign key constraint to broker_accounts table
ALTER TABLE broker_accounts 
ADD CONSTRAINT fk_broker_accounts_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 3: Add foreign key constraint to followers table
ALTER TABLE followers 
ADD CONSTRAINT fk_followers_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Step 4: Add foreign key constraint to copy_trades table
ALTER TABLE copy_trades 
ADD CONSTRAINT fk_copy_trades_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 5: Verify foreign key constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('broker_accounts', 'followers', 'copy_trades')
ORDER BY tc.table_name;

-- Step 6: Check for any orphaned records (user_id that don't exist in users table)
SELECT 'broker_accounts' as table_name, user_id, COUNT(*) as count
FROM broker_accounts 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM users)
GROUP BY user_id

UNION ALL

SELECT 'followers' as table_name, user_id, COUNT(*) as count
FROM followers 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM users)
GROUP BY user_id

UNION ALL

SELECT 'copy_trades' as table_name, user_id, COUNT(*) as count
FROM copy_trades 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM users)
GROUP BY user_id;

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_broker_accounts_user_id ON broker_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_followers_user_id ON followers(user_id);
CREATE INDEX IF NOT EXISTS idx_copy_trades_user_id ON copy_trades(user_id);

-- Step 8: Summary of changes
SELECT 'Foreign key relationships have been established' as status; 