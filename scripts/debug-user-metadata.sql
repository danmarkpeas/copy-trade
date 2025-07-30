-- Debug script to check user metadata structure
-- Run this in your Supabase SQL Editor to see what data is available

-- Check the structure of auth.users table and recent user data
SELECT 
  id,
  email,
  raw_user_meta_data,
  raw_app_meta_data,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check what keys are available in raw_user_meta_data for recent users
SELECT 
  id,
  email,
  raw_user_meta_data,
  CASE 
    WHEN raw_user_meta_data ? 'name' THEN 'Has name'
    ELSE 'No name'
  END as has_name,
  CASE 
    WHEN raw_user_meta_data ? 'full_name' THEN 'Has full_name'
    ELSE 'No full_name'
  END as has_full_name,
  CASE 
    WHEN raw_user_meta_data ? 'given_name' THEN 'Has given_name'
    ELSE 'No given_name'
  END as has_given_name,
  CASE 
    WHEN raw_user_meta_data ? 'family_name' THEN 'Has family_name'
    ELSE 'No family_name'
  END as has_family_name,
  CASE 
    WHEN raw_user_meta_data ? 'picture' THEN 'Has picture'
    ELSE 'No picture'
  END as has_picture
FROM auth.users 
WHERE raw_user_meta_data IS NOT NULL
ORDER BY created_at DESC 
LIMIT 10;

-- Check what the actual values are for name-related fields
SELECT 
  id,
  email,
  raw_user_meta_data->>'name' as name_value,
  raw_user_meta_data->>'full_name' as full_name_value,
  raw_user_meta_data->>'given_name' as given_name_value,
  raw_user_meta_data->>'family_name' as family_name_value,
  raw_user_meta_data->>'picture' as picture_value
FROM auth.users 
WHERE raw_user_meta_data IS NOT NULL
ORDER BY created_at DESC 
LIMIT 5;

-- Check current users table state
SELECT 
  id,
  email,
  name,
  created_at
FROM public.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Test the name extraction logic on a sample user
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data,
  CASE 
    WHEN au.raw_user_meta_data ? 'name' THEN au.raw_user_meta_data->>'name'
    WHEN au.raw_user_meta_data ? 'full_name' THEN au.raw_user_meta_data->>'full_name'
    WHEN au.raw_user_meta_data ? 'given_name' AND au.raw_user_meta_data ? 'family_name' 
      THEN (au.raw_user_meta_data->>'given_name') || ' ' || (au.raw_user_meta_data->>'family_name')
    WHEN au.raw_user_meta_data ? 'given_name' THEN au.raw_user_meta_data->>'given_name'
    ELSE split_part(au.email, '@', 1)
  END as extracted_name
FROM auth.users au
ORDER BY au.created_at DESC 
LIMIT 5; 