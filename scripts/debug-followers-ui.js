const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugFollowersUI() {
  console.log('🔍 Debugging Followers UI Issue\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing required environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get all users to see what user IDs exist
    console.log('🔍 Checking all users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (usersError) {
      console.log('❌ Error getting users:', usersError.message);
    } else {
      console.log(`✅ Found ${users?.length || 0} users:`);
      users?.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Name: ${user.name}`);
      });
    }
    console.log('');

    // Get all followers to see the data
    console.log('🔍 Checking all followers...');
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

    // Test the function with different user IDs
    console.log('🧪 Testing function with different user IDs...');
    
    if (users && users.length > 0) {
      for (const user of users) {
        console.log(`Testing with user: ${user.email} (${user.id})`);
        
        const { data: functionResult, error: functionError } = await supabase
          .rpc('get_user_follower_accounts_with_trader_info', {
            user_uuid: user.id
          });

        if (functionError) {
          console.log(`   ❌ Error: ${functionError.message}`);
        } else {
          console.log(`   ✅ Found ${functionResult?.length || 0} followers`);
          if (functionResult && functionResult.length > 0) {
            functionResult.forEach((follower, index) => {
              console.log(`      ${index + 1}. ${follower.follower_name} (${follower.copy_mode})`);
            });
          }
        }
      }
    }
    console.log('');

    // Check if there are any followers with NULL subscribed_to
    console.log('🔍 Checking for followers with NULL subscribed_to...');
    const { data: nullFollowers, error: nullFollowersError } = await supabase
      .from('followers')
      .select('*')
      .is('subscribed_to', null);

    if (nullFollowersError) {
      console.log('❌ Error checking NULL followers:', nullFollowersError.message);
    } else {
      console.log(`✅ Found ${nullFollowers?.length || 0} followers with NULL subscribed_to`);
      nullFollowers?.forEach((follower, index) => {
        console.log(`   ${index + 1}. ${follower.follower_name} (ID: ${follower.id})`);
      });
    }
    console.log('');

    // Check if there are any followers with different user_id vs subscribed_to
    console.log('🔍 Checking for mismatched user_id vs subscribed_to...');
    const { data: mismatchedFollowers, error: mismatchedError } = await supabase
      .from('followers')
      .select('*')
      .not('user_id', 'is', null)
      .not('subscribed_to', 'is', null)
      .neq('user_id', 'subscribed_to');

    if (mismatchedError) {
      console.log('❌ Error checking mismatched followers:', mismatchedError.message);
    } else {
      console.log(`✅ Found ${mismatchedFollowers?.length || 0} followers with mismatched IDs`);
      mismatchedFollowers?.forEach((follower, index) => {
        console.log(`   ${index + 1}. ${follower.follower_name}`);
        console.log(`      user_id: ${follower.user_id}`);
        console.log(`      subscribed_to: ${follower.subscribed_to}`);
      });
    }
    console.log('');

    // Test the function with the service role key (like the UI would)
    console.log('🧪 Testing function with service role key...');
    
    // Simulate what the UI does - get the first user and test
    if (users && users.length > 0) {
      const testUser = users[0];
      console.log(`Testing with first user: ${testUser.email}`);
      
      const { data: uiResult, error: uiError } = await supabase
        .rpc('get_user_follower_accounts_with_trader_info', {
          user_uuid: testUser.id
        });

      if (uiError) {
        console.log(`❌ UI simulation error: ${uiError.message}`);
      } else {
        console.log(`✅ UI simulation found ${uiResult?.length || 0} followers`);
        if (uiResult && uiResult.length > 0) {
          uiResult.forEach((follower, index) => {
            console.log(`   ${index + 1}. ${follower.follower_name} (${follower.copy_mode})`);
          });
        }
      }
    }

    console.log('');
    console.log('📋 Summary:');
    console.log(`   - Total users: ${users?.length || 0}`);
    console.log(`   - Total followers: ${allFollowers?.length || 0}`);
    console.log(`   - Followers with NULL subscribed_to: ${nullFollowers?.length || 0}`);
    console.log(`   - Followers with mismatched IDs: ${mismatchedFollowers?.length || 0}`);

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

debugFollowersUI().catch(console.error); 