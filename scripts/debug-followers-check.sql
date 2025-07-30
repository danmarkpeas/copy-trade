-- Debug script to check followers table
-- Run this in your Supabase SQL Editor

-- Check all followers
SELECT 
  id,
  user_id,
  follower_name,
  master_broker_account_id,
  created_at
FROM followers
ORDER BY created_at DESC;

-- Check followers for a specific user (replace with your user ID)
-- SELECT 
--   id,
--   user_id,
--   follower_name,
--   master_broker_account_id,
--   created_at
-- FROM followers
-- WHERE user_id = 'your-user-id-here'
-- ORDER BY created_at DESC;

-- Check if there are any orphaned records
SELECT 
  f.id,
  f.user_id,
  f.follower_name,
  f.master_broker_account_id,
  u.name as user_name,
  ba.account_name as broker_account_name
FROM followers f
LEFT JOIN users u ON f.user_id = u.id
LEFT JOIN broker_accounts ba ON f.master_broker_account_id = ba.id
ORDER BY f.created_at DESC; 