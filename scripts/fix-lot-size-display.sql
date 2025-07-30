-- Fix lot size display issue
-- Run this in your Supabase SQL Editor

-- First, let's check what's actually in the followers table
SELECT 
    id,
    follower_name,
    copy_mode,
    lot_size,
    multiplier,
    created_at
FROM followers
ORDER BY created_at DESC;

-- Check if lot_size column exists and its data type
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'followers' 
    AND column_name IN ('lot_size', 'multiplier');

-- Update the function to handle lot_size display better
DROP FUNCTION IF EXISTS get_user_follower_accounts_with_trader_info(uuid);

CREATE OR REPLACE FUNCTION get_user_follower_accounts_with_trader_info(user_uuid uuid)
RETURNS TABLE (
    id uuid,
    follower_name text,
    master_broker_name text,
    master_account_name text,
    trader_name text,
    copy_mode text,
    lot_size numeric,
    account_status text,
    is_verified boolean,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        COALESCE(f.follower_name, '') as follower_name,
        COALESCE(ba.broker_name, '') as master_broker_name,
        COALESCE(ba.account_name, '') as master_account_name,
        COALESCE(u.name, '') as trader_name,
        COALESCE(f.copy_mode, '') as copy_mode,
        CASE 
            WHEN f.copy_mode = 'fixed lot' THEN COALESCE(f.lot_size, 0)
            WHEN f.copy_mode = 'multiplier' THEN COALESCE(f.multiplier, 0)
            ELSE 0
        END as lot_size,
        COALESCE(f.account_status, '') as account_status,
        COALESCE(f.is_verified, false) as is_verified,
        COALESCE(f.created_at, now()) as created_at
    FROM followers f
    LEFT JOIN broker_accounts ba ON f.master_broker_account_id = ba.id
    LEFT JOIN users u ON ba.user_id = u.id
    WHERE (f.user_id = user_uuid OR f.id = user_uuid)
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql; 