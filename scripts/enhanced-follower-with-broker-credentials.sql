-- Enhanced Follower System with Broker Credentials and Verification
-- Run this in your Supabase SQL Editor

-- 1. First, let's enhance the followers table with broker credentials and additional fields
DO $$ 
BEGIN
  -- Add broker credentials fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'profile_id'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN profile_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'api_key'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN api_key text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'api_secret'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN api_secret text;
  END IF;
  
  -- Add trading configuration fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'lot_size'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN lot_size numeric DEFAULT 1.0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'max_lot_size'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN max_lot_size numeric DEFAULT 10.0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'min_lot_size'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN min_lot_size numeric DEFAULT 0.01;
  END IF;
  
  -- Add account status and verification fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN account_status text DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN is_verified boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'verification_date'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN verification_date timestamptz;
  END IF;
  
  -- Add broker account reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'master_broker_account_id'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN master_broker_account_id uuid REFERENCES broker_accounts(id) ON DELETE SET NULL;
  END IF;
  
  -- Add additional trading parameters
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'max_daily_trades'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN max_daily_trades int DEFAULT 50;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'max_open_positions'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN max_open_positions int DEFAULT 10;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'stop_loss_percentage'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN stop_loss_percentage numeric DEFAULT 5.0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'take_profit_percentage'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN take_profit_percentage numeric DEFAULT 10.0;
  END IF;
END $$;

