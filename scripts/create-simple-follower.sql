-- Create a simple follower account directly
-- Run this in your Supabase SQL Editor

-- First, let's see what users and broker accounts we have
SELECT 'Users:' as info;
SELECT id, email, name FROM users LIMIT 5;

SELECT 'Broker Accounts:' as info;
SELECT id, user_id, broker_name, account_name, is_active FROM broker_accounts WHERE is_active = true LIMIT 5;

-- Now create a simple follower
-- Replace the UUIDs below with actual values from the queries above

-- Example (replace with actual values):
-- INSERT INTO followers (
--   id,
--   subscribed_to,
--   capital_allocated,
--   risk_level,
--   copy_mode,
--   follower_name,
--   lot_size,
--   master_broker_account_id,
--   api_key,
--   api_secret,
--   account_status,
--   is_verified,
--   created_at
-- ) VALUES (
--   gen_random_uuid(),
--   '29a36e2e-84e4-4998-8588-6ffb02a77890', -- user_id from users table
--   1000,
--   'medium',
--   'multiplier',
--   'Test Follower SQL',
--   0.01,
--   'ff9ce81f-7d9d-471d-9c7d-4615b32b3602', -- broker_account_id from broker_accounts table
--   'test_api_key',
--   'test_api_secret',
--   'active',
--   true,
--   NOW()
-- );

-- Check if the follower was created
SELECT 'Followers after creation:' as info;
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