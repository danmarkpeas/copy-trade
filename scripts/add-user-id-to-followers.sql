-- Add user_id column to followers table
-- This is needed for the enhanced follower system

-- Add user_id column if it doesn't exist
ALTER TABLE public.followers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE;

-- If the table has an 'id' column that references users(id), we can copy that to user_id
-- This handles the case where the old table structure used 'id' as the user reference
DO $$
BEGIN
  -- Check if the id column references users(id) and user_id is NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'followers' 
    AND constraint_name LIKE '%id%' 
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Update user_id from id where user_id is NULL
    UPDATE public.followers 
    SET user_id = id 
    WHERE user_id IS NULL AND id IS NOT NULL;
  END IF;
END $$;

-- Show current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'followers' 
ORDER BY ordinal_position;

-- Test the function
SELECT 'user_id column added to followers table' as status; 