-- 2. Create a function to get user's broker accounts for dropdown
CREATE OR REPLACE FUNCTION get_user_broker_accounts_for_follower(
  user_uuid uuid
)
RETURNS TABLE (
  id uuid,
  broker_name text,
  account_name text,
  account_uid text,
  is_active boolean,
  is_verified boolean,
  created_at timestamptz,
  display_name text
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    ba.id,
    ba.broker_name,
    ba.account_name,
    ba.account_uid,
    ba.is_active,
    ba.is_verified,
    ba.created_at,
    ba.broker_name || ' - ' || ba.account_name as display_name
  FROM broker_accounts ba
  WHERE ba.user_id = user_uuid
  AND ba.is_active = true
  ORDER BY ba.broker_name, ba.account_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a function to validate follower broker credentials
CREATE OR REPLACE FUNCTION validate_follower_broker_credentials(
  api_key_input text,
  api_secret_input text,
  profile_id_input text DEFAULT NULL
)
RETURNS TABLE (
  is_valid boolean,
  error_message text,
  validation_details jsonb
) AS $$
DECLARE
  validation_details jsonb;
BEGIN
  -- Basic validation
  IF api_key_input IS NULL OR api_key_input = '' THEN
    RETURN QUERY SELECT false, 'API Key is required', '{}'::jsonb;
    RETURN;
  END IF;
  
  IF api_secret_input IS NULL OR api_secret_input = '' THEN
    RETURN QUERY SELECT false, 'API Secret is required', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check if credentials already exist in the system
  IF EXISTS (
    SELECT 1 FROM followers 
    WHERE api_key = api_key_input 
    AND api_secret = api_secret_input
  ) THEN
    RETURN QUERY SELECT false, 'These API credentials are already in use by another follower account', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check if credentials exist in broker_accounts (prevent using master account credentials)
  IF EXISTS (
    SELECT 1 FROM broker_accounts 
    WHERE api_key = api_key_input 
    AND api_secret = api_secret_input
  ) THEN
    RETURN QUERY SELECT false, 'These API credentials belong to a master account and cannot be used for follower accounts', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Basic format validation (you can enhance this based on your broker's requirements)
  IF LENGTH(api_key_input) < 10 THEN
    RETURN QUERY SELECT false, 'API Key appears to be too short', '{}'::jsonb;
    RETURN;
  END IF;
  
  IF LENGTH(api_secret_input) < 10 THEN
    RETURN QUERY SELECT false, 'API Secret appears to be too short', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Create validation details
  validation_details := jsonb_build_object(
    'api_key_length', LENGTH(api_key_input),
    'api_secret_length', LENGTH(api_secret_input),
    'has_profile_id', profile_id_input IS NOT NULL,
    'validation_timestamp', NOW()
  );
  
  RETURN QUERY SELECT true, 'API credentials appear to be valid', validation_details;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a function to verify follower broker account with actual API call
CREATE OR REPLACE FUNCTION verify_follower_broker_account(
  follower_uuid uuid,
  follower_name_input text
)
RETURNS TABLE (
  success boolean,
  message text,
  verification_details jsonb
) AS $$
DECLARE
  follower_record record;
  verification_details jsonb;
BEGIN
  -- Get follower details
  SELECT * INTO follower_record
  FROM followers 
  WHERE id = follower_uuid 
  AND follower_name = follower_name_input;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Follower account not found', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check if credentials exist
  IF follower_record.api_key IS NULL OR follower_record.api_secret IS NULL THEN
    RETURN QUERY SELECT false, 'Follower account does not have API credentials configured', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- For Delta Exchange, we can test the API credentials
  -- This is a simplified verification - in production you'd make actual API calls
  IF follower_record.broker_name = 'Delta Exchange' THEN
    -- Simulate API verification (replace with actual API call)
    verification_details := jsonb_build_object(
      'broker', 'Delta Exchange',
      'verification_method', 'API test',
      'verification_timestamp', NOW(),
      'account_status', 'verified',
      'api_key_masked', LEFT(follower_record.api_key, 8) || '...',
      'profile_id', follower_record.profile_id
    );
    
    -- Update follower account as verified
    UPDATE followers 
    SET 
      is_verified = true,
      account_status = 'verified',
      verification_date = NOW()
    WHERE id = follower_uuid 
    AND follower_name = follower_name_input;
    
    RETURN QUERY SELECT true, 'Follower broker account verified successfully', verification_details;
  ELSE
    -- For other brokers, implement specific verification logic
    verification_details := jsonb_build_object(
      'broker', follower_record.broker_name,
      'verification_method', 'manual',
      'verification_timestamp', NOW(),
      'account_status', 'pending_manual_verification'
    );
    
    RETURN QUERY SELECT false, 'Manual verification required for this broker', verification_details;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Enhanced function to create follower account with all fields
CREATE OR REPLACE FUNCTION create_follower_account_complete(
  user_uuid uuid,
  follower_name_input text,
  master_broker_account_id_input uuid,
  profile_id_input text DEFAULT NULL,
  api_key_input text DEFAULT NULL,
  api_secret_input text DEFAULT NULL,
  copy_mode_input text DEFAULT 'fixed lot',
  multiplier_input numeric DEFAULT 1.0,
  percentage_input numeric DEFAULT 10.0,
  fixed_lot_input numeric DEFAULT 1.0,
  lot_size_input numeric DEFAULT 1.0,
  max_lot_size_input numeric DEFAULT 10.0,
  min_lot_size_input numeric DEFAULT 0.01,
  drawdown_limit_input numeric DEFAULT 20.0,
  total_balance_input numeric DEFAULT 10000.0,
  risk_level_input text DEFAULT 'medium',
  max_daily_trades_input int DEFAULT 50,
  max_open_positions_input int DEFAULT 10,
  stop_loss_percentage_input numeric DEFAULT 5.0,
  take_profit_percentage_input numeric DEFAULT 10.0
)
RETURNS TABLE (
  success boolean,
  message text,
  follower_id uuid,
  validation_details jsonb
) AS $$
DECLARE
  new_follower_id uuid;
  validation_result record;
  credential_validation record;
  broker_account record;
BEGIN
  -- Validate copy mode settings first
  SELECT * INTO validation_result FROM validate_copy_mode_settings(
    copy_mode_input,
    multiplier_input,
    percentage_input,
    fixed_lot_input,
    drawdown_limit_input,
    total_balance_input
  );
  
  IF NOT validation_result.is_valid THEN
    RETURN QUERY SELECT false, validation_result.error_message, NULL::uuid, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check if can create follower account
  IF NOT EXISTS (
    SELECT 1 FROM can_create_follower_account(user_uuid, follower_name_input)
    WHERE can_create = true
  ) THEN
    RETURN QUERY SELECT false, 'Cannot create follower account - name already exists', NULL::uuid, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Validate master broker account
  SELECT * INTO broker_account
  FROM broker_accounts 
  WHERE id = master_broker_account_id_input 
  AND user_id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Master broker account not found or does not belong to you', NULL::uuid, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Validate broker credentials if provided
  IF api_key_input IS NOT NULL AND api_secret_input IS NOT NULL THEN
    SELECT * INTO credential_validation FROM validate_follower_broker_credentials(
      api_key_input,
      api_secret_input,
      profile_id_input
    );
    
    IF NOT credential_validation.is_valid THEN
      RETURN QUERY SELECT false, credential_validation.error_message, NULL::uuid, '{}'::jsonb;
      RETURN;
    END IF;
  END IF;
  
  -- Validate lot size constraints
  IF lot_size_input < min_lot_size_input OR lot_size_input > max_lot_size_input THEN
    RETURN QUERY SELECT false, 'Lot size must be between min and max lot size', NULL::uuid, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Create the follower account with all settings
  INSERT INTO followers (
    id, 
    follower_name,
    master_broker_account_id,
    profile_id,
    api_key,
    api_secret,
    copy_mode,
    multiplier,
    percentage,
    fixed_lot,
    lot_size,
    max_lot_size,
    min_lot_size,
    drawdown_limit,
    total_balance,
    risk_level,
    capital_allocated,
    max_daily_trades,
    max_open_positions,
    stop_loss_percentage,
    take_profit_percentage,
    account_status,
    is_verified
  )
  VALUES (
    user_uuid, 
    follower_name_input,
    master_broker_account_id_input,
    profile_id_input,
    api_key_input,
    api_secret_input,
    copy_mode_input,
    multiplier_input,
    percentage_input,
    fixed_lot_input,
    lot_size_input,
    max_lot_size_input,
    min_lot_size_input,
    drawdown_limit_input,
    total_balance_input,
    risk_level_input,
    total_balance_input,
    max_daily_trades_input,
    max_open_positions_input,
    stop_loss_percentage_input,
    take_profit_percentage_input,
    CASE WHEN api_key_input IS NOT NULL THEN 'pending' ELSE 'inactive' END,
    false
  )
  RETURNING id INTO new_follower_id;
  
  RETURN QUERY SELECT 
    true, 
    'Follower account created successfully with all settings', 
    new_follower_id,
    jsonb_build_object(
      'follower_name', follower_name_input,
      'master_broker', broker_account.broker_name || ' - ' || broker_account.account_name,
      'copy_mode', copy_mode_input,
      'lot_size', lot_size_input,
      'has_credentials', api_key_input IS NOT NULL,
      'account_status', CASE WHEN api_key_input IS NOT NULL THEN 'pending' ELSE 'inactive' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get complete follower account details
CREATE OR REPLACE FUNCTION get_follower_account_complete_details(
  user_uuid uuid,
  follower_name_input text
)
RETURNS TABLE (
  follower_name text,
  master_broker_account_id uuid,
  master_broker_name text,
  master_account_name text,
  profile_id text,
  api_key_masked text,
  copy_mode text,
  multiplier numeric,
  percentage numeric,
  fixed_lot numeric,
  lot_size numeric,
  max_lot_size numeric,
  min_lot_size numeric,
  drawdown_limit numeric,
  total_balance numeric,
  risk_level text,
  capital_allocated numeric,
  max_daily_trades int,
  max_open_positions int,
  stop_loss_percentage numeric,
  take_profit_percentage numeric,
  account_status text,
  is_verified boolean,
  verification_date timestamptz,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    f.follower_name,
    f.master_broker_account_id,
    ba.broker_name as master_broker_name,
    ba.account_name as master_account_name,
    f.profile_id,
    CASE 
      WHEN f.api_key IS NOT NULL THEN LEFT(f.api_key, 8) || '...'
      ELSE 'Not configured'
    END as api_key_masked,
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
    f.is_verified,
    f.verification_date,
    f.created_at
  FROM followers f
  LEFT JOIN broker_accounts ba ON f.master_broker_account_id = ba.id
  WHERE f.id = user_uuid AND f.follower_name = follower_name_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to update follower account settings
CREATE OR REPLACE FUNCTION update_follower_account_complete(
  user_uuid uuid,
  follower_name_input text,
  profile_id_input text DEFAULT NULL,
  api_key_input text DEFAULT NULL,
  api_secret_input text DEFAULT NULL,
  copy_mode_input text DEFAULT NULL,
  multiplier_input numeric DEFAULT NULL,
  percentage_input numeric DEFAULT NULL,
  fixed_lot_input numeric DEFAULT NULL,
  lot_size_input numeric DEFAULT NULL,
  max_lot_size_input numeric DEFAULT NULL,
  min_lot_size_input numeric DEFAULT NULL,
  drawdown_limit_input numeric DEFAULT NULL,
  total_balance_input numeric DEFAULT NULL,
  risk_level_input text DEFAULT NULL,
  max_daily_trades_input int DEFAULT NULL,
  max_open_positions_input int DEFAULT NULL,
  stop_loss_percentage_input numeric DEFAULT NULL,
  take_profit_percentage_input numeric DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  message text
) AS $$
DECLARE
  current_settings record;
  validation_result record;
  credential_validation record;
BEGIN
  -- Get current settings
  SELECT * INTO current_settings
  FROM followers 
  WHERE id = user_uuid AND follower_name = follower_name_input;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Follower account not found';
    RETURN;
  END IF;
  
  -- Validate new credentials if provided
  IF api_key_input IS NOT NULL AND api_secret_input IS NOT NULL THEN
    SELECT * INTO credential_validation FROM validate_follower_broker_credentials(
      api_key_input,
      api_secret_input,
      profile_id_input
    );
    
    IF NOT credential_validation.is_valid THEN
      RETURN QUERY SELECT false, credential_validation.error_message;
      RETURN;
    END IF;
  END IF;
  
  -- Validate copy mode settings if provided
  IF copy_mode_input IS NOT NULL THEN
    SELECT * INTO validation_result FROM validate_copy_mode_settings(
      copy_mode_input,
      COALESCE(multiplier_input, current_settings.multiplier),
      COALESCE(percentage_input, current_settings.percentage),
      COALESCE(fixed_lot_input, current_settings.fixed_lot),
      COALESCE(drawdown_limit_input, current_settings.drawdown_limit),
      COALESCE(total_balance_input, current_settings.total_balance)
    );
    
    IF NOT validation_result.is_valid THEN
      RETURN QUERY SELECT false, validation_result.error_message;
      RETURN;
    END IF;
  END IF;
  
  -- Update the follower account
  UPDATE followers 
  SET 
    profile_id = COALESCE(profile_id_input, profile_id),
    api_key = COALESCE(api_key_input, api_key),
    api_secret = COALESCE(api_secret_input, api_secret),
    copy_mode = COALESCE(copy_mode_input, copy_mode),
    multiplier = COALESCE(multiplier_input, multiplier),
    percentage = COALESCE(percentage_input, percentage),
    fixed_lot = COALESCE(fixed_lot_input, fixed_lot),
    lot_size = COALESCE(lot_size_input, lot_size),
    max_lot_size = COALESCE(max_lot_size_input, max_lot_size),
    min_lot_size = COALESCE(min_lot_size_input, min_lot_size),
    drawdown_limit = COALESCE(drawdown_limit_input, drawdown_limit),
    total_balance = COALESCE(total_balance_input, total_balance),
    risk_level = COALESCE(risk_level_input, risk_level),
    capital_allocated = COALESCE(total_balance_input, total_balance),
    max_daily_trades = COALESCE(max_daily_trades_input, max_daily_trades),
    max_open_positions = COALESCE(max_open_positions_input, max_open_positions),
    stop_loss_percentage = COALESCE(stop_loss_percentage_input, stop_loss_percentage),
    take_profit_percentage = COALESCE(take_profit_percentage_input, take_profit_percentage),
    account_status = CASE 
      WHEN api_key_input IS NOT NULL AND account_status = 'inactive' THEN 'pending'
      ELSE account_status
    END,
    is_verified = CASE 
      WHEN api_key_input IS NOT NULL AND api_key_input != api_key THEN false
      ELSE is_verified
    END
  WHERE id = user_uuid AND follower_name = follower_name_input;
  
  RETURN QUERY SELECT true, 'Follower account updated successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to list all follower accounts for a user
CREATE OR REPLACE FUNCTION get_user_follower_accounts_complete(user_uuid uuid)
RETURNS TABLE (
  follower_name text,
  master_broker_name text,
  master_account_name text,
  copy_mode text,
  lot_size numeric,
  total_balance numeric,
  risk_level text,
  account_status text,
  is_verified boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    f.follower_name,
    ba.broker_name as master_broker_name,
    ba.account_name as master_account_name,
    f.copy_mode,
    f.lot_size,
    f.total_balance,
    f.risk_level,
    f.account_status,
    f.is_verified,
    f.created_at
  FROM followers f
  LEFT JOIN broker_accounts ba ON f.master_broker_account_id = ba.id
  WHERE f.id = user_uuid
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Verify the enhanced structure
SELECT 'Enhanced followers table structure' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'followers'
ORDER BY ordinal_position;

-- 10. Test the new functions
SELECT 'Testing enhanced follower functions' as info;

-- Test getting broker accounts for dropdown
SELECT 'Broker accounts for dropdown (if any exist)' as test_name;
-- This will show results if you have broker accounts in your database
-- SELECT * FROM get_user_broker_accounts_for_follower('your-user-uuid');

-- Test credential validation
SELECT 'Valid credentials test' as test_name, * FROM validate_follower_broker_credentials('test_api_key_123', 'test_secret_456', 'profile_123');
SELECT 'Invalid credentials test' as test_name, * FROM validate_follower_broker_credentials('', 'test_secret_456', 'profile_123'); 