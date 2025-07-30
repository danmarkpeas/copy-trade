-- Simple modification to support multiple follower accounts per user
-- Each follower account can follow only one broker account
-- Run this in your Supabase SQL Editor

-- 1. First, let's understand the current structure
SELECT 'Current followers table structure' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'followers'
ORDER BY ordinal_position;

-- 2. Add a follower_name column to distinguish between multiple follower accounts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followers' 
    AND column_name = 'follower_name'
  ) THEN
    ALTER TABLE public.followers ADD COLUMN follower_name text;
  END IF;
END $$;

-- 3. Add a unique constraint to ensure each follower can only follow one broker account
-- We'll use the existing subscribed_to field to reference broker_accounts instead of traders
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_follower_broker_account' 
    AND table_name = 'followers'
  ) THEN
    ALTER TABLE public.followers 
    ADD CONSTRAINT unique_follower_broker_account 
    UNIQUE (id, subscribed_to);
  END IF;
END $$;

-- 4. Add a unique constraint to ensure follower names are unique per user
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_user_follower_name' 
    AND table_name = 'followers'
  ) THEN
    ALTER TABLE public.followers 
    ADD CONSTRAINT unique_user_follower_name 
    UNIQUE (id, follower_name);
  END IF;
END $$;

-- 5. Create a function to validate follower account creation
CREATE OR REPLACE FUNCTION validate_follower_account()
RETURNS TRIGGER AS $$
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for follower account validation
DROP TRIGGER IF EXISTS validate_follower_account_trigger ON followers;
CREATE TRIGGER validate_follower_account_trigger
  BEFORE INSERT OR UPDATE ON followers
  FOR EACH ROW
  EXECUTE FUNCTION validate_follower_account();

-- 7. Create helper functions for managing follower accounts
CREATE OR REPLACE FUNCTION can_create_follower_account(
  user_uuid uuid,
  follower_name_input text
)
RETURNS TABLE (
  can_create boolean,
  reason text
) AS $$
BEGIN
  -- Check if user already has a follower account with this name
  IF EXISTS (
    SELECT 1 FROM followers 
    WHERE id = user_uuid 
    AND follower_name = follower_name_input
  ) THEN
    RETURN QUERY SELECT false, 'You already have a follower account with this name';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'Follower account can be created';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to check if follower can follow broker account
CREATE OR REPLACE FUNCTION can_follow_broker_account(
  user_uuid uuid,
  follower_name_input text,
  broker_account_uuid uuid
)
RETURNS TABLE (
  can_follow boolean,
  reason text
) AS $$
BEGIN
  -- Check if the follower account exists
  IF NOT EXISTS (
    SELECT 1 FROM followers 
    WHERE id = user_uuid 
    AND follower_name = follower_name_input
  ) THEN
    RETURN QUERY SELECT false, 'Follower account not found';
    RETURN;
  END IF;
  
  -- Check if this follower already follows another broker account
  IF EXISTS (
    SELECT 1 FROM followers 
    WHERE id = user_uuid 
    AND follower_name = follower_name_input
    AND subscribed_to IS NOT NULL
    AND subscribed_to != broker_account_uuid
  ) THEN
    RETURN QUERY SELECT false, 'This follower account already follows another broker account';
    RETURN;
  END IF;
  
  -- Check if this follower already follows this broker account
  IF EXISTS (
    SELECT 1 FROM followers 
    WHERE id = user_uuid 
    AND follower_name = follower_name_input
    AND subscribed_to = broker_account_uuid
  ) THEN
    RETURN QUERY SELECT false, 'This follower account already follows this broker account';
    RETURN;
  END IF;
  
  -- Check if the broker account belongs to the same user
  IF NOT EXISTS (
    SELECT 1 FROM broker_accounts 
    WHERE id = broker_account_uuid 
    AND user_id = user_uuid
  ) THEN
    RETURN QUERY SELECT false, 'You can only follow your own broker accounts';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'Follower can follow this broker account';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create helper functions to get user's follower accounts
CREATE OR REPLACE FUNCTION get_user_follower_accounts(user_uuid uuid)
RETURNS TABLE (
  follower_name text,
  risk_level text,
  copy_mode text,
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
    f.risk_level,
    f.copy_mode,
    f.capital_allocated,
    f.subscribed_to as followed_broker_account_id,
    ba.broker_name as followed_broker_name,
    ba.account_name as followed_account_name,
    f.created_at
  FROM followers f
  LEFT JOIN broker_accounts ba ON f.subscribed_to = ba.id
  WHERE f.id = user_uuid
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to get available broker accounts for a user
CREATE OR REPLACE FUNCTION get_available_broker_accounts_for_follower(
  user_uuid uuid,
  follower_name_input text
)
RETURNS TABLE (
  id uuid,
  broker_name text,
  account_name text,
  account_uid text,
  is_active boolean,
  is_followed boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    ba.id,
    ba.broker_name,
    ba.account_name,
    ba.account_uid,
    ba.is_active,
    CASE WHEN f.subscribed_to = ba.id THEN true ELSE false END as is_followed,
    ba.created_at
  FROM broker_accounts ba
  LEFT JOIN followers f ON f.id = user_uuid AND f.follower_name = follower_name_input
  WHERE ba.user_id = user_uuid
  ORDER BY ba.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to create a new follower account
CREATE OR REPLACE FUNCTION create_follower_account(
  user_uuid uuid,
  follower_name_input text,
  risk_level_input text DEFAULT 'medium',
  copy_mode_input text DEFAULT 'copy',
  capital_allocated_input numeric DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  message text,
  follower_id uuid
) AS $$
DECLARE
  new_follower_id uuid;
BEGIN
  -- Check if can create
  IF NOT EXISTS (
    SELECT 1 FROM can_create_follower_account(user_uuid, follower_name_input)
    WHERE can_create = true
  ) THEN
    RETURN QUERY SELECT false, 'Cannot create follower account', NULL::uuid;
    RETURN;
  END IF;
  
  -- Create the follower account
  INSERT INTO followers (id, follower_name, risk_level, copy_mode, capital_allocated)
  VALUES (user_uuid, follower_name_input, risk_level_input, copy_mode_input, capital_allocated_input)
  RETURNING id INTO new_follower_id;
  
  RETURN QUERY SELECT true, 'Follower account created successfully', new_follower_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create function to make follower follow a broker account
CREATE OR REPLACE FUNCTION follow_broker_account(
  user_uuid uuid,
  follower_name_input text,
  broker_account_uuid uuid
)
RETURNS TABLE (
  success boolean,
  message text
) AS $$
BEGIN
  -- Check if can follow
  IF NOT EXISTS (
    SELECT 1 FROM can_follow_broker_account(user_uuid, follower_name_input, broker_account_uuid)
    WHERE can_follow = true
  ) THEN
    RETURN QUERY SELECT false, 'Cannot follow this broker account';
    RETURN;
  END IF;
  
  -- Update the follower to follow the broker account
  UPDATE followers 
  SET subscribed_to = broker_account_uuid
  WHERE id = user_uuid AND follower_name = follower_name_input;
  
  RETURN QUERY SELECT true, 'Successfully following broker account';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Verify the modified structure
SELECT 'Modified followers table structure' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'followers'
ORDER BY ordinal_position;

-- 14. Show constraints
SELECT 'Constraints' as info;
SELECT 
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND table_name = 'followers'
AND constraint_type = 'UNIQUE'
ORDER BY table_name; 