-- Add copy_ratio column to followers table
ALTER TABLE followers ADD COLUMN IF NOT EXISTS copy_ratio DECIMAL(5,4) DEFAULT 0.1;

-- Update existing followers with copy_ratio
UPDATE followers 
SET copy_ratio = 0.1 
WHERE copy_ratio IS NULL AND copy_mode = 'multiplier';

-- Update followers with different copy modes
UPDATE followers 
SET copy_ratio = 1.0 
WHERE copy_ratio IS NULL AND copy_mode = 'copy';

-- Show the updated followers
SELECT 
  follower_name,
  copy_mode,
  copy_ratio,
  account_status
FROM followers; 