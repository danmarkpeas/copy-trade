const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function quickFollowerFix() {
  console.log('🔧 Quick Fix for Followers Issue\n');

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

    // Get broker account
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    const brokerAccount = brokerAccounts[0];
    console.log('✅ Using broker account:', brokerAccount.account_name);
    console.log('   Broker ID:', brokerAccount.id);
    console.log('');

    // Check all existing followers
    console.log('🔍 Checking existing followers...');
    const { data: allFollowers, error: allError } = await supabase
      .from('followers')
      .select('*');

    if (allError) {
      console.log('❌ Error fetching followers:', allError.message);
      return;
    }

    console.log(`✅ Found ${allFollowers?.length || 0} total followers`);
    if (allFollowers && allFollowers.length > 0) {
      allFollowers.forEach((follower, index) => {
        console.log(`   ${index + 1}. ID: ${follower.id}, Subscribed to: ${follower.subscribed_to}, Status: ${follower.account_status}`);
      });
    }
    console.log('');

    // Test the exact query that the edge function uses
    console.log('🧪 Testing Edge Function Query:');
    console.log('================================');
    console.log('Edge function is looking for:');
    console.log(`- subscribed_to = '${brokerAccount.id}' (broker account ID)`);
    console.log('- is_active = true');
    console.log('- sync_status = "active"');
    console.log('');

    const { data: edgeFollowers, error: edgeError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', brokerAccount.id)
      .eq('is_active', true)
      .eq('sync_status', 'active');

    if (edgeError) {
      console.log('❌ Edge function query failed:', edgeError.message);
      console.log('💡 This is the root cause of the issue!');
    } else {
      console.log(`✅ Edge function query found ${edgeFollowers?.length || 0} followers`);
    }
    console.log('');

    // Test what the query should be
    console.log('🧪 Testing Correct Query:');
    console.log('=========================');
    console.log('Should be looking for:');
    console.log(`- subscribed_to = '${user.id}' (trader/user ID)`);
    console.log('- account_status = "active"');
    console.log('');

    const { data: correctFollowers, error: correctError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', user.id)
      .eq('account_status', 'active');

    if (correctError) {
      console.log('❌ Correct query failed:', correctError.message);
    } else {
      console.log(`✅ Correct query found ${correctFollowers?.length || 0} followers`);
      if (correctFollowers && correctFollowers.length > 0) {
        console.log('   Follower details:', {
          id: correctFollowers[0].id,
          subscribed_to: correctFollowers[0].subscribed_to,
          copy_mode: correctFollowers[0].copy_mode,
          account_status: correctFollowers[0].account_status
        });
      }
    }
    console.log('');

    console.log('🎯 SUMMARY:');
    console.log('===========');
    console.log('✅ Follower records exist in the database');
    console.log('❌ Edge function is using wrong column names');
    console.log('❌ Edge function is looking for wrong subscribed_to value');
    console.log('');
    console.log('💡 The Issue:');
    console.log('=============');
    console.log('The edge function in supabase/functions/real-time-trade-monitor/index.ts');
    console.log('is looking for followers where:');
    console.log('- subscribed_to = broker_account_id (WRONG)');
    console.log('- is_active = true (COLUMN DOESN\'T EXIST)');
    console.log('- sync_status = "active" (COLUMN DOESN\'T EXIST)');
    console.log('');
    console.log('But it should be looking for:');
    console.log('- subscribed_to = trader_id (CORRECT)');
    console.log('- account_status = "active" (CORRECT COLUMN NAME)');
    console.log('');
    console.log('🚀 Quick Fix:');
    console.log('=============');
    console.log('1. Go to supabase/functions/real-time-trade-monitor/index.ts');
    console.log('2. Find the getActiveFollowers function (around line 205)');
    console.log('3. Change the query to use correct column names');
    console.log('4. Redeploy the edge function');
    console.log('');
    console.log('📝 The corrected query should be:');
    console.log('```');
    console.log('const { data: followers, error } = await supabase');
    console.log('  .from(\'followers\')');
    console.log('  .select(\'*\')');
    console.log('  .eq(\'subscribed_to\', traderId) // Use trader ID, not broker ID');
    console.log('  .eq(\'account_status\', \'active\') // Use account_status, not is_active');
    console.log('```');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

quickFollowerFix().catch(console.error); 