const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test script to simulate new trade detection
async function testNewTradeDetection() {
  console.log('🧪 TESTING NEW TRADE DETECTION');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Get broker account
    const { data: brokerAccounts, error } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true)
      .limit(1);

    if (error || !brokerAccounts || brokerAccounts.length === 0) {
      throw new Error('No active broker accounts found');
    }

    const brokerAccount = brokerAccounts[0];
    console.log(`📋 Testing with broker: ${brokerAccount.account_name}`);

    // Call backend to get trades
    const response = await fetch('http://localhost:3001/api/real-time-monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broker_id: brokerAccount.id })
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📊 Backend returned ${data.copy_results?.length || 0} trades`);

    if (data.copy_results && data.copy_results.length > 0) {
      // Take the most recent trade and simulate it as new
      const latestTrade = data.copy_results[0];
      console.log(`🎯 Simulating NEW trade detection:`);
      console.log(`   Symbol: ${latestTrade.symbol}`);
      console.log(`   Side: ${latestTrade.side}`);
      console.log(`   Size: ${latestTrade.size}`);
      console.log(`   Status: ${latestTrade.status}`);
      console.log(`   Timestamp: ${latestTrade.timestamp}`);

      // Create a simulated new trade with current timestamp
      const simulatedTrade = {
        ...latestTrade,
        timestamp: new Date().toISOString(),
        order_id: `test_${Date.now()}`
      };

      console.log(`\n🚀 SIMULATED NEW TRADE:`);
      console.log(`   Symbol: ${simulatedTrade.symbol}`);
      console.log(`   Side: ${simulatedTrade.side}`);
      console.log(`   Size: ${simulatedTrade.size}`);
      console.log(`   Status: ${simulatedTrade.status}`);
      console.log(`   Timestamp: ${simulatedTrade.timestamp}`);

      // Now test the copy execution logic
      await testCopyExecution(simulatedTrade, brokerAccount);
    } else {
      console.log('❌ No trades found to simulate');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testCopyExecution(masterTrade, brokerAccount) {
  console.log(`\n⚡ TESTING COPY EXECUTION`);
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get followers for this broker
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*')
      .eq('master_broker_account_id', brokerAccount.id)
      .eq('account_status', 'active');

    if (error || !followers || followers.length === 0) {
      throw new Error('No active followers found');
    }

    console.log(`👥 Found ${followers.length} followers for testing`);

    for (const follower of followers) {
      console.log(`\n👤 Testing follower: ${follower.follower_name}`);
      
      // Calculate copy size
      const copySize = Math.max(0.01, Math.min(masterTrade.size * 0.1, 1000 / 100));
      console.log(`   📊 Calculated copy size: ${copySize} contracts`);

      // Simulate order placement
      console.log(`   📝 Simulating order placement...`);
      
      // Save copy trade to database
      const { data, error: saveError } = await supabase
        .from('copy_trades')
        .insert({
          master_trade_id: `test_${Date.now()}`,
          master_broker_id: masterTrade.broker_id || brokerAccount.id,
          follower_id: follower.user_id,
          follower_order_id: `simulated_${Date.now()}`,
          original_symbol: masterTrade.symbol,
          original_side: masterTrade.side,
          original_size: masterTrade.size,
          original_price: masterTrade.price,
          copied_size: copySize,
          copied_price: masterTrade.price,
          status: 'executed',
          entry_time: masterTrade.timestamp,
          created_at: new Date().toISOString()
        })
        .select();

      if (saveError) {
        console.log(`   ❌ Failed to save copy trade: ${saveError.message}`);
      } else {
        console.log(`   ✅ Copy trade saved successfully: ${data?.[0]?.id || 'unknown'}`);
        console.log(`   🎯 ${follower.follower_name} would have executed:`);
        console.log(`      Symbol: ${masterTrade.symbol}`);
        console.log(`      Side: ${masterTrade.side}`);
        console.log(`      Size: ${copySize} contracts`);
        console.log(`      Price: ${masterTrade.price}`);
      }
    }

    console.log(`\n✅ COPY EXECUTION TEST COMPLETED`);
    console.log(`📊 Check the database for saved copy trades`);
    console.log(`🌐 Check the frontend at http://localhost:3000/trades`);

  } catch (error) {
    console.error('❌ Copy execution test failed:', error.message);
  }
}

// Run the test
testNewTradeDetection(); 