const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.log('Please set the environment variable and try again');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fixed signature generation function
function createDeltaSignature(method, path, body, timestamp, secret) {
  // Delta Exchange expects: timestamp + method + path + body
  const message = timestamp.toString() + method + path + body;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

// Dynamic UUID fetching functions
async function getUsersFromDatabase() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('❌ Error fetching users:', error.message);
      return [];
    }

    return users || [];
  } catch (error) {
    console.log('❌ Error in getUsersFromDatabase:', error.message);
    return [];
  }
}

async function getBrokerAccountsFromDatabase() {
  try {
    const { data: brokerAccounts, error } = await supabase
      .from('broker_accounts')
      .select('id, user_id, broker_name, account_name, api_key, api_secret, is_active, is_verified')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('❌ Error fetching broker accounts:', error.message);
      return [];
    }

    return brokerAccounts || [];
  } catch (error) {
    console.log('❌ Error in getBrokerAccountsFromDatabase:', error.message);
    return [];
  }
}

async function getFollowersFromDatabase() {
  try {
    const { data: followers, error } = await supabase
      .from('followers')
      .select('id, subscribed_to, follower_name, copy_mode, lot_size, account_status, master_broker_account_id')
      .eq('account_status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('❌ Error fetching followers:', error.message);
      return [];
    }

    return followers || [];
  } catch (error) {
    console.log('❌ Error in getFollowersFromDatabase:', error.message);
    return [];
  }
}

async function createDynamicFollower(apiKey, apiSecret, copyMode, followerName, lotSize, userId) {
  try {
    // Get the user's broker account
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (brokerError || !brokerAccount) {
      return {
        success: false,
        error: 'No active broker account found for user'
      };
    }

    // Create the follower
    const { data: newFollower, error: createError } = await supabase
      .from('followers')
      .insert({
        subscribed_to: userId,
        capital_allocated: 1000,
        risk_level: 'medium',
        copy_mode: copyMode,
        follower_name: followerName,
        lot_size: lotSize,
        master_broker_account_id: brokerAccount.id,
        api_key: apiKey,
        api_secret: apiSecret,
        account_status: 'active',
        is_verified: true
      })
      .select()
      .single();

    if (createError) {
      return {
        success: false,
        error: createError.message
      };
    }

    return {
      success: true,
      follower: newFollower,
      message: 'Dynamic follower created successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testApiWithDynamicCredentials(brokerAccount) {
  try {
    const timestamp = Math.floor(Date.now() / 1000) + 5;
    const signature = createDeltaSignature('GET', '/v2/positions/margined', '', timestamp, brokerAccount.api_secret);
    
    console.log(`🔑 Testing API for broker: ${brokerAccount.account_name}`);
    console.log(`   User ID: ${brokerAccount.user_id}`);
    console.log(`   API Key: ${brokerAccount.api_key.substring(0, 10)}...`);
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Signature: ${signature.substring(0, 20)}...`);

    const response = await fetch('https://api.delta.exchange/v2/positions/margined', {
      method: 'GET',
      headers: {
        'api-key': brokerAccount.api_key,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ API call successful! Found ${data.result?.length || 0} positions`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ API call failed: ${response.status} - ${errorText.substring(0, 100)}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error testing API: ${error.message}`);
    return false;
  }
}

async function implementDynamicUUIDSystem() {
  console.log('🔄 IMPLEMENTING DYNAMIC UUID SYSTEM\n');
  console.log('📋 This system will fetch UUIDs from database instead of using hardcoded values\n');

  try {
    // Step 1: Fetch all users from database
    console.log('👥 STEP 1: Fetching Users from Database');
    console.log('========================================');
    const users = await getUsersFromDatabase();
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    console.log(`✅ Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email}) - ID: ${user.id}`);
    });
    console.log('');

    // Step 2: Fetch all broker accounts from database
    console.log('🏦 STEP 2: Fetching Broker Accounts from Database');
    console.log('=================================================');
    const brokerAccounts = await getBrokerAccountsFromDatabase();
    
    if (brokerAccounts.length === 0) {
      console.log('❌ No broker accounts found in database');
      return;
    }

    console.log(`✅ Found ${brokerAccounts.length} broker accounts:`);
    brokerAccounts.forEach((broker, index) => {
      console.log(`   ${index + 1}. ${broker.account_name} (${broker.broker_name})`);
      console.log(`      User ID: ${broker.user_id}`);
      console.log(`      Broker ID: ${broker.id}`);
      console.log(`      Active: ${broker.is_active}`);
      console.log(`      Verified: ${broker.is_verified}`);
    });
    console.log('');

    // Step 3: Fetch all followers from database
    console.log('👥 STEP 3: Fetching Followers from Database');
    console.log('===========================================');
    const followers = await getFollowersFromDatabase();
    
    console.log(`✅ Found ${followers.length} active followers:`);
    followers.forEach((follower, index) => {
      console.log(`   ${index + 1}. ${follower.follower_name}`);
      console.log(`      Subscribed to: ${follower.subscribed_to}`);
      console.log(`      Copy mode: ${follower.copy_mode}`);
      console.log(`      Lot size: ${follower.lot_size}`);
      console.log(`      Status: ${follower.account_status}`);
    });
    console.log('');

    // Step 4: Test API calls with dynamic credentials
    console.log('🧪 STEP 4: Testing API Calls with Dynamic Credentials');
    console.log('=====================================================');
    
    let successfulApiCalls = 0;
    for (const broker of brokerAccounts) {
      const success = await testApiWithDynamicCredentials(broker);
      if (success) successfulApiCalls++;
      console.log('');
    }

    console.log(`📊 API Test Results: ${successfulApiCalls}/${brokerAccounts.length} successful calls`);
    console.log('');

    // Step 5: Create a new dynamic follower
    console.log('➕ STEP 5: Creating Dynamic Follower');
    console.log('===================================');
    
    if (users.length > 0 && brokerAccounts.length > 0) {
      const testUser = users[0];
      const result = await createDynamicFollower(
        'test_dynamic_api_key',
        'test_dynamic_api_secret',
        'multiplier',
        'Dynamic Test Follower',
        0.01,
        testUser.id
      );

      if (result.success) {
        console.log('✅ Dynamic follower created successfully!');
        console.log(`   Follower ID: ${result.follower.id}`);
        console.log(`   Subscribed to: ${result.follower.subscribed_to}`);
        console.log(`   Copy mode: ${result.follower.copy_mode}`);
      } else {
        console.log('❌ Failed to create dynamic follower:', result.error);
      }
    }
    console.log('');

    // Step 6: Show dynamic system summary
    console.log('📊 DYNAMIC SYSTEM SUMMARY');
    console.log('=========================');
    console.log(`✅ Users: ${users.length} (dynamically fetched)`);
    console.log(`✅ Broker Accounts: ${brokerAccounts.length} (dynamically fetched)`);
    console.log(`✅ Followers: ${followers.length} (dynamically fetched)`);
    console.log(`✅ API Calls: ${successfulApiCalls}/${brokerAccounts.length} successful`);
    console.log('');
    console.log('🎯 Key Benefits:');
    console.log('   ✅ No hardcoded UUIDs');
    console.log('   ✅ All data fetched from database');
    console.log('   ✅ Dynamic user/broker/follower relationships');
    console.log('   ✅ Real-time data updates');
    console.log('   ✅ Scalable and maintainable');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

// Run the dynamic UUID system
implementDynamicUUIDSystem(); 