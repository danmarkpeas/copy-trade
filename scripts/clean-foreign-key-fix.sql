-- Fix the foreign key constraint for followers.subscribed_to
-- The current constraint references 'traders' table but should reference 'users' table

-- 1. First, let's check the current constraint
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
    AND tc.table_name='followers'
    AND kcu.column_name = 'subscribed_to';

-- 2. Drop the incorrect foreign key constraint
ALTER TABLE followers DROP CONSTRAINT IF EXISTS followers_subscribed_to_fkey;

-- 3. Add the correct foreign key constraint to reference users table
ALTER TABLE followers 
ADD CONSTRAINT followers_subscribed_to_fkey 
FOREIGN KEY (subscribed_to) REFERENCES users(id) ON DELETE CASCADE;

-- 4. Verify the constraint was created correctly
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
    AND tc.table_name='followers'
    AND kcu.column_name = 'subscribed_to';

-- 5. Test the insertion to make sure it works now
INSERT INTO followers (
    id,
    subscribed_to,
    capital_allocated,
    risk_level,
    copy_mode,
    follower_name,
    lot_size,
    master_broker_account_id,
    profile_id,
    api_key,
    api_secret,
    account_status,
    is_verified,
    created_at
) VALUES (
    gen_random_uuid(),
    'fdb32e0d-0778-4f76-b153-c72b8656ab47',
    1000,
    'medium',
    'fixed lot',
    'Test Follower After Fix',
    0.01,
    'f1bff339-23e2-4763-9aad-a3a02d18cf22',
    NULL,
    'test_key',
    'test_secret',
    'active',
    true,
    NOW()
);

-- 6. Check if the insertion worked
SELECT 
    id,
    follower_name,
    subscribed_to,
    master_broker_account_id,
    account_status,
    created_at
FROM followers 
WHERE follower_name = 'Test Follower After Fix'
ORDER BY created_at DESC;

-- 7. Clean up the test record
DELETE FROM followers WHERE follower_name = 'Test Follower After Fix'; 