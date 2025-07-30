-- Enhanced follower validation with copy mode, value validity, and drawdown limits
-- Run this in your Supabase SQL Editor

-- 1. First, let's modify the followers table to add the new fields
DO $$ 
BEGIN
  -- Add copy_mode field with proper constraints
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'copy_mode'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN copy_mode text DEFAULT 'fixed lot';
  END IF;
  
  -- Add multiplier field for multiplier mode
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'multiplier'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN multiplier numeric DEFAULT 1.0;
  END IF;
  
  -- Add percentage field for % balance mode
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'percentage'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN percentage numeric DEFAULT 10.0;
  END IF;
  
  -- Add fixed_lot field for fixed lot mode
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'fixed_lot'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN fixed_lot numeric DEFAULT 1.0;
  END IF;
  
  -- Add drawdown_limit field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'drawdown_limit'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN drawdown_limit numeric DEFAULT 20.0;
  END IF;
  
  -- Add total_balance field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'total_balance'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN total_balance numeric DEFAULT 10000.0;
  END IF;
END $$;

-- 2. Create a function to validate copy mode settings
CREATE OR REPLACE FUNCTION validate_copy_mode_settings(
  copy_mode_input text,
  multiplier_input numeric DEFAULT NULL,
  percentage_input numeric DEFAULT NULL,
  fixed_lot_input numeric DEFAULT NULL,
  drawdown_limit_input numeric DEFAULT NULL,
  total_balance_input numeric DEFAULT NULL
)
RETURNS TABLE (
  is_valid boolean,
  error_message text
) AS $$
BEGIN
  -- Validate copy mode
  IF copy_mode_input NOT IN ('fixed lot', 'multiplier', '% balance') THEN
    RETURN QUERY SELECT false, 'Copy mode must be one of: fixed lot, multiplier, % balance';
    RETURN;
  END IF;
  
  -- Validate multiplier (0.1 - 3.0)
  IF copy_mode_input = 'multiplier' THEN
    IF multiplier_input IS NULL THEN
      RETURN QUERY SELECT false, 'Multiplier value is required for multiplier mode';
      RETURN;
    END IF;
    
    IF multiplier_input < 0.1 OR multiplier_input > 3.0 THEN
      RETURN QUERY SELECT false, 'Multiplier must be between 0.1 and 3.0';
      RETURN;
    END IF;
  END IF;
  
  -- Validate percentage (1 - 100)
  IF copy_mode_input = '% balance' THEN
    IF percentage_input IS NULL THEN
      RETURN QUERY SELECT false, 'Percentage value is required for % balance mode';
      RETURN;
    END IF;
    
    IF percentage_input < 1.0 OR percentage_input > 100.0 THEN
      RETURN QUERY SELECT false, 'Percentage must be between 1.0 and 100.0';
      RETURN;
    END IF;
  END IF;
  
  -- Validate fixed lot (0.01 - 1000)
  IF copy_mode_input = 'fixed lot' THEN
    IF fixed_lot_input IS NULL THEN
      RETURN QUERY SELECT false, 'Fixed lot value is required for fixed lot mode';
      RETURN;
    END IF;
    
    IF fixed_lot_input < 0.01 OR fixed_lot_input > 1000.0 THEN
      RETURN QUERY SELECT false, 'Fixed lot must be between 0.01 and 1000.0';
      RETURN;
    END IF;
  END IF;
  
  -- Validate drawdown limit (1 - 50)
  IF drawdown_limit_input IS NOT NULL THEN
    IF drawdown_limit_input < 1.0 OR drawdown_limit_input > 50.0 THEN
      RETURN QUERY SELECT false, 'Drawdown limit must be between 1.0 and 50.0';
      RETURN;
    END IF;
  END IF;
  
  -- Validate total balance (positive value)
  IF total_balance_input IS NOT NULL THEN
    IF total_balance_input <= 0 THEN
      RETURN QUERY SELECT false, 'Total balance must be greater than 0';
      RETURN;
    END IF;
  END IF;
  
  -- Validate drawdown doesn't exceed total balance
  IF drawdown_limit_input IS NOT NULL AND total_balance_input IS NOT NULL THEN
    IF (drawdown_limit_input / 100.0) * total_balance_input > total_balance_input THEN
      RETURN QUERY SELECT false, 'Drawdown limit cannot exceed total balance';
      RETURN;
    END IF;
  END IF;
  
  RETURN QUERY SELECT true, 'All settings are valid';
END;
$$ LANGUAGE plpgsql;

-- 3. Enhanced follower account validation function
CREATE OR REPLACE FUNCTION validate_follower_account()
RETURNS TRIGGER AS $$
DECLARE
  validation_result record;
