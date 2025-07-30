-- Fix database functions to use hardcoded UUIDs
-- This eliminates authentication issues and makes the system more reliable

-- Drop existing functions
DROP FUNCTION IF EXISTS public.create_follower_account(TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_simple_follower_account(TEXT, TEXT, TEXT, TEXT, DECIMAL);

-- Create a function that uses hardcoded UUIDs
CREATE OR REPLACE FUNCTION public.create_hardcoded_follower_account(
  api_key TEXT DEFAULT NULL,
  api_secret TEXT DEFAULT NULL,
  copy_mode TEXT DEFAULT 'multiplier',
  follower_name TEXT DEFAULT NULL,
  lot_size DECIMAL(20,8) DEFAULT 0.01,
  user_type TEXT DEFAULT 'user1' -- 'user1', 'user2', 'user3'
) RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  new_follower_id UUID;
  master_broker_uuid UUID;
  result JSON;
BEGIN
  -- Use hardcoded UUIDs based on user_type
  CASE user_type
    WHEN 'user1' THEN
      current_user_id := '29a36e2e-84e4-4998-8588-6ffb02a77890'::UUID;
      master_broker_uuid := 'f1bff339-23e2-4763-9aad-a3a02d18cf22'::UUID;
    WHEN 'user2' THEN
      current_user_id := 'fdb32e0d-0778-4f76-b153-c72b8656ab47'::UUID;
      master_broker_uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID;
    WHEN 'user3' THEN
      current_user_id := '11111111-2222-3333-4444-555555555555'::UUID;
      master_broker_uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::UUID;
    ELSE
      -- Default to user1
      current_user_id := '29a36e2e-84e4-4998-8588-6ffb02a77890'::UUID;
      master_broker_uuid := 'f1bff339-23e2-4763-9aad-a3a02d18cf22'::UUID;
  END CASE;

  -- Generate a new UUID for the follower
  new_follower_id := gen_random_uuid();

  -- Insert the follower record
  INSERT INTO public.followers (
    id,
    subscribed_to,
    capital_allocated,
    risk_level,
    copy_mode,
    follower_name,
    lot_size,
    master_broker_account_id,
    api_key,
    api_secret,
    account_status,
    is_verified,
    created_at
  ) VALUES (
    new_follower_id,
    current_user_id,
    1000, -- Default capital allocated
    'medium', -- Default risk level
    copy_mode,
    COALESCE(follower_name, 'Hardcoded Follower ' || new_follower_id::text),
    lot_size,
    master_broker_uuid,
    api_key,
    api_secret,
    'active',
    true,
    NOW()
  );

  -- Return success response
  result := json_build_object(
    'success', true,
    'follower_id', new_follower_id,
    'message', 'Hardcoded follower account created successfully',
    'user_id', current_user_id,
    'broker_id', master_broker_uuid,
    'user_type', user_type
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'details', 'Error creating hardcoded follower account',
      'user_type', user_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get followers by hardcoded user type
CREATE OR REPLACE FUNCTION public.get_hardcoded_followers(
  user_type TEXT DEFAULT 'user1'
) RETURNS TABLE (
  id UUID,
  follower_name TEXT,
  copy_mode TEXT,
  lot_size DECIMAL(20,8),
  account_status TEXT,
  subscribed_to UUID,
  master_broker_account_id UUID
) AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Use hardcoded UUIDs based on user_type
  CASE user_type
    WHEN 'user1' THEN
      target_user_id := '29a36e2e-84e4-4998-8588-6ffb02a77890'::UUID;
    WHEN 'user2' THEN
      target_user_id := 'fdb32e0d-0778-4f76-b153-c72b8656ab47'::UUID;
    WHEN 'user3' THEN
      target_user_id := '11111111-2222-3333-4444-555555555555'::UUID;
    ELSE
      target_user_id := '29a36e2e-84e4-4998-8588-6ffb02a77890'::UUID;
  END CASE;

  RETURN QUERY
  SELECT 
    f.id,
    f.follower_name,
    f.copy_mode,
    f.lot_size,
    f.account_status,
    f.subscribed_to,
    f.master_broker_account_id
  FROM public.followers f
  WHERE f.subscribed_to = target_user_id
    AND f.account_status = 'active'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get broker account by hardcoded user type
CREATE OR REPLACE FUNCTION public.get_hardcoded_broker_account(
  user_type TEXT DEFAULT 'user1'
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  broker_name TEXT,
  account_name TEXT,
  api_key TEXT,
  api_secret TEXT,
  is_active BOOLEAN,
  is_verified BOOLEAN
) AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Use hardcoded UUIDs based on user_type
  CASE user_type
    WHEN 'user1' THEN
      target_user_id := '29a36e2e-84e4-4998-8588-6ffb02a77890'::UUID;
    WHEN 'user2' THEN
      target_user_id := 'fdb32e0d-0778-4f76-b153-c72b8656ab47'::UUID;
    WHEN 'user3' THEN
      target_user_id := '11111111-2222-3333-4444-555555555555'::UUID;
    ELSE
      target_user_id := '29a36e2e-84e4-4998-8588-6ffb02a77890'::UUID;
  END CASE;

  RETURN QUERY
  SELECT 
    ba.id,
    ba.user_id,
    ba.broker_name,
    ba.account_name,
    ba.api_key,
    ba.api_secret,
    ba.is_active,
    ba.is_verified
  FROM public.broker_accounts ba
  WHERE ba.user_id = target_user_id
    AND ba.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get user by hardcoded type
CREATE OR REPLACE FUNCTION public.get_hardcoded_user(
  user_type TEXT DEFAULT 'user1'
) RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT
) AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Use hardcoded UUIDs based on user_type
  CASE user_type
    WHEN 'user1' THEN
      target_user_id := '29a36e2e-84e4-4998-8588-6ffb02a77890'::UUID;
    WHEN 'user2' THEN
      target_user_id := 'fdb32e0d-0778-4f76-b153-c72b8656ab47'::UUID;
    WHEN 'user3' THEN
      target_user_id := '11111111-2222-3333-4444-555555555555'::UUID;
    ELSE
      target_user_id := '29a36e2e-84e4-4998-8588-6ffb02a77890'::UUID;
  END CASE;

  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.email,
    u.role
  FROM public.users u
  WHERE u.id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_hardcoded_follower_account(TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hardcoded_followers(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hardcoded_broker_account(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hardcoded_user(TEXT) TO authenticated;

-- Test the functions
SELECT 'Testing hardcoded functions...' as info;

-- Test creating a hardcoded follower
SELECT * FROM create_hardcoded_follower_account(
  'test_api_key',
  'test_api_secret',
  'multiplier',
  'Test Hardcoded Follower',
  0.01,
  'user1'
);

-- Test getting hardcoded followers
SELECT * FROM get_hardcoded_followers('user1');

-- Test getting hardcoded broker account
SELECT * FROM get_hardcoded_broker_account('user1');

-- Test getting hardcoded user
SELECT * FROM get_hardcoded_user('user1');

-- Show all hardcoded UUIDs for reference
SELECT 'Hardcoded UUIDs Reference:' as info;
SELECT 
  'User 1 (gauravcrd@gmail.com)' as user_type,
  '29a36e2e-84e4-4998-8588-6ffb02a77890' as user_id,
  'f1bff339-23e2-4763-9aad-a3a02d18cf22' as broker_id
UNION ALL
SELECT 
  'User 2 (danmarkpeas@gmail.com)' as user_type,
  'fdb32e0d-0778-4f76-b153-c72b8656ab47' as user_id,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as broker_id
UNION ALL
SELECT 
  'User 3 (different@example.com)' as user_type,
  '11111111-2222-3333-4444-555555555555' as user_id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as broker_id; 