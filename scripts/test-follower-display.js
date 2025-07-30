const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testFollowerDisplay() {
  console.log('🧪 Testing Follower Display Fix\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing required environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get the first user
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.log('❌ No users found');
      return;
    }

    const user = users[0];
    console.log('✅ Using user:', user.email);
    console.log('   User ID:', user.id);
    console.log('');

    // Check raw followers data
    console.log('🔍 Checking raw followers data...');
    const { data: rawFollowers, error: rawError } = await supabase
      .from('followers')
      .select('*')
      .order('created_at', { ascending: false });

    if (rawError) {
      console.log('❌ Error checking raw followers:', rawError.message);
    } else {
      console.log(`✅ Found ${rawFollowers?.length || 0} total followers in database`);
      if (rawFollowers && rawFollowers.length > 0) {
        rawFollowers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ID: ${follower.id}`);
          console.log(`      Name: ${follower.follower_name}`);
          console.log(`      Subscribed to: ${follower.subscribed_to}`);
          console.log(`      User ID: ${follower.user_id || 'NULL'}`);
          console.log(`      Account status: ${follower.account_status}`);
          console.log(`      Created: ${follower.created_at}`);
          console.log('');
        });
      }
    }

    // Test the fixed function
    console.log('🧪 Testing fixed get_user_follower_accounts_with_trader_info function...');
    const { data: functionResult, error: functionError } = await supabase
      .rpc('get_user_follower_accounts_with_trader_info', {
        user_uuid: user.id
      });

    if (functionError) {
      console.log('❌ Function error:', functionError.message);
    } else {
      console.log(`✅ Function returned ${functionResult?.length || 0} followers`);
      if (functionResult && functionResult.length > 0) {
        functionResult.forEach((follower, index) => {
          console.log(`   ${index + 1}. ID: ${follower.id}`);
          console.log(`      Name: ${follower.follower_name}`);
          console.log(`      Master broker: ${follower.master_broker_name}`);
          console.log(`      Master account: ${follower.master_account_name}`);
          console.log(`      Trader: ${follower.trader_name}`);
          console.log(`      Copy mode: ${follower.copy_mode}`);
          console.log(`      Lot size: ${follower.lot_size}`);
          console.log(`      Account status: ${follower.account_status}`);
          console.log(`      Is verified: ${follower.is_verified}`);
          console.log('');
        });
      } else {
        console.log('⚠️  No followers returned by function');
      }
    }

    // Check if there are followers that should be shown
    console.log('🔍 Checking for followers that should be visible...');
    const { data: shouldShowFollowers, error: shouldShowError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', user.id);

    if (shouldShowError) {
      console.log('❌ Error checking should-show followers:', shouldShowError.message);
    } else {
      console.log(`✅ Found ${shouldShowFollowers?.length || 0} followers with subscribed_to = ${user.id}`);
      if (shouldShowFollowers && shouldShowFollowers.length > 0) {
        shouldShowFollowers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name} (${follower.account_status})`);
        });
      }
    }

    console.log('');
    console.log('📋 Summary:');
    console.log(`   - Total followers in database: ${rawFollowers?.length || 0}`);
    console.log(`   - Followers with subscribed_to = user_id: ${shouldShowFollowers?.length || 0}`);
    console.log(`   - Followers returned by function: ${functionResult?.length || 0}`);
    
    if (shouldShowFollowers?.length > 0 && functionResult?.length === 0) {
      console.log('❌ ISSUE: Function should return followers but returns none');
    } else if (shouldShowFollowers?.length > 0 && functionResult?.length > 0) {
      console.log('✅ SUCCESS: Function is working correctly');
    } else if (shouldShowFollowers?.length === 0) {
      console.log('⚠️  No followers found for this user');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testFollowerDisplay().catch(console.error); 