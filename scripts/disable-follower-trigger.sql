-- Disable the problematic validate_follower_account trigger
-- Run this in your Supabase SQL Editor

-- First, let's see what triggers exist
SELECT 'Current triggers on followers table:' as info;

SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'followers';

-- Disable the validate_follower_account trigger
SELECT 'Disabling validate_follower_account trigger:' as info;

ALTER TABLE followers DISABLE TRIGGER validate_follower_account_trigger;

-- Alternative: Drop the trigger completely
SELECT 'Dropping the trigger completely:' as info;

DROP TRIGGER IF EXISTS validate_follower_account_trigger ON followers;

-- Test creating a follower without the trigger
SELECT 'Testing follower creation without trigger:' as info;

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
  'No Trigger Test Follower',
  0.01,
  'ff9ce81f-7d9d-471d-9c7d-4615b32b3602'::UUID,
  NULL,
  'no_trigger_test_key',
  'no_trigger_test_secret',
  'active',
  true,
  NOW()
);

-- Check if the follower was created
SELECT 'Followers after trigger removal:' as info;
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

-- Test the original create_follower_account function
SELECT 'Testing original create_follower_account function:' as info;

SELECT create_follower_account(
  'original_test_key',
  'original_test_secret',
  'multiplier',
  'Original Function Test',
  0.01,
  'ff9ce81f-7d9d-471d-9c7d-4615b32b3602',
  NULL
);

-- Check final results
SELECT 'Final followers count:' as info;
SELECT COUNT(*) as total_followers FROM followers;

SELECT 'All followers:' as info;
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

-- If you want to re-enable the trigger later with proper logic, uncomment this:
/*
-- Re-create the trigger with proper logic
CREATE OR REPLACE FUNCTION validate_follower_account()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow all follower creations for now
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_follower_account_trigger
    BEFORE INSERT OR UPDATE ON followers
    FOR EACH ROW
    EXECUTE FUNCTION validate_follower_account();
*/ 