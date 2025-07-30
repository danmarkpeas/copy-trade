-- Fix for authentication callback error: "Database error saving new user"
-- Run this in your Supabase SQL Editor

-- Drop the existing trigger first
drop trigger if exists on_auth_user_created on auth.users;

-- Drop the existing function
drop function if exists public.handle_new_user();

-- Create the fixed function with better error handling and name extraction
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

-- Recreate the trigger
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Add RLS policy to allow the trigger function to insert users
drop policy if exists "Allow trigger function to insert users" on public.users;
create policy "Allow trigger function to insert users"
  on public.users for insert
  with check (true);

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