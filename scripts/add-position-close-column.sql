-- Add copy_position_close column to followers table
ALTER TABLE followers 
ADD COLUMN IF NOT EXISTS copy_position_close BOOLEAN DEFAULT true;

-- Update existing followers to enable position closing
UPDATE followers 
SET copy_position_close = true 
WHERE copy_position_close IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN followers.copy_position_close IS 'Whether to automatically close follower positions when master closes positions'; 