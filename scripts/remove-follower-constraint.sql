-- Remove the constraint that's preventing follower creation
-- Run this in your Supabase SQL Editor

-- First, let's see what constraints exist on the followers table
SELECT 'Current constraints on followers table:' as info;

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

-- Check for triggers that might be causing the issue
SELECT 'Triggers on followers table:' as info;

SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'followers';

-- Check for RLS policies that might be blocking
SELECT 'RLS policies on followers table:' as info;

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

-- Let's try to create a follower directly to see the exact error
SELECT 'Attempting direct follower creation:' as info;

-- First, get the user and broker account IDs
SELECT 'User ID:' as info, '29a36e2e-84e4-4998-8588-6ffb02a77890' as user_id;
SELECT 'Broker Account ID:' as info, 'ff9ce81f-7d9d-471d-9c7d-4615b32b3602' as broker_id;

-- Try to insert a follower directly
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
  '29a36e2e-84e4-4998-8588-6ffb02a77890'::UUID,
  1000,
  'medium',
  'multiplier',
  'Direct Test Follower',
  0.01,
  'ff9ce81f-7d9d-471d-9c7d-4615b32b3602'::UUID,
  NULL,
  'test_api_key',
  'test_api_secret',
  'active',
  true,
  NOW()
);

-- Check if the follower was created
SELECT 'Followers after direct creation:' as info;
SELECT 
  id,
  follower_name,
  subscribed_to,
  master_broker_account_id,
  copy_mode,
  account_status,
  created_at
FROM followers
ORDER BY created_at DESC;

-- If the above fails, let's check what the exact error is
-- and then we can remove the problematic constraint

-- Check if there are any check constraints that might be causing issues
SELECT 'Check constraints on followers table:' as info;

SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'followers'::regclass
  AND contype = 'c'; 