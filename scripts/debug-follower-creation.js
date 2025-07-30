const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugFollowerCreation() {
  console.log('🔍 Debugging Follower Creation Issue\n');

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

    // Check current followers count
    console.log('🔍 Checking current followers...');
    const { data: currentFollowers, error: currentError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', user.id);

    if (currentError) {
      console.log('❌ Error checking current followers:', currentError.message);
    } else {
      console.log(`✅ Current followers count: ${currentFollowers?.length || 0}`);
    }
    console.log('');

    // Test the create_follower_account function with detailed logging
    console.log('🧪 Testing create_follower_account function...');
    
    try {
      const { data: result, error } = await supabase
        .rpc('create_follower_account', {
          api_key: 'test_api_key_debug',
          api_secret: 'test_api_secret_debug',
          copy_mode: 'multiplier',
          follower_name: 'Debug Test Follower',
          lot_size: 0.01,
          master_broker_id: brokerAccount.id,
          profile_id: null
        });

      console.log('📊 Function Result:');
      console.log('   Success:', result?.success);
      console.log('   Error:', result?.error);
      console.log('   Details:', result?.details);
      console.log('   Follower ID:', result?.follower_id);
      console.log('   Message:', result?.message);
      console.log('');

      if (error) {
        console.log('❌ Function call error:', error.message);
        console.log('   Code:', error.code);
        console.log('   Details:', error.details);
        console.log('   Hint:', error.hint);
      }
    } catch (funcError) {
      console.log('❌ Function exception:', funcError.message);
    }
    console.log('');

    // Check followers count after function call
    console.log('🔍 Checking followers after function call...');
    const { data: afterFollowers, error: afterError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', user.id);

    if (afterError) {
      console.log('❌ Error checking after followers:', afterError.message);
    } else {
      console.log(`✅ Followers count after function: ${afterFollowers?.length || 0}`);
      
      if (afterFollowers && afterFollowers.length > 0) {
        console.log('📋 Recent followers:');
        afterFollowers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ID: ${follower.id}`);
          console.log(`      Name: ${follower.follower_name}`);
          console.log(`      Copy mode: ${follower.copy_mode}`);
          console.log(`      Status: ${follower.account_status}`);
          console.log(`      Created: ${follower.created_at}`);
        });
      }
    }
    console.log('');

    // Check if there are any database constraints or triggers
    console.log('🔍 Checking for database constraints...');
    try {
      const { data: constraints, error: constraintError } = await supabase
        .rpc('exec_sql', {
          sql_query: `
            SELECT 
              tc.constraint_name,
              tc.constraint_type,
              kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'followers'
          `
        });

      if (constraintError) {
        console.log('⚠️  Could not check constraints (exec_sql not available)');
      } else {
        console.log('📋 Database constraints on followers table:');
        console.log(constraints);
      }
    } catch (e) {
      console.log('⚠️  Could not check constraints:', e.message);
    }
    console.log('');

    // Try to create follower directly to see if it works
    console.log('🧪 Testing direct follower creation...');
    try {
      const directFollowerData = {
        id: crypto.randomUUID(),
        subscribed_to: user.id,
        capital_allocated: 1000,
        risk_level: 'medium',
        copy_mode: 'multiplier',
        follower_name: 'Direct Test Follower',
        lot_size: 0.01,
        master_broker_account_id: brokerAccount.id,
        profile_id: null,
        api_key: 'direct_test_key',
        api_secret: 'direct_test_secret',
        account_status: 'active',
        is_verified: true,
        created_at: new Date().toISOString()
      };

      const { data: directResult, error: directError } = await supabase
        .from('followers')
        .insert(directFollowerData)
        .select();

      if (directError) {
        console.log('❌ Direct creation error:', directError.message);
        console.log('   Code:', directError.code);
        console.log('   Details:', directError.details);
        console.log('   Hint:', directError.hint);
      } else {
        console.log('✅ Direct creation successful!');
        console.log('   Follower ID:', directResult[0].id);
        console.log('   Name:', directResult[0].follower_name);
      }
    } catch (directException) {
      console.log('❌ Direct creation exception:', directException.message);
    }

    console.log('');
    console.log('📋 Summary:');
    console.log(`   - Initial followers: ${currentFollowers?.length || 0}`);
    console.log(`   - After function call: ${afterFollowers?.length || 0}`);
    console.log(`   - Function appeared to succeed: ${result?.success ? 'Yes' : 'No'}`);
    console.log(`   - Direct creation: ${directError ? 'Failed' : 'Succeeded'}`);

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

debugFollowerCreation().catch(console.error); 