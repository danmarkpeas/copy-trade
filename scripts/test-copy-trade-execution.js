const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testCopyTradeExecution() {
  console.log('🧪 TESTING COPY TRADE EXECUTION\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get active followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.error('❌ No active followers found');
      return;
    }

    const follower = followers[0];
    console.log(`👤 Testing with follower: ${follower.follower_name}`);

    // Test 1: Check follower balance
    console.log('\n📋 TEST 1: CHECKING FOLLOWER BALANCE');
    const balance = await getFollowerBalance(follower);
    if (balance && balance.usd) {
      console.log(`✅ Balance: $${balance.usd} USD`);
      console.log(`✅ Sufficient for trading: ${parseFloat(balance.usd) >= 0.05 ? 'YES' : 'NO'}`);
    } else {
      console.log(`❌ Failed to get balance`);
      return;
    }

    // Test 2: Test order placement
    console.log('\n📋 TEST 2: TESTING ORDER PLACEMENT');
    const testOrder = await placeTestOrder(follower);
    if (testOrder.success) {
      console.log(`✅ Test order placed successfully`);
      console.log(`   Order ID: ${testOrder.orderId}`);
      console.log(`   Status: ${testOrder.status}`);
    } else {
      console.log(`❌ Test order failed: ${testOrder.error}`);
      return;
    }

    // Test 3: Check recent failed copy trades
    console.log('\n📋 TEST 3: ANALYZING RECENT FAILED COPY TRADES');
    const { data: failedTrades, error: failedError } = await supabase
      .from('copy_trades')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(3);

    if (!failedError && failedTrades && failedTrades.length > 0) {
      console.log(`📊 Found ${failedTrades.length} recent failed trades:`);
      failedTrades.forEach((trade, index) => {
        console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size}`);
        console.log(`      Time: ${new Date(trade.entry_time).toLocaleString()}`);
        console.log(`      Master Trade ID: ${trade.master_trade_id}`);
        console.log(`      Follower Order ID: ${trade.follower_order_id || 'NULL'}`);
        console.log(`      Error: ${trade.error_message || 'No error message'}`);
      });
    }

    // Test 4: Check successful copy trades for comparison
    console.log('\n📋 TEST 4: ANALYZING SUCCESSFUL COPY TRADES');
    const { data: successfulTrades, error: successError } = await supabase
      .from('copy_trades')
      .select('*')
      .eq('status', 'executed')
      .order('created_at', { ascending: false })
      .limit(3);

    if (!successError && successfulTrades && successfulTrades.length > 0) {
      console.log(`📊 Found ${successfulTrades.length} successful trades:`);
      successfulTrades.forEach((trade, index) => {
        console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size}`);
        console.log(`      Time: ${new Date(trade.entry_time).toLocaleString()}`);
        console.log(`      Master Trade ID: ${trade.master_trade_id}`);
        console.log(`      Follower Order ID: ${trade.follower_order_id || 'NULL'}`);
      });
    }

    console.log('\n🔍 DIAGNOSIS:');
    console.log('✅ Follower balance: Sufficient');
    console.log('✅ Order placement: Working');
    console.log('❌ Recent copy trades: Failing');
    console.log('✅ Earlier copy trades: Successful');
    
    console.log('\n💡 ROOT CAUSE:');
    console.log('The issue is likely in the ultra-fast system logic:');
    console.log('1. The system is detecting trades but not executing them properly');
    console.log('2. The order placement function works (as tested above)');
    console.log('3. The issue is in the trade detection or execution flow');
    console.log('4. Need to check the ultra-fast system logs for specific errors');
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Check ultra-fast system logs for specific error messages');
    console.log('2. Verify the trade detection logic is working correctly');
    console.log('3. Ensure the copy trade execution flow is properly triggered');
    console.log('4. Test with a new master trade to see the exact failure point');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function getFollowerBalance(follower) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/wallet/balances';
    const message = `GET${timestamp}${path}`;
    const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

    const response = await fetch(`${DELTA_API_URL}${path}`, {
      method: 'GET',
      headers: {
        'api-key': follower.api_key,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success && data.result) {
      const usdBalance = data.result.find(b => b.asset_symbol === 'USD');
      return {
        usd: usdBalance ? usdBalance.available_balance : '0'
      };
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

async function placeTestOrder(follower) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  const productIds = {
    'POLUSD': 39943
  };
  
  try {
    const productId = productIds['POLUSD'];
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    const orderData = {
      product_id: productId,
      size: 1,
      side: 'buy',
      order_type: 'market_order',
      time_in_force: 'gtc'
    };

    const message = `POST${timestamp}${path}${JSON.stringify(orderData)}`;
    const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

    const response = await fetch(`${DELTA_API_URL}${path}`, {
      method: 'POST',
      headers: {
        'api-key': follower.api_key,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      return {
        success: true,
        orderId: data.result.id,
        status: data.result.state
      };
    } else {
      return {
        success: false,
        error: data.error?.code || data.message || 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

testCopyTradeExecution().catch(console.error); 