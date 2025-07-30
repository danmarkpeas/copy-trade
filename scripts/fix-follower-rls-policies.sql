-- Fix RLS policies for followers table to allow authenticated users to access their followers

-- Enable RLS on followers table if not already enabled
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own followers" ON followers;
DROP POLICY IF EXISTS "Users can update their own followers" ON followers;
DROP POLICY IF EXISTS "Users can insert their own followers" ON followers;
DROP POLICY IF EXISTS "Users can delete their own followers" ON followers;

-- Create policy for users to view their own followers
CREATE POLICY "Users can view their own followers" ON followers
    FOR SELECT
    USING (
        auth.uid() = user_id OR 
        auth.uid() = subscribed_to OR
        user_id IS NULL
    );

-- Create policy for users to update their own followers
CREATE POLICY "Users can update their own followers" ON followers
    FOR UPDATE
    USING (
        auth.uid() = user_id OR 
        auth.uid() = subscribed_to OR
        user_id IS NULL
    );

-- Create policy for users to insert their own followers
CREATE POLICY "Users can insert their own followers" ON followers
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR 
        auth.uid() = subscribed_to OR
        user_id IS NULL
    );

-- Create policy for users to delete their own followers
CREATE POLICY "Users can delete their own followers" ON followers
    FOR DELETE
    USING (
        auth.uid() = user_id OR 
        auth.uid() = subscribed_to OR
        user_id IS NULL
    );

-- Also create a policy to allow access to followers with null user_id (for system followers)
CREATE POLICY "Allow access to system followers" ON followers
    FOR ALL
    USING (user_id IS NULL);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON followers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON followers TO anon; 