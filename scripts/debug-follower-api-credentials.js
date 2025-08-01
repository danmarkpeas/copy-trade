const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugFollowerApiCredentials() {
  console.log('🔍 DEBUGGING FOLLOWER API CREDENTIALS');
  console.log('=' .repeat(60));
  
  try {
    // 1. Check followers table structure
    console.log('1. Checking followers table structure...');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');
    
    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }
    
    console.log(`✅ Found ${followers.length} active followers:`);
    followers.forEach(follower => {
      console.log(`   - ${follower.follower_name} (${follower.user_id})`);
      console.log(`     Master Broker ID: ${follower.master_broker_account_id}`);
      console.log(`     API Key: ${follower.api_key ? '✅ Present' : '❌ Missing'}`);
      console.log(`     API Secret: ${follower.api_secret ? '✅ Present' : '❌ Missing'}`);
      console.log(`     Copy Mode: ${follower.copy_mode}`);
      console.log(`     Copy Ratio: ${follower.copy_ratio}`);
      console.log('');
    });
    
    // 2. Check broker accounts
    console.log('2. Checking broker accounts...');
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true);
    
    if (brokerError) {
      console.log('❌ Error fetching broker accounts:', brokerError);
      return;
    }
    
    console.log(`✅ Found ${brokerAccounts.length} active broker accounts:`);
    brokerAccounts.forEach(broker => {
      console.log(`   - ${broker.account_name} (${broker.id})`);
      console.log(`     API Key: ${broker.api_key ? '✅ Present' : '❌ Missing'}`);
      console.log(`     API Secret: ${broker.api_secret ? '✅ Present' : '❌ Missing'}`);
      console.log('');
    });
    
    // 3. Check if followers have their own API credentials
    console.log('3. Checking follower API credentials...');
    const followersWithApiKeys = followers.filter(f => f.api_key && f.api_secret);
    const followersWithoutApiKeys = followers.filter(f => !f.api_key || !f.api_secret);
    
    console.log(`✅ Followers with API keys: ${followersWithApiKeys.length}`);
    console.log(`❌ Followers without API keys: ${followersWithoutApiKeys.length}`);
    
    if (followersWithoutApiKeys.length > 0) {
      console.log('\n⚠️  FOLLOWERS MISSING API CREDENTIALS:');
      followersWithoutApiKeys.forEach(follower => {
        console.log(`   - ${follower.follower_name} (${follower.user_id})`);
        console.log(`     Missing: ${!follower.api_key ? 'API Key' : ''} ${!follower.api_secret ? 'API Secret' : ''}`);
      });
    }
    
    // 4. Summary and recommendations
    console.log('\n' + '=' .repeat(60));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(60));
    
    if (followersWithoutApiKeys.length > 0) {
      console.log('❌ ISSUE IDENTIFIED: Followers are missing API credentials');
      console.log('');
      console.log('🔧 ROOT CAUSE:');
      console.log('   - Followers are using master broker API credentials');
      console.log('   - This causes trade execution to fail');
      console.log('   - Each follower needs their own API key and secret');
      console.log('');
      console.log('🛠️  SOLUTION:');
      console.log('   1. Each follower needs to create their own Delta Exchange account');
      console.log('   2. Generate API key and secret for each follower');
      console.log('   3. Update the followers table with individual API credentials');
      console.log('   4. Modify the server to use follower-specific credentials');
      console.log('');
      console.log('📝 IMMEDIATE FIX:');
      console.log('   - Update followers table to include api_key and api_secret columns');
      console.log('   - Modify server.js to use follower API credentials instead of master');
      console.log('   - Test with one follower first');
    } else {
      console.log('✅ All followers have API credentials');
      console.log('   - The issue might be in the server configuration');
      console.log('   - Check if server.js is using the correct credentials');
    }
    
  } catch (error) {
    console.error('❌ Error in debug script:', error);
  }
}

// Run the debug script
debugFollowerApiCredentials().catch(console.error); 