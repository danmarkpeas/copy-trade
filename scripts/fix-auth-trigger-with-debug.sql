-- Enhanced fix for authentication callback error with better name extraction
-- Run this in your Supabase SQL Editor

-- Drop the existing trigger first
drop trigger if exists on_auth_user_created on auth.users;

-- Drop the existing function
drop function if exists public.handle_new_user();

-- Create the enhanced function with better debugging and name extraction
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_name text;
  debug_info text;
begin
  -- Log the incoming data for debugging
  debug_info := 'User ID: ' || new.id || ', Email: ' || new.email;
  
  -- Extract name from user metadata with more comprehensive logic
  if new.raw_user_meta_data is not null then
    -- Try multiple name fields in order of preference
    if new.raw_user_meta_data ? 'name' and new.raw_user_meta_data->>'name' != '' then
      user_name := new.raw_user_meta_data->>'name';
      debug_info := debug_info || ', Found name: ' || user_name;
    elsif new.raw_user_meta_data ? 'full_name' and new.raw_user_meta_data->>'full_name' != '' then
      user_name := new.raw_user_meta_data->>'full_name';
      debug_info := debug_info || ', Found full_name: ' || user_name;
    elsif new.raw_user_meta_data ? 'given_name' then
      if new.raw_user_meta_data ? 'family_name' and new.raw_user_meta_data->>'family_name' != '' then
        user_name := (new.raw_user_meta_data->>'given_name') || ' ' || (new.raw_user_meta_data->>'family_name');
        debug_info := debug_info || ', Combined given_name + family_name: ' || user_name;
      elsif new.raw_user_meta_data->>'given_name' != '' then
        user_name := new.raw_user_meta_data->>'given_name';
        debug_info := debug_info || ', Found given_name: ' || user_name;
      end if;
    elsif new.raw_user_meta_data ? 'display_name' and new.raw_user_meta_data->>'display_name' != '' then
      user_name := new.raw_user_meta_data->>'display_name';
      debug_info := debug_info || ', Found display_name: ' || user_name;
    elsif new.raw_user_meta_data ? 'nickname' and new.raw_user_meta_data->>'nickname' != '' then
      user_name := new.raw_user_meta_data->>'nickname';
      debug_info := debug_info || ', Found nickname: ' || user_name;
    end if;
  end if;
  
  -- Fallback to email prefix if no name found
  if user_name is null or user_name = '' then
    user_name := split_part(new.email, '@', 1);
    debug_info := debug_info || ', Using email prefix: ' || user_name;
  end if;
  
  -- Log the debug information
  raise log 'handle_new_user trigger: %', debug_info;
  
  -- Use a DO block to handle potential errors gracefully
  begin
    insert into public.users (id, email, name, created_at)
    values (new.id, new.email, user_name, now());
    
    raise log 'Successfully inserted user: % with name: %', new.email, user_name;
  exception
    when unique_violation then
      -- User already exists, this is fine
      raise log 'User already exists: %', new.email;
      null;
    when others then
      -- Log the error but don't fail the auth process
      raise log 'Error in handle_new_user trigger for %: %', new.email, sqlerrm;
      null;
  end;
  return new;
end;
$$ language plpgsql security definer;

-- Recreate the trigger
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Add RLS policy to allow the trigger function to insert users
drop policy if exists "Allow trigger function to insert users" on public.users;
create policy "Allow trigger function to insert users"
  on public.users for insert
  with check (true);

-- Test the function with a sample user (if any exist)
-- This will help verify the logic works
DO $$
DECLARE
  test_user auth.users%ROWTYPE;
  test_name text;
BEGIN
  -- Get a sample user to test the logic
  SELECT * INTO test_user FROM auth.users WHERE raw_user_meta_data IS NOT NULL LIMIT 1;
  
  IF test_user.id IS NOT NULL THEN
    -- Test the name extraction logic
    IF test_user.raw_user_meta_data ? 'name' and test_user.raw_user_meta_data->>'name' != '' THEN
      test_name := test_user.raw_user_meta_data->>'name';
    ELSIF test_user.raw_user_meta_data ? 'full_name' and test_user.raw_user_meta_data->>'full_name' != '' THEN
      test_name := test_user.raw_user_meta_data->>'full_name';
    ELSIF test_user.raw_user_meta_data ? 'given_name' THEN
      IF test_user.raw_user_meta_data ? 'family_name' and test_user.raw_user_meta_data->>'family_name' != '' THEN
        test_name := (test_user.raw_user_meta_data->>'given_name') || ' ' || (test_user.raw_user_meta_data->>'family_name');
      ELSIF test_user.raw_user_meta_data->>'given_name' != '' THEN
        test_name := test_user.raw_user_meta_data->>'given_name';
      END IF;
    ELSE
      test_name := split_part(test_user.email, '@', 1);
    END IF;
    
    RAISE LOG 'Test user: %, Extracted name: %', test_user.email, test_name;
  END IF;
END $$;

-- Verify the function exists
select 
  routine_name, 
  routine_type, 
  security_type 
from information_schema.routines 
where routine_name = 'handle_new_user' 
and routine_schema = 'public';

-- Verify the trigger exists
select 
  trigger_name, 
  event_manipulation, 
  event_object_table 
from information_schema.triggers 
where trigger_name = 'on_auth_user_created'; 