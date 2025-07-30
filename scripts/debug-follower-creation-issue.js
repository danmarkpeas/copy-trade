const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugFollowerCreationIssue() {
  console.log('🔍 Debugging Follower Creation Issue\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing required environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get the danmarkpeas@gmail.com user
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'danmarkpeas@gmail.com');

    if (usersError || !users || users.length === 0) {
      console.log('❌ User danmarkpeas@gmail.com not found');
      return;
    }

    const user = users[0];
    console.log('✅ Using user:', user.email);
    console.log('   User ID:', user.id);
    console.log('');

    // Check all followers in the database
    console.log('🔍 Checking all followers in database...');
    const { data: allFollowers, error: allFollowersError } = await supabase
      .from('followers')
      .select('*')
      .order('created_at', { ascending: false });

    if (allFollowersError) {
      console.log('❌ Error getting all followers:', allFollowersError.message);
    } else {
      console.log(`✅ Found ${allFollowers?.length || 0} total followers:`);
      allFollowers?.forEach((follower, index) => {
        console.log(`   ${index + 1}. ID: ${follower.id}`);
        console.log(`      Name: ${follower.follower_name}`);
        console.log(`      Subscribed to: ${follower.subscribed_to}`);
        console.log(`      User ID: ${follower.user_id}`);
        console.log(`      Status: ${follower.account_status}`);
        console.log(`      Created: ${follower.created_at}`);
      });
    }
    console.log('');

    // Check followers specifically for danmarkpeas user
    console.log('🔍 Checking followers for danmarkpeas user...');
    const { data: userFollowers, error: userFollowersError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', user.id);

    if (userFollowersError) {
      console.log('❌ Error getting user followers:', userFollowersError.message);
    } else {
      console.log(`✅ Found ${userFollowers?.length || 0} followers for danmarkpeas user`);
      if (userFollowers && userFollowers.length > 0) {
        userFollowers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name} (${follower.account_status})`);
        });
      }
    }
    console.log('');

    // Test the function again and check what happens
    console.log('🧪 Testing create_follower_account function again...');
    
    const { data: result, error } = await supabase
      .rpc('create_follower_account', {
        api_key: 'test_api_key_debug_2',
        api_secret: 'test_api_secret_debug_2',
        copy_mode: 'multiplier',
        follower_name: 'Debug Test Follower 2',
        lot_size: 0.01,
        master_broker_id: 'f1bff339-23e2-4763-9aad-a3a02d18cf22',
        profile_id: null
      });

    console.log('📊 Function Result:');
    console.log('   Success:', result?.success);
    console.log('   Error:', result?.error);
    console.log('   Message:', result?.message);
    console.log('   Follower ID:', result?.follower_id);
    console.log('   Master Broker ID:', result?.master_broker_id);
    console.log('   Profile ID:', result?.profile_id);

    if (error) {
      console.log('❌ Function call error:', error.message);
    }
    console.log('');

    // Check if the new follower was actually created
    if (result?.success && result?.follower_id) {
      console.log('🔍 Checking if the new follower was created...');
      
      const { data: newFollower, error: newFollowerError } = await supabase
        .from('followers')
        .select('*')
        .eq('id', result.follower_id);

      if (newFollowerError) {
        console.log('❌ Error checking new follower:', newFollowerError.message);
      } else if (newFollower && newFollower.length > 0) {
        const follower = newFollower[0];
        console.log('✅ New follower found:');
        console.log(`   ID: ${follower.id}`);
        console.log(`   Name: ${follower.follower_name}`);
        console.log(`   Subscribed to: ${follower.subscribed_to}`);
        console.log(`   User ID: ${follower.user_id}`);
        console.log(`   Status: ${follower.account_status}`);
        console.log(`   Created: ${follower.created_at}`);
        
        // Check if subscribed_to matches the user
        if (follower.subscribed_to === user.id) {
          console.log('✅ subscribed_to matches user ID correctly');
        } else {
          console.log('❌ subscribed_to does not match user ID!');
          console.log(`   Expected: ${user.id}`);
          console.log(`   Actual: ${follower.subscribed_to}`);
        }
      } else {
        console.log('❌ New follower not found in database');
      }
    }
    console.log('');

    // Check the function definition to see what it's doing
    console.log('🔍 Checking function definition...');
    try {
      const { data: functionDef, error: functionDefError } = await supabase
        .rpc('exec_sql', {
          sql_query: `
            SELECT 
              p.proname as function_name,
              pg_get_functiondef(p.oid) as function_definition
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = 'create_follower_account'
          `
        });

      if (functionDefError) {
        console.log('⚠️  Could not check function definition (exec_sql not available)');
      } else {
        console.log('📋 Function definition found');
        console.log(functionDef);
      }
    } catch (e) {
      console.log('⚠️  Could not check function definition:', e.message);
    }

    console.log('');
    console.log('📋 Summary:');
    console.log(`   - Total followers in database: ${allFollowers?.length || 0}`);
    console.log(`   - Followers for danmarkpeas user: ${userFollowers?.length || 0}`);
    console.log(`   - Function returned success: ${result?.success ? 'Yes' : 'No'}`);
    console.log(`   - New follower ID: ${result?.follower_id || 'None'}`);

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

debugFollowerCreationIssue().catch(console.error); 