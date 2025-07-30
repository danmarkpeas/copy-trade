-- Modify follower-broker relationship
-- Users can have multiple follower accounts, but each follower account can follow only one broker account
-- Run this in your Supabase SQL Editor

-- 1. First, let's understand the current structure
SELECT 'Current table structure' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('followers', 'broker_accounts', 'subscriptions')
ORDER BY table_name, ordinal_position;

-- 2. Modify the followers table to support multiple follower accounts per user
-- Add a unique constraint to ensure each follower account follows only one broker
DO $$ 
BEGIN
  -- Add a unique constraint to ensure each follower can only follow one broker account
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

-- 3. Create a new table for follower-broker relationships (if needed)
-- This allows tracking which follower account follows which broker account
CREATE TABLE IF NOT EXISTS public.follower_broker_relationships (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references followers(id) on delete cascade,
  broker_account_id uuid references broker_accounts(id) on delete cascade,
  risk_mode text default 'fixed', -- e.g. 'fixed', 'multiplier', 'proportional'
  capital_allocated numeric,
  status text default 'active',
  created_at timestamptz default now(),
  UNIQUE (follower_id, broker_account_id) -- Each follower can follow only one broker account
);

-- 4. Create a function to validate follower-broker relationship
CREATE OR REPLACE FUNCTION validate_follower_broker_relationship()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if follower already follows another broker account
  IF EXISTS (
    SELECT 1 FROM public.follower_broker_relationships 
    WHERE follower_id = NEW.follower_id 
    AND broker_account_id != NEW.broker_account_id
  ) THEN
    RAISE EXCEPTION 'This follower account already follows another broker account';
  END IF;
  
  -- Check if the broker account belongs to a different user (optional security check)
  -- This prevents followers from following broker accounts of other users
  IF EXISTS (
    SELECT 1 FROM broker_accounts ba
    JOIN followers f ON f.id = NEW.follower_id
    WHERE ba.id = NEW.broker_account_id 
    AND ba.user_id != f.id
  ) THEN
    RAISE EXCEPTION 'You can only follow your own broker accounts';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for follower-broker relationship validation
DROP TRIGGER IF EXISTS validate_follower_broker_relationship_trigger ON public.follower_broker_relationships;
CREATE TRIGGER validate_follower_broker_relationship_trigger
  BEFORE INSERT OR UPDATE ON public.follower_broker_relationships
  FOR EACH ROW
  EXECUTE FUNCTION validate_follower_broker_relationship();

-- 6. Create helper functions for managing follower accounts
CREATE OR REPLACE FUNCTION can_create_follower_account(
  user_uuid uuid,
  follower_name text
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
    AND bio = follower_name -- Using bio field as follower name
  ) THEN
    RETURN QUERY SELECT false, 'You already have a follower account with this name';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'Follower account can be created';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to check if follower can follow broker account
CREATE OR REPLACE FUNCTION can_follow_broker_account(
  follower_uuid uuid,
  broker_account_uuid uuid
)
RETURNS TABLE (
  can_follow boolean,
  reason text
) AS $$
BEGIN
  -- Check if follower already follows another broker account
  IF EXISTS (
    SELECT 1 FROM public.follower_broker_relationships 
    WHERE follower_id = follower_uuid 
    AND broker_account_id != broker_account_uuid
  ) THEN
    RETURN QUERY SELECT false, 'This follower account already follows another broker account';
    RETURN;
  END IF;
  
  -- Check if follower already follows this broker account
  IF EXISTS (
    SELECT 1 FROM public.follower_broker_relationships 
    WHERE follower_id = follower_uuid 
    AND broker_account_id = broker_account_uuid
  ) THEN
    RETURN QUERY SELECT false, 'This follower account already follows this broker account';
    RETURN;
  END IF;
  
  -- Check if the broker account belongs to the same user
  IF NOT EXISTS (
    SELECT 1 FROM broker_accounts ba
    JOIN followers f ON f.id = follower_uuid
    WHERE ba.id = broker_account_uuid 
    AND ba.user_id = f.id
  ) THEN
    RETURN QUERY SELECT false, 'You can only follow your own broker accounts';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'Follower can follow this broker account';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create helper functions to get user's follower accounts and their relationships
CREATE OR REPLACE FUNCTION get_user_follower_accounts(user_uuid uuid)
RETURNS TABLE (
  follower_id uuid,
  follower_name text,
  risk_level text,
  copy_mode text,
  capital_allocated numeric,
  followed_broker_account_id uuid,
  followed_broker_name text,
  followed_account_name text,
  relationship_status text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    f.id as follower_id,
    f.bio as follower_name,
    f.risk_level,
    f.copy_mode,
    f.capital_allocated,
    fbr.broker_account_id as followed_broker_account_id,
    ba.broker_name as followed_broker_name,
    ba.account_name as followed_account_name,
    fbr.status as relationship_status,
    fbr.created_at
  FROM followers f
  LEFT JOIN public.follower_broker_relationships fbr ON f.id = fbr.follower_id
  LEFT JOIN broker_accounts ba ON fbr.broker_account_id = ba.id
  WHERE f.id = user_uuid
  ORDER BY fbr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to get available broker accounts for a user
CREATE OR REPLACE FUNCTION get_available_broker_accounts(user_uuid uuid)
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
    CASE WHEN fbr.broker_account_id IS NOT NULL THEN true ELSE false END as is_followed,
    ba.created_at
  FROM broker_accounts ba
  LEFT JOIN public.follower_broker_relationships fbr ON ba.id = fbr.broker_account_id
  WHERE ba.user_id = user_uuid
  ORDER BY ba.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Add RLS policies for the new table
ALTER TABLE public.follower_broker_relationships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own follower-broker relationships" ON public.follower_broker_relationships;

-- Create new policies
CREATE POLICY "Users can manage own follower-broker relationships"
  ON public.follower_broker_relationships
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM followers f 
      WHERE f.id = follower_id 
      AND f.id = auth.uid()
    )
  );

-- 11. Verify the new structure
SELECT 'New table structure' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('followers', 'broker_accounts', 'follower_broker_relationships')
ORDER BY table_name, ordinal_position;

-- 12. Show constraints
SELECT 'Constraints' as info;
SELECT 
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND table_name IN ('followers', 'follower_broker_relationships')
AND constraint_type = 'UNIQUE'
ORDER BY table_name; 