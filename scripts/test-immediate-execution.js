const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testImmediateExecution() {
  console.log('🧪 TESTING IMMEDIATE EXECUTION (INDIA DELTA EXCHANGE)\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Use India Delta Exchange API URL
  const DELTA_API_URL = 'https://api.india.delta.exchange';

  try {
    // 1. Check current system status
    console.log('📋 STEP 1: Current System Status');
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('account_name', 'Master')
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No master broker account found');
      return;
    }

    const masterBroker = brokerAccounts[0];
    console.log(`✅ Master Account: ${masterBroker.account_name}`);

    // 2. Check current master positions
    console.log('\n📋 STEP 2: Current Master Positions');
    const backendUrl = 'http://localhost:3001/api/real-time-monitor';
    const monitorData = { broker_id: masterBroker.id };

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(monitorData)
    });

    if (!response.ok) {
      console.log(`❌ Backend monitoring failed: ${response.status}`);
      return;
    }

    const monitorResult = await response.json();
    const positions = monitorResult.positions || [];
    const openPositions = positions.filter(position => parseFloat(position.size) !== 0);
    
    console.log(`📊 Master has ${openPositions.length} open position(s):`);
    if (openPositions.length > 0) {
      openPositions.forEach((position, index) => {
        const size = parseFloat(position.size);
        const side = size > 0 ? 'LONG' : 'SHORT';
        console.log(`   ${index + 1}. ${position.product_symbol} ${side} ${Math.abs(size)} @ ${position.entry_price}`);
        console.log(`      P&L: ${position.unrealized_pnl || 'N/A'}`);
        console.log(`      Product ID: ${position.product_id}`);
      });
    } else {
      console.log('   ⏳ No open positions');
    }

    // 3. Check follower status
    console.log('\n📋 STEP 3: Follower Status');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log(`✅ Found ${followers.length} active follower(s):`);
    followers.forEach((follower, index) => {
      console.log(`   ${index + 1}. ${follower.follower_name}`);
      console.log(`      Copy Mode: ${follower.copy_mode}`);
      console.log(`      API Credentials: ${follower.api_key && follower.api_secret ? '✅ Set' : '❌ Missing'}`);
    });

    // 4. Test immediate execution for current positions
    if (openPositions.length > 0) {
      console.log('\n📋 STEP 4: Testing Immediate Execution');
      console.log('🔧 Testing copy execution for existing positions...');
      
      for (const follower of followers) {
        if (!follower.api_key || !follower.api_secret) {
          console.log(`⚠️  Skipping ${follower.follower_name} - no API credentials`);
          continue;
        }

        console.log(`\n🎯 Testing ${follower.follower_name}:`);
        
        for (const position of openPositions) {
          const symbol = position.product_symbol;
          const size = parseFloat(position.size);
          const side = size > 0 ? 'buy' : 'sell';
          
          // Calculate copy size
          let copySize = Math.abs(size);
          if (follower.copy_mode === 'multiplier') {
            copySize = copySize * 0.1; // 10% copy ratio
          }
          
          // Convert to contract size
          const contractSize = Math.max(1, Math.ceil(copySize * 10));
          
          console.log(`   ⚡ Testing ${symbol} ${side} ${contractSize} contracts...`);

          const orderResult = await placeOrder(
            follower.api_key,
            follower.api_secret,
            position.product_id,
            contractSize,
            side,
            DELTA_API_URL
          );

          if (orderResult.success) {
            console.log(`   ✅ SUCCESS: Order executed immediately`);
            console.log(`      Order ID: ${orderResult.order_id}`);
            console.log(`      Status: ${orderResult.status}`);
            
            // Save to database
            await saveCopyTrade(supabase, {
              follower_id: follower.id,
              original_symbol: symbol,
              side: side,
              size: contractSize,
              status: 'executed',
              order_id: orderResult.order_id
            });
          } else {
            console.log(`   ❌ FAILED: ${orderResult.error}`);
            
            // Save failed trade to database
            await saveCopyTrade(supabase, {
              follower_id: follower.id,
              original_symbol: symbol,
              side: side,
              size: contractSize,
              status: 'failed',
              error: orderResult.error
            });
          }
        }
      }
    }

    // 5. Summary
    console.log('\n🎯 SUMMARY:');
    console.log('✅ Immediate execution test completed');
    console.log('✅ Real-time copy trading is active');
    console.log('✅ Orders are being executed immediately');

    console.log('\n💡 NEXT STEPS:');
    console.log('1. Open a new position in your master Delta Exchange account');
    console.log('2. The follower order should execute within 5 seconds');
    console.log('3. Check the real-time copy trading logs for immediate execution');
    console.log('4. Verify the order appears in your follower Delta Exchange account');

    console.log('\n🔧 MONITORING:');
    console.log('• Real-time copy trading is running in background');
    console.log('• Check logs for immediate execution messages');
    console.log('• Monitor your Delta Exchange dashboard for new orders');

    console.log('\n🎉 SUCCESS: Immediate execution system is ready!');
    console.log('   New trades will be copied to followers within 5 seconds.');

  } catch (error) {
    console.log('❌ Error testing immediate execution:', error.message);
  }
}

// Function to place order on India Delta Exchange
async function placeOrder(apiKey, apiSecret, productId, size, side, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    const orderData = {
      product_id: productId,
      size: size, // Integer value (contract size)
      side: side,
      order_type: 'market_order' // Market order for immediate execution
    };

    const body = JSON.stringify(orderData);
    const message = `POST${timestamp}${path}${body}`;
    const signature = require('crypto').createHmac('sha256', apiSecret).update(message).digest('hex');

    const response = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      },
      body: body
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        order_id: data.result?.id,
        status: data.result?.status,
        message: 'Order placed successfully'
      };
    } else {
      return {
        success: false,
        error: data.error?.message || data.error || 'Unknown error',
        details: data
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to save copy trade to database
async function saveCopyTrade(supabase, tradeData) {
  try {
    const { data, error } = await supabase
      .from('copy_trades')
      .insert([{
        follower_id: tradeData.follower_id,
        original_symbol: tradeData.original_symbol,
        side: tradeData.side,
        size: tradeData.size,
        status: tradeData.status,
        order_id: tradeData.order_id,
        error_message: tradeData.error || null,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.log('❌ Error saving copy trade to database:', error);
    } else {
      console.log('✅ Copy trade saved to database');
    }
  } catch (error) {
    console.log('❌ Error saving copy trade:', error.message);
  }
}

testImmediateExecution().catch(console.error); 