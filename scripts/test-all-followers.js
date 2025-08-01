const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Delta Exchange API functions with CORRECT timestamp format
function generateSignature(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

async function makeAuthenticatedRequest(apiKey, apiSecret, method, endpoint, payload = '', params = {}) {
  // Use seconds instead of milliseconds for timestamp
  const timestamp = Math.floor(Date.now() / 1000).toString();
          const message = method + timestamp + endpoint + payload;
  const signature = generateSignature(apiSecret, message);

            const url = `https://api.india.delta.exchange/v2${endpoint}`;
  const queryString = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
  const fullUrl = url + queryString;

  const headers = {
    'api-key': apiKey,
    'signature': signature,
    'timestamp': timestamp,
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(fullUrl, {
      method: method,
      headers: headers,
      body: payload ? payload : undefined
    });

    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { error: responseText };
    }
    
    return {
      status: response.status,
      data: data,
      success: response.ok,
      responseText: responseText
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      success: false,
      responseText: error.message
    };
  }
}

async function testFollowerAPI(follower) {
  console.log(`🧪 Testing ${follower.follower_name}...`);
  
  if (!follower.api_key || !follower.api_secret) {
    console.log(`   ❌ API credentials not set for ${follower.follower_name}`);
    return {
      name: follower.follower_name,
      status: 'NO_CREDENTIALS',
      working: false,
      error: 'API credentials not set'
    };
  }

  // Test wallet balances (most reliable endpoint)
  const balancesResult = await makeAuthenticatedRequest(
    follower.api_key,
    follower.api_secret,
    'GET',
    '/wallet/balances'
  );

  if (balancesResult.success) {
    console.log(`   ✅ ${follower.follower_name} API credentials working`);
    return {
      name: follower.follower_name,
      status: 'WORKING',
      working: true,
      error: null
    };
  } else {
    const errorCode = balancesResult.data.error?.code || 'unknown';
    console.log(`   ❌ ${follower.follower_name} API credentials failed: ${errorCode}`);
    return {
      name: follower.follower_name,
      status: 'FAILED',
      working: false,
      error: errorCode
    };
  }
}

async function testAllFollowers() {
  console.log('🧪 COMPREHENSIVE FOLLOWER API CREDENTIALS TEST');
  console.log('==============================================\n');

  try {
    // Get all active followers from database
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (error) {
      console.error('❌ Error fetching followers:', error);
      return;
    }

    if (!followers || followers.length === 0) {
      console.error('❌ No active followers found in database');
      return;
    }

    console.log(`📊 Found ${followers.length} active followers\n`);

    // Test each follower
    const results = [];
    for (const follower of followers) {
      const result = await testFollowerAPI(follower);
      results.push(result);
      console.log(''); // Add spacing between tests
    }

    // Summary
    console.log('🎯 COMPREHENSIVE TEST SUMMARY');
    console.log('=============================\n');

    const workingFollowers = results.filter(r => r.working);
    const failedFollowers = results.filter(r => !r.working);

    console.log(`📊 Total Followers: ${results.length}`);
    console.log(`✅ Working: ${workingFollowers.length}`);
    console.log(`❌ Failed: ${failedFollowers.length}`);
    console.log(`📈 Success Rate: ${((workingFollowers.length / results.length) * 100).toFixed(1)}%`);
    console.log('');

    if (workingFollowers.length > 0) {
      console.log('✅ WORKING FOLLOWERS:');
      workingFollowers.forEach(follower => {
        console.log(`   - ${follower.name}`);
      });
      console.log('');
    }

    if (failedFollowers.length > 0) {
      console.log('❌ FAILED FOLLOWERS:');
      failedFollowers.forEach(follower => {
        console.log(`   - ${follower.name}: ${follower.error}`);
      });
      console.log('');
    }

    // Impact Analysis
    console.log('🚨 IMPACT ANALYSIS');
    console.log('==================\n');

    if (workingFollowers.length === 0) {
      console.log('❌ CRITICAL ISSUE: No followers have working API credentials');
      console.log('   • Copy trading will NOT work');
      console.log('   • All follower accounts need valid API credentials');
      console.log('   • Followers cannot execute trades');
    } else if (workingFollowers.length < results.length) {
      console.log('⚠️ PARTIAL ISSUE: Some followers have invalid API credentials');
      console.log(`   • ${workingFollowers.length}/${results.length} followers can execute trades`);
      console.log('   • Copy trading will work but with reduced capacity');
      console.log('   • Failed followers need API credential updates');
    } else {
      console.log('🎉 ALL SYSTEMS GO: All followers have working API credentials');
      console.log('   • Copy trading will work perfectly');
      console.log('   • All followers can execute trades');
    }

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('===================');
    
    if (failedFollowers.length > 0) {
      console.log('1. Update API credentials for failed followers:');
      failedFollowers.forEach(follower => {
        console.log(`   - ${follower.name}: Generate new API key from Delta Exchange`);
      });
      console.log('');
      console.log('2. Verify API key permissions:');
      console.log('   - Ensure API keys have trading permissions');
      console.log('   - Check if API keys are active and not expired');
      console.log('   - Verify API keys belong to the correct Delta Exchange account');
    }

    if (workingFollowers.length > 0) {
      console.log('3. Test copy trading with working followers:');
      console.log('   - Place a test trade on broker account');
      console.log('   - Verify working followers execute copy trades');
    }

  } catch (error) {
    console.error('❌ Error in comprehensive test:', error.message);
  }
}

// Run the comprehensive test
testAllFollowers(); 