BEGIN
  -- Check if user already has a follower account with this name
  IF EXISTS (
    SELECT 1 FROM followers 
    WHERE id = NEW.id 
    AND follower_name = NEW.follower_name
    AND (TG_OP = 'INSERT' OR id != NEW.id)
  ) THEN
    RAISE EXCEPTION 'You already have a follower account with this name';
  END IF;
  
  -- Check if this follower already follows another broker account
  IF EXISTS (
    SELECT 1 FROM followers 
    WHERE id = NEW.id 
    AND subscribed_to IS NOT NULL
    AND subscribed_to != NEW.subscribed_to
    AND (TG_OP = 'INSERT' OR id != NEW.id)
  ) THEN
    RAISE EXCEPTION 'This follower account already follows another broker account';
  END IF;
  
  -- If subscribing to a broker account, verify it belongs to the same user
  IF NEW.subscribed_to IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM broker_accounts 
      WHERE id = NEW.subscribed_to 
      AND user_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'You can only follow your own broker accounts';
    END IF;
  END IF;
  
  -- Validate copy mode settings
  SELECT * INTO validation_result FROM validate_copy_mode_settings(
    NEW.copy_mode,
    NEW.multiplier,
    NEW.percentage,
    NEW.fixed_lot,
    NEW.drawdown_limit,
    NEW.total_balance
  );
  
  IF NOT validation_result.is_valid THEN
    RAISE EXCEPTION '%', validation_result.error_message;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Enhanced function to create a new follower account with validation
CREATE OR REPLACE FUNCTION create_follower_account_enhanced(
  user_uuid uuid,
  follower_name_input text,
  copy_mode_input text DEFAULT 'fixed lot',
  multiplier_input numeric DEFAULT 1.0,
  percentage_input numeric DEFAULT 10.0,
  fixed_lot_input numeric DEFAULT 1.0,
  drawdown_limit_input numeric DEFAULT 20.0,
  total_balance_input numeric DEFAULT 10000.0,
  risk_level_input text DEFAULT 'medium'
)
RETURNS TABLE (
  success boolean,
  message text,
  follower_id uuid
) AS $$
DECLARE
  new_follower_id uuid;
  validation_result record;
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
    RETURN QUERY SELECT false, validation_result.error_message, NULL::uuid;
    RETURN;
  END IF;
  
  -- Check if can create
  IF NOT EXISTS (
    SELECT 1 FROM can_create_follower_account(user_uuid, follower_name_input)
    WHERE can_create = true
  ) THEN
    RETURN QUERY SELECT false, 'Cannot create follower account - name already exists', NULL::uuid;
    RETURN;
  END IF;
  
  -- Create the follower account with all settings
  INSERT INTO followers (
    id, 
    follower_name, 
    copy_mode,
    multiplier,
    percentage,
    fixed_lot,
    drawdown_limit,
    total_balance,
    risk_level,
    capital_allocated
  )
  VALUES (
    user_uuid, 
    follower_name_input, 
    copy_mode_input,
    multiplier_input,
    percentage_input,
    fixed_lot_input,
    drawdown_limit_input,
    total_balance_input,
    risk_level_input,
    total_balance_input
  )
  RETURNING id INTO new_follower_id;
  
  RETURN QUERY SELECT true, 'Follower account created successfully with validated settings', new_follower_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Enhanced function to update follower account settings
CREATE OR REPLACE FUNCTION update_follower_account_settings(
  user_uuid uuid,
  follower_name_input text,
  copy_mode_input text DEFAULT NULL,
  multiplier_input numeric DEFAULT NULL,
  percentage_input numeric DEFAULT NULL,
  fixed_lot_input numeric DEFAULT NULL,
  drawdown_limit_input numeric DEFAULT NULL,
  total_balance_input numeric DEFAULT NULL,
  risk_level_input text DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  message text
) AS $$
DECLARE
  current_settings record;
  validation_result record;
  new_copy_mode text;
  new_multiplier numeric;
  new_percentage numeric;
  new_fixed_lot numeric;
  new_drawdown_limit numeric;
  new_total_balance numeric;
