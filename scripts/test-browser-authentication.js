const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testBrowserAuthentication() {
  console.log('🌐 Testing Browser Authentication Context...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Check if we can get any session
    console.log('🔍 Test 1: Checking for any session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Session error:', sessionError.message);
    } else if (session) {
      console.log('✅ Session found:');
      console.log('   User ID:', session.user.id);
      console.log('   Email:', session.user.email);
      console.log('   Access Token:', session.access_token ? 'Present' : 'Missing');
    } else {
      console.log('❌ No active session found');
      console.log('   This means the user is not logged in to the browser');
      console.log('   The user needs to:');
      console.log('   1. Go to http://localhost:3000/login');
      console.log('   2. Sign in with their account');
      console.log('   3. Then try creating a follower');
    }

    // Test 2: Try to get user
    console.log('\n🔍 Test 2: Getting current user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ User error:', userError.message);
    } else if (user) {
      console.log('✅ User found:');
      console.log('   User ID:', user.id);
      console.log('   Email:', user.email);
      
      // Test 3: Try the function with the authenticated user
      console.log('\n🔍 Test 3: Testing function with authenticated user...');
      
      const { data: functionResult, error: functionError } = await supabase.rpc('create_follower_account', {
        api_key: 'test_key',
        api_secret: 'test_secret',
        copy_mode: 'fixed lot',
        follower_name: 'Test Follower',
        lot_size: 0.01,
        master_broker_id: null,
        profile_id: null
      });

      console.log('📊 Function call result:');
      console.log('   Supabase error:', functionError);
      console.log('   Function data:', functionResult);
      
      if (functionError) {
        console.log('❌ Function call failed:', functionError.message);
      } else if (functionResult && functionResult.success) {
        console.log('✅ Function call successful!');
        console.log('   Follower ID:', functionResult.follower_id);
        console.log('   Message:', functionResult.message);
      } else {
        console.log('❌ Function returned failure:');
        console.log('   Error:', functionResult?.error);
        console.log('   Success:', functionResult?.success);
      }
    } else {
      console.log('❌ No user found');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }

  console.log('\n📋 Instructions for the user:');
  console.log('1. Make sure you are logged in to the application at http://localhost:3000');
  console.log('2. Check that you can see your dashboard and other authenticated pages');
  console.log('3. If you see "User not authenticated" errors, you need to log in first');
  console.log('4. After logging in, try creating a follower again');
}

testBrowserAuthentication().catch(console.error); 