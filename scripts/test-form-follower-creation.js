const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testFormFollowerCreation() {
  console.log('🧪 Testing Form-Based Follower Creation (Exact Frontend Flow)\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseAnonKey) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Step 1: Check authentication (like frontend does)
    console.log('🔍 Step 1: Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Authentication error:', authError.message);
      console.log('   This explains why the function returns "User not authenticated"');
      return;
    }

    if (!user) {
      console.log('❌ No authenticated user found');
      console.log('   The user needs to be logged in to create followers');
      return;
    }

    console.log('✅ User authenticated:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);

    // Step 2: Get broker accounts (like frontend does)
    console.log('\n🔍 Step 2: Getting broker accounts...');
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select(`
        id,
        broker_name,
        account_name,
        is_verified,
        account_status,
        created_at,
        users(name)
      `)
      .eq('broker_name', 'delta')
      .eq('is_verified', true)
      .eq('account_status', 'active');

    if (brokerError) {
      console.log('❌ Error getting broker accounts:', brokerError.message);
      return;
    }

    console.log(`✅ Found ${brokerAccounts?.length || 0} broker accounts`);
    if (brokerAccounts && brokerAccounts.length > 0) {
      brokerAccounts.forEach((account, index) => {
        console.log(`   ${index + 1}. ${account.account_name} (${account.id})`);
      });
    } else {
      console.log('❌ No broker accounts found - cannot create follower');
      return;
    }

    const selectedBroker = brokerAccounts[0].id;

    // Step 3: Test API verification (like frontend does)
    console.log('\n🔍 Step 3: Testing API verification...');
    const verifyResponse = await fetch('http://localhost:3000/api/broker-account/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        broker_name: 'delta',
        api_key: 'test_key_123456789012345678901234',
        api_secret: 'test_secret_123456789012345678901234567890123456789012345678901234'
      })
    });

    const verifyResult = await verifyResponse.json();
    console.log('✅ API verification result:', verifyResult);

    if (!verifyResult.valid) {
      console.log('❌ API verification failed - cannot proceed');
      return;
    }

    // Step 4: Create follower account (like frontend does)
    console.log('\n🔍 Step 4: Creating follower account...');
    const { data: functionResult, error: functionError } = await supabase.rpc('create_follower_account', {
      follower_name: 'Test Follower from Script',
      master_broker_id: selectedBroker,
      profile_id: 'test_profile_123',
      api_key: 'test_key_123456789012345678901234',
      api_secret: 'test_secret_123456789012345678901234567890123456789012345678901234',
      copy_mode: 'fixed lot',
      lot_size: 0.01
    });

    console.log('📊 Function call result:');
    console.log('   Error from Supabase:', functionError);
    console.log('   Data returned:', functionResult);

    // Step 5: Check if follower was actually created
    console.log('\n🔍 Step 5: Verifying follower creation...');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', user.id);

    if (followersError) {
      console.log('❌ Error checking followers:', followersError.message);
    } else {
      console.log(`✅ Found ${followers?.length || 0} followers for user`);
      if (followers && followers.length > 0) {
        followers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name} (${follower.id})`);
        });
      }
    }

    // Step 6: Test with service role key to see if it works
    if (supabaseServiceKey) {
      console.log('\n🔍 Step 6: Testing with service role key...');
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: serviceResult, error: serviceError } = await serviceSupabase.rpc('create_follower_account', {
        follower_name: 'Test Follower with Service Key',
        master_broker_id: selectedBroker,
        profile_id: 'test_profile_service',
        api_key: 'test_key_service',
        api_secret: 'test_secret_service',
        copy_mode: 'multiplier',
        lot_size: 0.02
      });

      console.log('📊 Service key function result:');
      console.log('   Error:', serviceError);
      console.log('   Data:', serviceResult);
    }

    console.log('\n📋 Summary:');
    console.log(`   - User authenticated: ${user ? 'Yes' : 'No'}`);
    console.log(`   - Broker accounts found: ${brokerAccounts?.length || 0}`);
    console.log(`   - API verification: ${verifyResult.valid ? 'Success' : 'Failed'}`);
    console.log(`   - Function error: ${functionError ? 'Yes' : 'No'}`);
    console.log(`   - Function success: ${functionResult?.success ? 'Yes' : 'No'}`);
    console.log(`   - Followers in database: ${followers?.length || 0}`);

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testFormFollowerCreation().catch(console.error); 