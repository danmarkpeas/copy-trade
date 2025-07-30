-- Add verification_date column to broker_accounts table
-- This column is needed for tracking when broker accounts were verified

-- Add verification_date column if it doesn't exist
ALTER TABLE broker_accounts ADD COLUMN IF NOT EXISTS verification_date timestamptz;

-- Show current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'broker_accounts' 
ORDER BY ordinal_position;

-- Test the table structure
SELECT 'verification_date column added to broker_accounts table' as status; 