-- Final verification script (Fixed)
-- Check if everything is working correctly

-- Check recent users and their names
SELECT 
  id,
  email,
  name,
  created_at,
  CASE 
    WHEN name IS NULL OR name = '' THEN 'MISSING NAME'
    ELSE 'HAS NAME'
  END as status
FROM public.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Overall statistics (Fixed ROUND function)
SELECT 
  COUNT(*) as total_users,
  COUNT(name) as users_with_names,
  COUNT(*) - COUNT(name) as users_without_names,
  ROUND((COUNT(name)::numeric / COUNT(*)) * 100, 2) as percentage_with_names
FROM public.users;

-- Check trigger function status
SELECT 
  'Trigger Function Status' as info,
  routine_name, 
  routine_type, 
  security_type 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
AND routine_schema = 'public';

-- Check trigger status
SELECT 
  'Trigger Status' as info,
  trigger_name, 
  event_manipulation, 
  event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check RLS policies
SELECT 
  'RLS Policy Status' as info,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'users' 
AND policyname = 'Allow trigger function to insert users'; 