BEGIN
  -- Get current settings
  SELECT 
    copy_mode, multiplier, percentage, fixed_lot, drawdown_limit, total_balance
  INTO current_settings
  FROM followers 
  WHERE id = user_uuid AND follower_name = follower_name_input;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Follower account not found';
    RETURN;
  END IF;
  
  -- Use provided values or current values
  new_copy_mode := COALESCE(copy_mode_input, current_settings.copy_mode);
  new_multiplier := COALESCE(multiplier_input, current_settings.multiplier);
  new_percentage := COALESCE(percentage_input, current_settings.percentage);
  new_fixed_lot := COALESCE(fixed_lot_input, current_settings.fixed_lot);
  new_drawdown_limit := COALESCE(drawdown_limit_input, current_settings.drawdown_limit);
  new_total_balance := COALESCE(total_balance_input, current_settings.total_balance);
  
  -- Validate new settings
  SELECT * INTO validation_result FROM validate_copy_mode_settings(
    new_copy_mode,
    new_multiplier,
    new_percentage,
    new_fixed_lot,
    new_drawdown_limit,
    new_total_balance
  );
  
  IF NOT validation_result.is_valid THEN
    RETURN QUERY SELECT false, validation_result.error_message;
    RETURN;
  END IF;
  
  -- Update the follower account
  UPDATE followers 
  SET 
    copy_mode = new_copy_mode,
    multiplier = new_multiplier,
    percentage = new_percentage,
    fixed_lot = new_fixed_lot,
    drawdown_limit = new_drawdown_limit,
    total_balance = new_total_balance,
    risk_level = COALESCE(risk_level_input, risk_level),
    capital_allocated = new_total_balance
  WHERE id = user_uuid AND follower_name = follower_name_input;
  
  RETURN QUERY SELECT true, 'Follower account settings updated successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get follower account details with all settings
CREATE OR REPLACE FUNCTION get_follower_account_details(
  user_uuid uuid,
  follower_name_input text
)
RETURNS TABLE (
  follower_name text,
  copy_mode text,
  multiplier numeric,
  percentage numeric,
  fixed_lot numeric,
  drawdown_limit numeric,
  total_balance numeric,
  risk_level text,
  capital_allocated numeric,
  followed_broker_account_id uuid,
  followed_broker_name text,
  followed_account_name text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    f.follower_name,
    f.copy_mode,
    f.multiplier,
    f.percentage,
    f.fixed_lot,
    f.drawdown_limit,
    f.total_balance,
    f.risk_level,
    f.capital_allocated,
    f.subscribed_to as followed_broker_account_id,
    ba.broker_name as followed_broker_name,
    ba.account_name as followed_account_name,
    f.created_at
  FROM followers f
  LEFT JOIN broker_accounts ba ON f.subscribed_to = ba.id
  WHERE f.id = user_uuid AND f.follower_name = follower_name_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to validate settings before applying them
CREATE OR REPLACE FUNCTION validate_follower_settings(
  copy_mode_input text,
  multiplier_input numeric DEFAULT NULL,
  percentage_input numeric DEFAULT NULL,
  fixed_lot_input numeric DEFAULT NULL,
  drawdown_limit_input numeric DEFAULT NULL,
  total_balance_input numeric DEFAULT NULL
)
RETURNS TABLE (
  is_valid boolean,
  error_message text,
  recommendations jsonb
) AS $$
DECLARE
  recommendations jsonb;
BEGIN
  -- Validate settings
  SELECT * INTO validation_result FROM validate_copy_mode_settings(
    copy_mode_input,
    multiplier_input,
    percentage_input,
    fixed_lot_input,
    drawdown_limit_input,
    total_balance_input
  );
  
  IF NOT validation_result.is_valid THEN
    RETURN QUERY SELECT false, validation_result.error_message, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Generate recommendations
  recommendations := '{}'::jsonb;
  
  -- Add recommendations based on settings
  IF copy_mode_input = 'multiplier' AND multiplier_input > 2.0 THEN
    recommendations := recommendations || '{"warning": "High multiplier may increase risk"}'::jsonb;
  END IF;
  
  IF copy_mode_input = '% balance' AND percentage_input > 50.0 THEN
    recommendations := recommendations || '{"warning": "High percentage may increase risk"}'::jsonb;
  END IF;
  
  IF drawdown_limit_input > 30.0 THEN
    recommendations := recommendations || '{"warning": "High drawdown limit may increase risk"}'::jsonb;
  END IF;
  
  RETURN QUERY SELECT true, 'Settings are valid', recommendations;
END;
$$ LANGUAGE plpgsql;

-- 8. Verify the enhanced structure
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

-- 9. Test the validation functions
SELECT 'Testing validation functions' as info;

-- Test valid settings
SELECT 'Valid settings test' as test_name, * FROM validate_copy_mode_settings('multiplier', 1.5, NULL, NULL, 15.0, 5000.0);

-- Test invalid multiplier
SELECT 'Invalid multiplier test' as test_name, * FROM validate_copy_mode_settings('multiplier', 5.0, NULL, NULL, 15.0, 5000.0);

-- Test invalid percentage
SELECT 'Invalid percentage test' as test_name, * FROM validate_copy_mode_settings('% balance', NULL, 150.0, NULL, 15.0, 5000.0);

-- Test invalid copy mode
SELECT 'Invalid copy mode test' as test_name, * FROM validate_copy_mode_settings('invalid mode', 1.5, NULL, NULL, 15.0, 5000.0); 