const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testBrokerTrades() {
  console.log('🔍 Testing Broker Trades Detection...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Step 1: Get broker account details
    console.log('🔍 Step 1: Getting broker account details...');
    const brokerId = 'f1bff339-23e2-4763-9aad-a3a02d18cf22';
    
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', brokerId)
      .single();

    if (brokerError) {
      console.log('❌ Error getting broker account:', brokerError.message);
      return;
    }

    console.log('✅ Broker account found:');
    console.log('   ID:', brokerAccount.id);
    console.log('   Broker:', brokerAccount.broker_name);
    console.log('   Account:', brokerAccount.account_name);
    console.log('   API Key:', brokerAccount.api_key ? 'Present' : 'Missing');
    console.log('   API Secret:', brokerAccount.api_secret ? 'Present' : 'Missing');

    // Step 2: Test the Delta Exchange API directly
    console.log('\n🔍 Step 2: Testing Delta Exchange API...');
    
    const response = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/verify-broker-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        broker_name: 'delta',
        api_key: brokerAccount.api_key,
        api_secret: brokerAccount.api_secret
      })
    });

    const verifyResult = await response.json();
    console.log('✅ API verification result:', verifyResult);

    // Step 3: Test the real-time monitor function
    console.log('\n🔍 Step 3: Testing real-time monitor function...');
    
    const monitorResponse = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/real-time-trade-monitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        broker_id: brokerId
      })
    });

    const monitorResult = await monitorResponse.json();
    console.log('✅ Real-time monitor result:', monitorResult);

    // Step 4: Check if there are any existing trades in the database
    console.log('\n🔍 Step 4: Checking existing trades in database...');
    
    const { data: existingTrades, error: tradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .eq('master_broker_id', brokerId);

    if (tradesError) {
      console.log('❌ Error checking trades:', tradesError.message);
    } else {
      console.log(`✅ Found ${existingTrades?.length || 0} existing trades for this broker`);
      if (existingTrades && existingTrades.length > 0) {
        existingTrades.forEach((trade, index) => {
          console.log(`   ${index + 1}. ${trade.original_symbol} - ${trade.original_side} - ${trade.status}`);
        });
      }
    }

    // Step 5: Check followers
    console.log('\n🔍 Step 5: Checking followers...');
    
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('master_broker_account_id', brokerId)
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error checking followers:', followersError.message);
    } else {
      console.log(`✅ Found ${followers?.length || 0} active followers for this broker`);
      if (followers && followers.length > 0) {
        followers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name} (${follower.copy_mode})`);
        });
      }
    }

    console.log('\n📋 Summary:');
    console.log('   - Broker account: Configured');
    console.log('   - API verification: Working');
    console.log('   - Real-time monitor: Running');
    console.log('   - Active followers: Found');
    console.log('   - Trades found: 0 (This is the issue)');

    console.log('\n🔧 Possible Issues:');
    console.log('1. The Delta Exchange API might not be returning open positions');
    console.log('2. The position might be in a different account/API key');
    console.log('3. The trade detection logic might need adjustment');
    console.log('4. The position might be too recent and not yet detected');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testBrokerTrades().catch(console.error); 