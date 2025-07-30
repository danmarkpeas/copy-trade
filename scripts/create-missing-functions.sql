-- Create missing database functions for the copy trading platform

-- Function to create a follower account
CREATE OR REPLACE FUNCTION public.create_follower_account(
  api_key TEXT,
  api_secret TEXT,
  copy_mode TEXT DEFAULT 'multiplier',
  follower_name TEXT DEFAULT NULL,
  lot_size DECIMAL(20,8) DEFAULT 0.01,
  master_broker_id UUID DEFAULT NULL,
  profile_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  new_follower_id UUID;
  result JSON;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
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
    profile_id,
    api_key,
    api_secret,
    account_status,
    is_verified,
    created_at
  ) VALUES (
    new_follower_id,
    current_user_id, -- Subscribe to the current user
    1000, -- Default capital allocated
    'medium', -- Default risk level
    copy_mode,
    COALESCE(follower_name, 'Follower ' || new_follower_id::text),
    lot_size,
    master_broker_id,
    profile_id,
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
    'message', 'Follower account created successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get follower accounts for a user
CREATE OR REPLACE FUNCTION public.get_follower_accounts(user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  follower_name TEXT,
  copy_mode TEXT,
  lot_size DECIMAL(20,8),
  capital_allocated DECIMAL(20,8),
  risk_level TEXT,
  account_status TEXT,
  is_verified BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- If no user_id provided, use current user
  IF user_id IS NULL THEN
    user_id := auth.uid();
  END IF;

  RETURN QUERY
  SELECT 
    f.id,
    f.follower_name,
    f.copy_mode,
    f.lot_size,
    f.capital_allocated,
    f.risk_level,
    f.account_status,
    f.is_verified,
    f.created_at
  FROM public.followers f
  WHERE f.subscribed_to = user_id
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update follower account
CREATE OR REPLACE FUNCTION public.update_follower_account(
  follower_id UUID,
  copy_mode TEXT DEFAULT NULL,
  follower_name TEXT DEFAULT NULL,
  lot_size DECIMAL(20,8) DEFAULT NULL,
  capital_allocated DECIMAL(20,8) DEFAULT NULL,
  risk_level TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  result JSON;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Update the follower record
  UPDATE public.followers
  SET 
    copy_mode = COALESCE(copy_mode, copy_mode),
    follower_name = COALESCE(follower_name, follower_name),
    lot_size = COALESCE(lot_size, lot_size),
    capital_allocated = COALESCE(capital_allocated, capital_allocated),
    risk_level = COALESCE(risk_level, risk_level),
    updated_at = NOW()
  WHERE id = follower_id AND subscribed_to = current_user_id;

  IF FOUND THEN
    result := json_build_object(
      'success', true,
      'message', 'Follower account updated successfully'
    );
  ELSE
    result := json_build_object(
      'success', false,
      'error', 'Follower account not found or access denied'
    );
  END IF;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete follower account
CREATE OR REPLACE FUNCTION public.delete_follower_account(follower_id UUID)
RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  result JSON;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Delete the follower record
  DELETE FROM public.followers
  WHERE id = follower_id AND subscribed_to = current_user_id;

  IF FOUND THEN
    result := json_build_object(
      'success', true,
      'message', 'Follower account deleted successfully'
    );
  ELSE
    result := json_build_object(
      'success', false,
      'error', 'Follower account not found or access denied'
    );
  END IF;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify broker API credentials
CREATE OR REPLACE FUNCTION public.verify_broker_credentials(
  broker_name TEXT,
  api_key TEXT,
  api_secret TEXT
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- This is a placeholder function
  -- In a real implementation, you would call the broker's API to verify credentials
  -- For now, we'll just return success if the credentials are not empty
  
  IF api_key IS NULL OR api_secret IS NULL OR LENGTH(api_key) < 10 OR LENGTH(api_secret) < 10 THEN
    result := json_build_object(
      'success', false,
      'error', 'Invalid API credentials'
    );
  ELSE
    result := json_build_object(
      'success', true,
      'message', 'API credentials verified successfully',
      'broker_name', broker_name
    );
  END IF;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_follower_account(TEXT, TEXT, TEXT, TEXT, DECIMAL, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_follower_accounts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_follower_account(UUID, TEXT, TEXT, DECIMAL, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_follower_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_broker_credentials(TEXT, TEXT, TEXT) TO authenticated;

-- Add RLS policies for followers table if they don't exist
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own followers
DROP POLICY IF EXISTS "Users can view own followers" ON public.followers;
CREATE POLICY "Users can view own followers"
  ON public.followers FOR SELECT
  USING (auth.uid() = subscribed_to);

-- Policy for users to insert their own followers
DROP POLICY IF EXISTS "Users can insert own followers" ON public.followers;
CREATE POLICY "Users can insert own followers"
  ON public.followers FOR INSERT
  WITH CHECK (auth.uid() = subscribed_to);

-- Policy for users to update their own followers
DROP POLICY IF EXISTS "Users can update own followers" ON public.followers;
CREATE POLICY "Users can update own followers"
  ON public.followers FOR UPDATE
  USING (auth.uid() = subscribed_to);

-- Policy for users to delete their own followers
DROP POLICY IF EXISTS "Users can delete own followers" ON public.followers;
CREATE POLICY "Users can delete own followers"
  ON public.followers FOR DELETE
  USING (auth.uid() = subscribed_to); 

-- Create missing functions for follower edit functionality

-- Function to get all followers
CREATE OR REPLACE FUNCTION get_all_followers()
RETURNS TABLE (
  follower_id UUID,
  user_id UUID,
  follower_name TEXT,
  copy_mode TEXT,
  lot_size NUMERIC,
  multiplier NUMERIC,
  percentage NUMERIC,
  fixed_lot NUMERIC,
  min_lot_size NUMERIC,
  max_lot_size NUMERIC,
  account_status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id as follower_id,
    f.user_id,
    f.follower_name,
    f.copy_mode,
    f.lot_size,
    f.multiplier,
    f.percentage,
    f.fixed_lot,
    f.min_lot_size,
    f.max_lot_size,
    f.account_status,
    f.created_at
  FROM followers f
  WHERE f.account_status = 'active'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get follower details with platform info
CREATE OR REPLACE FUNCTION get_follower_account_complete_details_with_platform(
  user_uuid UUID,
  follower_name_input TEXT
)
RETURNS TABLE (
  follower_name TEXT,
  master_broker_account_id UUID,
  master_broker_name TEXT,
  master_account_name TEXT,
  broker_platform TEXT,
  profile_id TEXT,
  api_key TEXT,
  api_secret TEXT,
  copy_mode TEXT,
  multiplier NUMERIC,
  percentage NUMERIC,
  fixed_lot NUMERIC,
  lot_size NUMERIC,
  max_lot_size NUMERIC,
  min_lot_size NUMERIC,
  drawdown_limit NUMERIC,
  total_balance NUMERIC,
  risk_level TEXT,
  capital_allocated NUMERIC,
  max_daily_trades INTEGER,
  max_open_positions INTEGER,
  stop_loss_percentage NUMERIC,
  take_profit_percentage NUMERIC,
  account_status TEXT,
  is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.follower_name,
    f.master_broker_account_id,
    ba.broker_name as master_broker_name,
    ba.account_name as master_account_name,
    ba.broker_platform,
    f.profile_id,
    f.api_key,
    f.api_secret,
    f.copy_mode,
    f.multiplier,
    f.percentage,
    f.fixed_lot,
    f.lot_size,
    f.max_lot_size,
    f.min_lot_size,
    f.drawdown_limit,
    f.total_balance,
    f.risk_level,
    f.capital_allocated,
    f.max_daily_trades,
    f.max_open_positions,
    f.stop_loss_percentage,
    f.take_profit_percentage,
    f.account_status,
    f.is_verified
  FROM followers f
  LEFT JOIN broker_accounts ba ON f.master_broker_account_id = ba.id
  WHERE f.user_id = user_uuid 
    AND f.follower_name = follower_name_input
    AND f.account_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update follower account completely
CREATE OR REPLACE FUNCTION update_follower_account_complete(
  user_uuid UUID,
  follower_name_input TEXT,
  profile_id_input TEXT,
  api_key_input TEXT,
  api_secret_input TEXT,
  copy_mode_input TEXT,
  multiplier_input NUMERIC,
  percentage_input NUMERIC,
  fixed_lot_input NUMERIC,
  lot_size_input NUMERIC,
  max_lot_size_input NUMERIC,
  min_lot_size_input NUMERIC,
  drawdown_limit_input NUMERIC,
  total_balance_input NUMERIC,
  risk_level_input TEXT,
  max_daily_trades_input INTEGER,
  max_open_positions_input INTEGER,
  stop_loss_percentage_input NUMERIC,
  take_profit_percentage_input NUMERIC
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  follower_id UUID
) AS $$
DECLARE
  follower_record RECORD;
BEGIN
  -- Find the follower
  SELECT * INTO follower_record
  FROM followers
  WHERE user_id = user_uuid 
    AND follower_name = follower_name_input
    AND account_status = 'active';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Follower not found', NULL::UUID;
    RETURN;
  END IF;

  -- Update the follower
  UPDATE followers SET
    profile_id = COALESCE(profile_id_input, profile_id),
    api_key = COALESCE(api_key_input, api_key),
    api_secret = COALESCE(api_secret_input, api_secret),
    copy_mode = copy_mode_input,
    multiplier = COALESCE(multiplier_input, multiplier),
    percentage = COALESCE(percentage_input, percentage),
    fixed_lot = COALESCE(fixed_lot_input, fixed_lot),
    lot_size = lot_size_input,
    max_lot_size = max_lot_size_input,
    min_lot_size = min_lot_size_input,
    drawdown_limit = drawdown_limit_input,
    total_balance = total_balance_input,
    risk_level = risk_level_input,
    max_daily_trades = max_daily_trades_input,
    max_open_positions = max_open_positions_input,
    stop_loss_percentage = stop_loss_percentage_input,
    take_profit_percentage = take_profit_percentage_input,
    updated_at = NOW()
  WHERE id = follower_record.id;

  RETURN QUERY SELECT TRUE, 'Follower updated successfully', follower_record.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 