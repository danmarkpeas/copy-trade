const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function setupFollowerApiCredentials() {
  console.log('🔑 SETTING UP FOLLOWER API CREDENTIALS\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Get active followers
    console.log('📋 STEP 1: Getting Active Followers');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log(`✅ Found ${followers.length} active followers:`);
    followers.forEach((follower, index) => {
      console.log(`   ${index + 1}. ${follower.follower_name} (${follower.copy_mode})`);
      console.log(`      API Key: ${follower.api_key ? '✅ Set' : '❌ Missing'}`);
      console.log(`      API Secret: ${follower.api_secret ? '✅ Set' : '❌ Missing'}`);
      console.log('');
    });

    // 2. Check current API credentials
    console.log('📋 STEP 2: Checking Current API Credentials');
    
    for (const follower of followers) {
      console.log(`\n🔍 Testing API credentials for ${follower.follower_name}:`);
      
      if (!follower.api_key || !follower.api_secret) {
        console.log(`   ❌ Missing API credentials for ${follower.follower_name}`);
        console.log('   💡 You need to add valid Delta Exchange API credentials');
        continue;
      }

      // Test the API credentials
      const testResult = await testDeltaApiCredentials(follower.api_key, follower.api_secret);
      
      if (testResult.success) {
        console.log(`   ✅ API credentials are valid for ${follower.follower_name}`);
        console.log(`   📊 Account info: ${testResult.account_info || 'N/A'}`);
      } else {
        console.log(`   ❌ API credentials are invalid for ${follower.follower_name}`);
        console.log(`   🔍 Error: ${testResult.error}`);
        console.log('   💡 You need to update the API credentials');
      }
    }

    // 3. Instructions for setting up API credentials
    console.log('\n📋 STEP 3: Instructions for Setting Up API Credentials');
    console.log('\n🔧 TO SET UP DELTA EXCHANGE API CREDENTIALS:');
    console.log('1. Go to https://www.delta.exchange/');
    console.log('2. Log in to your Delta Exchange account');
    console.log('3. Go to Settings → API Keys');
    console.log('4. Create a new API key with the following permissions:');
    console.log('   ✅ Read permissions (for account info)');
    console.log('   ✅ Trade permissions (for placing orders)');
    console.log('   ✅ Position permissions (for managing positions)');
    console.log('5. Copy the API Key and API Secret');
    console.log('6. Update the follower account with these credentials');

    // 4. Show how to update credentials
    console.log('\n📋 STEP 4: How to Update Follower Credentials');
    console.log('\n💻 TO UPDATE FOLLOWER CREDENTIALS:');
    console.log('1. Open your database or use the Supabase dashboard');
    console.log('2. Go to the "followers" table');
    console.log('3. Find the follower account you want to update');
    console.log('4. Update the "api_key" and "api_secret" fields');
    console.log('5. Save the changes');

    // 5. Alternative: Create a new follower with proper credentials
    console.log('\n📋 STEP 5: Alternative - Create New Follower with Credentials');
    console.log('\n🆕 TO CREATE A NEW FOLLOWER WITH CREDENTIALS:');
    console.log('1. Get your Delta Exchange API credentials (see step 3)');
    console.log('2. Run the following SQL command:');
    console.log(`
INSERT INTO followers (
  user_id,
  follower_name,
  master_broker_account_id,
  account_status,
  copy_mode,
  copy_ratio,
  api_key,
  api_secret,
  is_active
) VALUES (
  'your-user-id-here',
  'Your Follower Name',
  'master-broker-account-id-here',
  'active',
  'multiplier',
  0.1,
  'your-delta-api-key-here',
  'your-delta-api-secret-here',
  true
);
    `);

    // 6. Test script for new credentials
    console.log('\n📋 STEP 6: Test Your New Credentials');
    console.log('\n🧪 TO TEST NEW CREDENTIALS:');
    console.log('1. Update the follower with new API credentials');
    console.log('2. Run: node scripts/test-follower-credentials.js');
    console.log('3. If successful, run: node scripts/execute-real-orders.js');

    console.log('\n💡 IMPORTANT NOTES:');
    console.log('• Each follower needs their own Delta Exchange account');
    console.log('• Each follower needs their own API credentials');
    console.log('• API credentials must have trading permissions');
    console.log('• Never share API credentials publicly');
    console.log('• Test credentials before using them for real trading');

    console.log('\n🔧 SYSTEM STATUS:');
    console.log('✅ Follower API credential setup guide completed');
    console.log('✅ Ready to configure real order execution');
    console.log('✅ Copy trading system will work once credentials are set');

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Set up Delta Exchange API credentials for your follower account');
    console.log('2. Test the credentials using the test script');
    console.log('3. Run the real order execution script');
    console.log('4. Check your Delta Exchange account for executed orders');

  } catch (error) {
    console.log('❌ Error setting up follower API credentials:', error.message);
  }
}

// Function to test Delta Exchange API credentials
async function testDeltaApiCredentials(apiKey, apiSecret) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/wallet/balances';
    const message = `GET${timestamp}${path}`;
    const signature = require('crypto').createHmac('sha256', apiSecret).update(message).digest('hex');

    const response = await fetch('https://api.delta.exchange/v2/wallet/balances', {
      method: 'GET',
      headers: {
        'api-key': apiKey,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        account_info: `Balance check successful (${data.result?.length || 0} currencies)`
      };
    } else {
      return {
        success: false,
        error: data.error?.message || data.error || 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

setupFollowerApiCredentials().catch(console.error); 