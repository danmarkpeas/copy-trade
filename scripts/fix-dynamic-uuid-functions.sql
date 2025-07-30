-- Dynamic UUID System - Fetch from database instead of hardcoded values
-- This creates functions that dynamically fetch UUIDs from the database

-- Drop existing hardcoded functions
DROP FUNCTION IF EXISTS public.create_hardcoded_follower_account(TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT);
DROP FUNCTION IF EXISTS public.get_hardcoded_followers(TEXT);
DROP FUNCTION IF EXISTS public.get_hardcoded_broker_account(TEXT);
DROP FUNCTION IF EXISTS public.get_hardcoded_user(TEXT);

-- Function to get all users dynamically
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.created_at
  FROM public.users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all active broker accounts dynamically
CREATE OR REPLACE FUNCTION public.get_all_broker_accounts()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  broker_name TEXT,
  account_name TEXT,
  api_key TEXT,
  api_secret TEXT,
  is_active BOOLEAN,
  is_verified BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ba.id,
    ba.user_id,
    ba.broker_name,
    ba.account_name,
    ba.api_key,
    ba.api_secret,
    ba.is_active,
    ba.is_verified,
    ba.created_at
  FROM public.broker_accounts ba
  WHERE ba.is_active = true
  ORDER BY ba.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all active followers dynamically
CREATE OR REPLACE FUNCTION public.get_all_followers()
RETURNS TABLE (
  id UUID,
  subscribed_to UUID,
  follower_name TEXT,
  copy_mode TEXT,
  lot_size DECIMAL(20,8),
  account_status TEXT,
  master_broker_account_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.subscribed_to,
    f.follower_name,
    f.copy_mode,
    f.lot_size,
    f.account_status,
    f.master_broker_account_id,
    f.created_at
  FROM public.followers f
  WHERE f.account_status = 'active'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get broker account by user email (dynamic)
CREATE OR REPLACE FUNCTION public.get_broker_account_by_email(user_email TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  broker_name TEXT,
  account_name TEXT,
  api_key TEXT,
  api_secret TEXT,
  is_active BOOLEAN,
  is_verified BOOLEAN
) AS $$
BEGIN
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
  JOIN public.users u ON ba.user_id = u.id
  WHERE u.email = user_email
    AND ba.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get followers by user email (dynamic)
CREATE OR REPLACE FUNCTION public.get_followers_by_email(user_email TEXT)
RETURNS TABLE (
  id UUID,
  follower_name TEXT,
  copy_mode TEXT,
  lot_size DECIMAL(20,8),
  account_status TEXT,
  subscribed_to UUID,
  master_broker_account_id UUID
) AS $$
BEGIN
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
  JOIN public.users u ON f.subscribed_to = u.id
  WHERE u.email = user_email
    AND f.account_status = 'active'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create follower with dynamic user lookup
CREATE OR REPLACE FUNCTION public.create_dynamic_follower_account(
  api_key TEXT DEFAULT NULL,
  api_secret TEXT DEFAULT NULL,
  copy_mode TEXT DEFAULT 'multiplier',
  follower_name TEXT DEFAULT NULL,
  lot_size DECIMAL(20,8) DEFAULT 0.01,
  user_email TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  new_follower_id UUID;
  master_broker_uuid UUID;
  result JSON;
BEGIN
  -- Get user ID by email (dynamic lookup)
  IF user_email IS NOT NULL AND user_email != '' THEN
    SELECT u.id INTO current_user_id
    FROM public.users u
    WHERE u.email = user_email
    LIMIT 1;
  ELSE
    -- Fallback to authenticated user
    current_user_id := auth.uid();
  END IF;
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found or not authenticated');
  END IF;

  -- Get the user's active broker account (dynamic lookup)
  SELECT ba.id INTO master_broker_uuid
  FROM public.broker_accounts ba
  WHERE ba.user_id = current_user_id 
    AND ba.is_active = true
  LIMIT 1;

  IF master_broker_uuid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active broker account found for user');
  END IF;

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
    COALESCE(follower_name, 'Dynamic Follower ' || new_follower_id::text),
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
    'message', 'Dynamic follower account created successfully',
    'user_id', current_user_id,
    'broker_id', master_broker_uuid,
    'user_email', user_email
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'details', 'Error creating dynamic follower account',
      'user_email', user_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user by email (dynamic)
CREATE OR REPLACE FUNCTION public.get_user_by_email(user_email TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.email,
    u.role
  FROM public.users u
  WHERE u.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get system status with dynamic data
CREATE OR REPLACE FUNCTION public.get_dynamic_system_status()
RETURNS JSON AS $$
DECLARE
  user_count INTEGER;
  broker_count INTEGER;
  follower_count INTEGER;
  result JSON;
BEGIN
  -- Get counts dynamically
  SELECT COUNT(*) INTO user_count FROM public.users;
  SELECT COUNT(*) INTO broker_count FROM public.broker_accounts WHERE is_active = true;
  SELECT COUNT(*) INTO follower_count FROM public.followers WHERE account_status = 'active';
  
  result := json_build_object(
    'success', true,
    'system_status', 'dynamic',
    'user_count', user_count,
    'broker_count', broker_count,
    'follower_count', follower_count,
    'timestamp', NOW(),
    'note', 'All UUIDs fetched dynamically from database'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_broker_accounts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_followers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_broker_account_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_followers_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_dynamic_follower_account(TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dynamic_system_status() TO authenticated;

-- Test the dynamic functions
SELECT 'Testing dynamic UUID functions...' as info;

-- Test getting all users
SELECT 'All Users:' as test_name;
SELECT * FROM get_all_users() LIMIT 3;

-- Test getting all broker accounts
SELECT 'All Broker Accounts:' as test_name;
SELECT * FROM get_all_broker_accounts() LIMIT 3;

-- Test getting all followers
SELECT 'All Followers:' as test_name;
SELECT * FROM get_all_followers() LIMIT 3;

-- Test system status
SELECT 'System Status:' as test_name;
SELECT * FROM get_dynamic_system_status();

-- Show usage examples
SELECT 'Usage Examples:' as info;
SELECT 
  'Get broker by email' as example,
  'SELECT * FROM get_broker_account_by_email(''gauravcrd@gmail.com'')' as query
UNION ALL
SELECT 
  'Get followers by email' as example,
  'SELECT * FROM get_followers_by_email(''gauravcrd@gmail.com'')' as query
UNION ALL
SELECT 
  'Create dynamic follower' as example,
  'SELECT * FROM create_dynamic_follower_account(''api_key'', ''api_secret'', ''multiplier'', ''My Follower'', 0.01, ''user@example.com'')' as query; 