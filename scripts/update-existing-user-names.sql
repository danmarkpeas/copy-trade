-- Update existing users with null names
-- Run this in your Supabase SQL Editor after applying the trigger fix

-- Update users who have null names by extracting from auth.users metadata
UPDATE public.users 
SET name = COALESCE(
  -- Try to get name from raw_user_meta_data
  (SELECT 
    CASE 
      WHEN au.raw_user_meta_data ? 'name' THEN au.raw_user_meta_data->>'name'
      WHEN au.raw_user_meta_data ? 'full_name' THEN au.raw_user_meta_data->>'full_name'
      WHEN au.raw_user_meta_data ? 'given_name' AND au.raw_user_meta_data ? 'family_name' 
        THEN (au.raw_user_meta_data->>'given_name') || ' ' || (au.raw_user_meta_data->>'family_name')
      WHEN au.raw_user_meta_data ? 'given_name' THEN au.raw_user_meta_data->>'given_name'
      ELSE split_part(au.email, '@', 1)
    END
   FROM auth.users au 
   WHERE au.id = public.users.id),
  -- Fallback to email prefix
  split_part(email, '@', 1)
)
WHERE name IS NULL OR name = '';

-- Show the results
SELECT 
  id, 
  email, 
  name, 
  created_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Count how many users were updated
SELECT 
  COUNT(*) as total_users,
  COUNT(name) as users_with_names,
  COUNT(*) - COUNT(name) as users_without_names
FROM public.users; 