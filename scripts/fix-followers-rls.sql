-- Fix RLS policy for followers table
-- Run this in your Supabase SQL Editor

-- First, let's see what RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'followers';

-- Enable RLS on followers table if not already enabled
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Allow insert for own followers" ON followers;
DROP POLICY IF EXISTS "Allow select own followers" ON followers;
DROP POLICY IF EXISTS "Allow update own followers" ON followers;
DROP POLICY IF EXISTS "Allow delete own followers" ON followers;

-- Create proper RLS policies for followers table

-- Policy for INSERT: Users can insert their own follower accounts
CREATE POLICY "Allow insert own followers" ON followers
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Policy for SELECT: Users can view their own follower accounts
CREATE POLICY "Allow select own followers" ON followers
    FOR SELECT 
    USING (user_id = auth.uid());

-- Policy for UPDATE: Users can update their own follower accounts
CREATE POLICY "Allow update own followers" ON followers
    FOR UPDATE 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy for DELETE: Users can delete their own follower accounts
CREATE POLICY "Allow delete own followers" ON followers
    FOR DELETE 
    USING (user_id = auth.uid());

-- Show the new policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'followers'
ORDER BY policyname; 