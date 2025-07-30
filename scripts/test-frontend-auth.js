const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testFrontendAuth() {
  console.log('🔍 TESTING FRONTEND AUTHENTICATION');
  console.log('==================================\n');

  // Create frontend client (same as frontend uses)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test getting current user
    console.log('🔍 Testing getUser()...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ getUser() error:', userError);
    } else if (user) {
      console.log('✅ getUser() success:', user.email);
    } else {
      console.log('❌ getUser() returned no user');
    }

    // Test getting session
    console.log('\n🔍 Testing getSession()...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ getSession() error:', sessionError);
    } else if (session?.user) {
      console.log('✅ getSession() success:', session.user.email);
    } else {
      console.log('❌ getSession() returned no session');
    }

    // Test listing all users to see what's available
    console.log('\n🔍 Testing direct user query...');
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, email, name');

    if (allUsersError) {
      console.log('❌ Error fetching users:', allUsersError);
    } else {
      console.log(`✅ Found ${allUsers?.length || 0} users in database:`);
      allUsers?.forEach(user => {
        console.log(`   - ${user.email} (${user.id})`);
      });
    }

    // Test followers query with specific user ID
    console.log('\n🔍 Testing followers query with gauravcrd@gmail.com...');
    const { data: gauravUser, error: gauravError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'gauravcrd@gmail.com')
      .single();

    if (gauravError) {
      console.log('❌ Error fetching gauravcrd@gmail.com:', gauravError);
    } else if (gauravUser) {
      console.log('✅ Found gauravcrd@gmail.com:', gauravUser.id);
      
      // Test followers query
      const { data: followers, error: followersError } = await supabase
        .from('followers')
        .select('id, follower_name, user_id')
        .eq('user_id', gauravUser.id);

      if (followersError) {
        console.log('❌ Error fetching followers:', followersError);
      } else {
        console.log(`✅ Found ${followers?.length || 0} followers for gauravcrd@gmail.com`);
        followers?.forEach(follower => {
          console.log(`   - ${follower.follower_name} (${follower.id})`);
        });
      }
    }

    console.log('\n🎯 DIAGNOSIS:');
    console.log('=============');
    
    if (!user && !session?.user) {
      console.log('❌ No authenticated user found');
      console.log('🔧 SOLUTION: User needs to login to frontend');
    } else {
      const currentUser = user || session?.user;
      console.log(`✅ Authenticated user: ${currentUser.email}`);
      
      if (currentUser.email === 'gauravcrd@gmail.com') {
        console.log('✅ Correct user authenticated');
        console.log('🔧 The followers should be visible');
      } else {
        console.log('⚠️  Wrong user authenticated');
        console.log('🔧 SOLUTION: Login with gauravcrd@gmail.com');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFrontendAuth(); 