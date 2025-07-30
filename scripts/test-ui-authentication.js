const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testUIAuthentication() {
  console.log('🔍 Testing UI Authentication Context...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Check if we can get user from session
    console.log('🔍 Test 1: Checking current session...');
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
    }

    // Test 2: Try to get user directly
    console.log('\n🔍 Test 2: Getting current user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ User error:', userError.message);
    } else if (user) {
      console.log('✅ User found:');
      console.log('   User ID:', user.id);
      console.log('   Email:', user.email);
    } else {
      console.log('❌ No user found');
    }

    // Test 3: Try to call the function with the user ID we found
    if (user) {
      console.log('\n🔍 Test 3: Testing function call with user ID...');
      
      const { data: functionResult, error: functionError } = await supabase.rpc('create_follower_account', {
        api_key: 'test_key',
        api_secret: 'test_secret',
        copy_mode: 'fixed lot',
        follower_name: 'Test Follower',
        lot_size: 0.01,
        master_broker_id: null,
        profile_id: null
      });

      if (functionError) {
        console.log('❌ Function error:', functionError.message);
      } else {
        console.log('✅ Function result:', functionResult);
      }
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testUIAuthentication().catch(console.error); 