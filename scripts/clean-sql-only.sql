-- Fix the create_follower_account function to use actual authenticated user
-- The current function is using a hardcoded fallback user ID instead of auth.uid()

-- Drop the existing function
DROP FUNCTION IF EXISTS public.create_follower_account(TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT);

-- Create the fixed function that properly uses auth.uid()
CREATE OR REPLACE FUNCTION public.create_follower_account(
  api_key TEXT,
  api_secret TEXT,
  copy_mode TEXT DEFAULT 'multiplier',
  follower_name TEXT DEFAULT NULL,
  lot_size DECIMAL(20,8) DEFAULT 0.01,
  master_broker_id TEXT DEFAULT NULL,
  profile_id TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  new_follower_id UUID;
  master_broker_uuid UUID := NULL;
  profile_uuid UUID := NULL;
  result JSON;
BEGIN
  -- Get the actual authenticated user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Convert master_broker_id to UUID if provided
  IF master_broker_id IS NOT NULL AND master_broker_id != '' THEN
    BEGIN
      master_broker_uuid := master_broker_id::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        -- If conversion fails, try to find broker account by user_id
        SELECT id INTO master_broker_uuid 
        FROM public.broker_accounts 
        WHERE user_id = current_user_id AND is_active = true 
        LIMIT 1;
    END;
  END IF;

  -- Convert profile_id to UUID if provided
  IF profile_id IS NOT NULL AND profile_id != '' THEN
    BEGIN
      profile_uuid := profile_id::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        profile_uuid := NULL;
    END;
  END IF;

  -- Generate a new UUID for the follower
  new_follower_id := gen_random_uuid();

  -- Insert the follower record with proper error handling
  BEGIN
    INSERT INTO public.followers (
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
      new_follower_id,
      current_user_id, -- Use the actual authenticated user ID
      1000, -- Default capital allocated
      'medium', -- Default risk level
      copy_mode,
      COALESCE(follower_name, 'Follower ' || new_follower_id::text),
      lot_size,
      master_broker_uuid,
      profile_uuid,
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
      'message', 'Follower account created successfully',
      'master_broker_id', master_broker_uuid,
      'profile_id', profile_uuid,
      'user_id', current_user_id -- Include the user ID for debugging
    );

    RETURN result;

  EXCEPTION
    WHEN OTHERS THEN
      RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'details', 'Error creating follower account',
        'user_id', current_user_id,
        'broker_id', master_broker_uuid
      );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_follower_account(TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT) TO authenticated; 