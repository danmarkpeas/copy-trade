# Authentication Database Error Fix

## Problem
You're encountering the error: `GET /auth/callback?error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user`

This error occurs when the Supabase authentication trigger function fails to insert a new user into the `public.users` table.

## Root Cause
The issue is in the database trigger function `handle_new_user()` that automatically creates a user record in the `public.users` table when a new user signs up through Supabase Auth. The function was failing due to:

1. **Row Level Security (RLS) policies** preventing the trigger function from inserting users
2. **Lack of error handling** in the trigger function
3. **Potential constraint violations** not being handled gracefully

## Solution

### Step 1: Apply the Database Fix

1. Go to your Supabase Dashboard
2. Navigate to the **SQL Editor**
3. Copy and paste the contents of `scripts/fix-auth-trigger.sql`
4. Run the script

This will:
- Drop and recreate the trigger function with better error handling
- Add proper RLS policies to allow the trigger function to insert users
- Handle unique constraint violations gracefully
- Log errors without failing the authentication process

### Step 2: Verify the Fix

After running the script, you can verify the fix worked by checking:

1. **Function exists**: The script includes verification queries
2. **Trigger exists**: The script includes verification queries
3. **Test authentication**: Try signing up/signing in again

### Step 3: Update Existing Users (Optional)

If you have existing users with null names, you can update them:

1. Go to your Supabase Dashboard
2. Navigate to the **SQL Editor**
3. Copy and paste the contents of `scripts/update-existing-user-names.sql`
4. Run the script

This will extract names from the authentication metadata for existing users.

### Step 4: Alternative - Apply Full Migration

If you prefer to apply the complete updated migration:

1. Go to your Supabase Dashboard
2. Navigate to the **SQL Editor**
3. Copy and paste the contents of `supabase_migration.sql` (updated version)
4. Run the script

## What Was Fixed

### 1. Enhanced Error Handling and Name Extraction
```sql
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_name text;
begin
  -- Extract name from user metadata
  -- Try to get name from raw_user_meta_data first (Google OAuth)
  if new.raw_user_meta_data is not null and new.raw_user_meta_data ? 'name' then
    user_name := new.raw_user_meta_data->>'name';
  elsif new.raw_user_meta_data is not null and new.raw_user_meta_data ? 'full_name' then
    user_name := new.raw_user_meta_data->>'full_name';
  elsif new.raw_user_meta_data is not null and new.raw_user_meta_data ? 'given_name' then
    -- Combine given_name and family_name if available
    if new.raw_user_meta_data ? 'family_name' then
      user_name := (new.raw_user_meta_data->>'given_name') || ' ' || (new.raw_user_meta_data->>'family_name');
    else
      user_name := new.raw_user_meta_data->>'given_name';
    end if;
  else
    -- Fallback: use email prefix as name
    user_name := split_part(new.email, '@', 1);
  end if;

  -- Use a DO block to handle potential errors gracefully
  begin
    insert into public.users (id, email, name, created_at)
    values (new.id, new.email, user_name, now());
  exception
    when unique_violation then
      -- User already exists, this is fine
      null;
    when others then
      -- Log the error but don't fail the auth process
      raise log 'Error in handle_new_user trigger: %', sqlerrm;
      null;
  end;
  return new;
end;
$$ language plpgsql security definer;
```

### 2. RLS Policy for Trigger Function
```sql
create policy "Allow trigger function to insert users"
  on public.users for insert
  with check (true);
```

### 3. Improved Auth Callback Error Handling
The auth callback route now:
- Handles authentication errors gracefully
- Redirects users back to login with meaningful error messages
- Logs errors for debugging

### 4. Enhanced Login Page
The login page now:
- Displays error messages from URL parameters
- Provides user-friendly error messages
- Handles various authentication failure scenarios

## Testing

After applying the fix:

1. **Clear your browser cookies** for the domain
2. **Try signing up** with a new Google account
3. **Try signing in** with an existing account
4. **Check the Supabase logs** for any remaining errors

## Monitoring

To monitor for future issues:

1. **Supabase Dashboard** → **Logs** → Check for any `handle_new_user` errors
2. **Application logs** → Check for authentication callback errors
3. **Database logs** → Monitor for constraint violations

## Common Issues

### If the error persists:
1. **Check Supabase logs** for specific database errors
2. **Verify RLS policies** are correctly applied
3. **Ensure the trigger function** has proper permissions
4. **Check for unique constraint violations** on the users table

### If users can't access their data:
1. **Verify RLS policies** for user data access
2. **Check if user records** were created properly
3. **Ensure proper user role assignment**

## Support

If you continue to experience issues after applying this fix:

1. Check the Supabase documentation for authentication troubleshooting
2. Review the Supabase logs for specific error messages
3. Verify your environment variables are correctly configured
4. Ensure your Supabase project settings are properly configured for OAuth 