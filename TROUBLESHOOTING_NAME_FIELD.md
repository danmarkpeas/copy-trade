# Troubleshooting: Name Field Not Being Populated

## Problem
The `name` field in the `public.users` table is empty/null even after applying the authentication trigger fix.

## Step-by-Step Debugging

### Step 1: Run the Diagnostic Script
First, run the diagnostic script to see what data is actually available:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `scripts/debug-user-metadata.sql`
4. Run the script

This will show you:
- What user metadata is available in `auth.users`
- Which name-related fields exist
- What the actual values are
- Whether the name extraction logic works

### Step 2: Check the Trigger Function
Run the enhanced trigger function with debugging:

1. Copy and paste the contents of `scripts/fix-auth-trigger-with-debug.sql`
2. Run the script

This enhanced version includes:
- Detailed logging of what data is being processed
- More comprehensive name field checking
- Better error handling
- Test logic to verify the function works

### Step 3: Test Name Extraction Manually
Run the test script to manually verify the logic:

1. Copy and paste the contents of `scripts/test-name-extraction.sql`
2. Run the script

This will:
- Show you exactly what data is in your `auth.users` table
- Test the name extraction logic manually
- Show you if the trigger function is being called
- Provide detailed feedback on what's happening

## Common Issues and Solutions

### Issue 1: No User Metadata Available
**Symptoms**: `raw_user_meta_data` is null or empty
**Solution**: 
- Check your Google OAuth configuration in Supabase
- Ensure you're requesting the correct scopes (profile, email)
- Verify the OAuth provider is properly configured

### Issue 2: Different Metadata Structure
**Symptoms**: Name fields exist but with different names
**Solution**: 
- The enhanced trigger function now checks for: `name`, `full_name`, `given_name`, `family_name`, `display_name`, `nickname`
- If you find different field names, update the trigger function accordingly

### Issue 3: Trigger Function Not Being Called
**Symptoms**: No log entries from the trigger function
**Solution**:
- Verify the trigger exists: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';`
- Check if RLS policies are blocking the insert
- Ensure the function has proper permissions

### Issue 4: RLS Policies Blocking Insert
**Symptoms**: Authentication works but no user record is created
**Solution**:
- Verify the RLS policy exists: `SELECT * FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow trigger function to insert users';`
- The policy should allow inserts with `with check (true)`

## Debugging Commands

### Check Current Trigger Function
```sql
SELECT 
  routine_name, 
  routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
AND routine_schema = 'public';
```

### Check Trigger Exists
```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

### Check RLS Policies
```sql
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
WHERE tablename = 'users';
```

### Check Recent User Data
```sql
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check Public Users Table
```sql
SELECT 
  id,
  email,
  name,
  created_at
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;
```

## Testing the Fix

### Test with a New User
1. Clear your browser cookies
2. Sign up with a new Google account
3. Check the logs in Supabase Dashboard → Logs
4. Verify the user record was created with a name

### Test with Existing Users
1. Run the update script: `scripts/update-existing-user-names.sql`
2. Check if existing users now have names
3. Verify the extraction logic worked

## Expected Behavior

After applying the fix, you should see:

1. **Log entries** in Supabase Dashboard → Logs showing:
   - `handle_new_user trigger: User ID: ..., Email: ..., Found name: ...`
   - `Successfully inserted user: ... with name: ...`

2. **User records** in `public.users` table with:
   - `id` (UUID)
   - `email` (from Google)
   - `name` (extracted from Google profile)
   - `created_at` (timestamp)

3. **Name extraction** working for:
   - Full names from Google profile
   - Given name + family name combinations
   - Email prefix as fallback

## If Still Not Working

If the name field is still empty after following these steps:

1. **Check the logs** in Supabase Dashboard → Logs for any error messages
2. **Verify Google OAuth scopes** include `profile` and `email`
3. **Test with a different Google account** to see if it's account-specific
4. **Check if the trigger is actually being called** by looking for log entries
5. **Manually test the name extraction** using the test script

## Support

If you continue to have issues:
1. Share the output from the diagnostic scripts
2. Check the Supabase logs for specific error messages
3. Verify your Google OAuth configuration
4. Ensure your Supabase project settings are correct 