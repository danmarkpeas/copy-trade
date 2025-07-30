const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkUsersTable() {
  console.log('🔍 Checking Users Table and Foreign Key Constraints...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check 1: Look at the followers table structure
    console.log('🔍 Check 1: Followers table structure...');
    const { data: followersStructure, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .limit(0);

    if (followersError) {
      console.log('❌ Error accessing followers table:', followersError.message);
    } else {
      console.log('✅ Followers table accessible');
    }

    // Check 2: Look at the users table structure
    console.log('\n🔍 Check 2: Users table structure...');
    const { data: usersStructure, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(0);

    if (usersError) {
      console.log('❌ Error accessing users table:', usersError.message);
    } else {
      console.log('✅ Users table accessible');
    }

    // Check 3: Check if there are any users in the public.users table
    console.log('\n🔍 Check 3: Checking users in public.users table...');
    const { data: publicUsers, error: publicUsersError } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .limit(10);

    if (publicUsersError) {
      console.log('❌ Error getting public users:', publicUsersError.message);
    } else {
      console.log(`✅ Found ${publicUsers?.length || 0} users in public.users table:`);
      if (publicUsers && publicUsers.length > 0) {
        publicUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} (${user.id})`);
        });
      } else {
        console.log('   ❌ No users found in public.users table');
      }
    }

    // Check 4: Check auth.users table (if accessible)
    console.log('\n🔍 Check 4: Checking auth.users table...');
    try {
      const { data: authUsers, error: authUsersError } = await supabase
        .from('auth.users')
        .select('id, email, created_at')
        .limit(10);

      if (authUsersError) {
        console.log('❌ Error accessing auth.users:', authUsersError.message);
      } else {
        console.log(`✅ Found ${authUsers?.length || 0} users in auth.users table:`);
        if (authUsers && authUsers.length > 0) {
          authUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.email} (${user.id})`);
          });
        }
      }
    } catch (e) {
      console.log('❌ Cannot access auth.users table directly:', e.message);
    }

    // Check 5: Check the foreign key constraint
    console.log('\n🔍 Check 5: Checking foreign key constraint...');
    console.log('   The followers.subscribed_to field should reference users.id');
    console.log('   If users table is empty, this will cause foreign key constraint errors');

    // Check 6: Try to create a user record for testing
    console.log('\n🔍 Check 6: Testing user creation...');
    const testUserId = 'fdb32e0d-0778-4f76-b153-c72b8656ab47'; // danmarkpeas user ID
    
    // Check if this user exists in public.users
    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', testUserId)
      .single();

    if (existingUserError) {
      console.log('❌ Error checking existing user:', existingUserError.message);
    } else if (existingUser) {
      console.log('✅ User exists in public.users table:', existingUser.email);
    } else {
      console.log('❌ User does not exist in public.users table');
      console.log('   This is the cause of the foreign key constraint error');
      
      // Try to create the user record
      console.log('\n🔧 Attempting to create user record...');
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          id: testUserId,
          email: 'danmarkpeas@gmail.com',
          name: 'Danmark Peas',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createUserError) {
        console.log('❌ Error creating user record:', createUserError.message);
      } else {
        console.log('✅ User record created successfully:', newUser.email);
      }
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('   The foreign key constraint error occurs when:');
  console.log('   1. A user exists in auth.users but not in public.users');
  console.log('   2. The followers.subscribed_to field references public.users.id');
  console.log('   3. The referenced user ID does not exist in public.users');
  console.log('\n   Solution: Ensure all authenticated users have corresponding records in public.users table');
}

checkUsersTable().catch(console.error); 