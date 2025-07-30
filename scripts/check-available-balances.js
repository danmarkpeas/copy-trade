const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkAvailableBalances() {
  console.log('💰 CHECKING ALL AVAILABLE BALANCES (INDIA DELTA EXCHANGE)\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Use India Delta Exchange API URL
  const DELTA_API_URL = 'https://api.india.delta.exchange';

  try {
    // 1. Get follower credentials
    console.log('📋 STEP 1: Getting Follower Credentials');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active')
      .limit(1);

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    const follower = followers[0];
    console.log(`✅ Using follower: ${follower.follower_name}`);

    if (!follower.api_key || !follower.api_secret) {
      console.log('❌ No API credentials found');
      return;
    }

    // 2. Check all wallet balances
    console.log('\n📋 STEP 2: Checking All Wallet Balances');
    const balanceResult = await getAllBalances(follower.api_key, follower.api_secret, DELTA_API_URL);
    
    if (!balanceResult.success) {
      console.log(`❌ Failed to get wallet balances: ${balanceResult.error}`);
      return;
    }

    console.log(`✅ All Balances Retrieved:`);
    console.log(JSON.stringify(balanceResult.data, null, 2));

    // 3. Check account info
    console.log('\n📋 STEP 3: Checking Account Information');
    const accountResult = await getAccountInfo(follower.api_key, follower.api_secret, DELTA_API_URL);
    
    if (accountResult.success) {
      console.log(`✅ Account Info:`);
      console.log(JSON.stringify(accountResult.data, null, 2));
    } else {
      console.log(`❌ Failed to get account info: ${accountResult.error}`);
    }

    // 4. Check positions
    console.log('\n📋 STEP 4: Checking Current Positions');
    const positionsResult = await getPositions(follower.api_key, follower.api_secret, DELTA_API_URL);
    
    if (positionsResult.success) {
      console.log(`✅ Current Positions:`);
      console.log(JSON.stringify(positionsResult.data, null, 2));
    } else {
      console.log(`❌ Failed to get positions: ${positionsResult.error}`);
    }

    // 5. Summary and recommendations
    console.log('\n🎯 SUMMARY:');
    console.log('✅ All account information retrieved');
    console.log('✅ Balance analysis completed');
    console.log('✅ Position status checked');

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('✅ Check if account needs funding');
    console.log('✅ Verify trading permissions');
    console.log('✅ Ensure proper currency setup');

  } catch (error) {
    console.log('❌ Error checking balances:', error.message);
  }
}

// Function to get all balances
async function getAllBalances(apiKey, apiSecret, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/wallet/balances';
    const message = `GET${timestamp}${path}`;
    const signature = require('crypto').createHmac('sha256', apiSecret).update(message).digest('hex');

    const response = await fetch(`${apiUrl}${path}`, {
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
        data: data
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

// Function to get account info
async function getAccountInfo(apiKey, apiSecret, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/account';
    const message = `GET${timestamp}${path}`;
    const signature = require('crypto').createHmac('sha256', apiSecret).update(message).digest('hex');

    const response = await fetch(`${apiUrl}${path}`, {
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
        data: data
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

// Function to get positions
async function getPositions(apiKey, apiSecret, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/positions';
    const message = `GET${timestamp}${path}`;
    const signature = require('crypto').createHmac('sha256', apiSecret).update(message).digest('hex');

    const response = await fetch(`${apiUrl}${path}`, {
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
        data: data
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

checkAvailableBalances().catch(console.error); 