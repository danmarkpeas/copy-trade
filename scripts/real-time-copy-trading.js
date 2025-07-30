const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function realTimeCopyTrading() {
  console.log('⚡ REAL-TIME COPY TRADING (INDIA DELTA EXCHANGE)\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Use India Delta Exchange API URL
  const DELTA_API_URL = 'https://api.india.delta.exchange';

  // Store previous master positions to detect changes
  let previousMasterPositions = [];
  let lastProcessedTradeId = null;

  console.log('🚀 Starting real-time copy trading...');
  console.log('⚡ Monitoring for immediate trade execution');
  console.log('🔄 Press Ctrl+C to stop monitoring\n');

  // Start monitoring loop
  const monitorInterval = setInterval(async () => {
    try {
      console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Checking for new trades...`);

      // 1. Get master broker account
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

      // 2. Get current master positions and recent trades
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
      const currentMasterPositions = monitorResult.positions || [];
      const openMasterPositions = currentMasterPositions.filter(position => parseFloat(position.size) !== 0);

      // 3. Check for new positions (new trades)
      const positionSymbols = openMasterPositions.map(pos => pos.product_symbol);
      const previousSymbols = previousMasterPositions.map(pos => pos.product_symbol);

      // Find new positions (in current but not in previous)
      const newPositions = openMasterPositions.filter(pos => 
        !previousSymbols.includes(pos.product_symbol)
      );

      // 4. Handle new trades immediately
      if (newPositions.length > 0) {
        console.log(`🚨 DETECTED ${newPositions.length} NEW TRADE(S):`);
        newPositions.forEach(pos => {
          const size = parseFloat(pos.size);
          const side = size > 0 ? 'LONG' : 'SHORT';
          console.log(`   ✅ ${pos.product_symbol} ${side} ${Math.abs(size)} @ ${pos.entry_price}`);
        });

        // Execute copy trades immediately
        await executeCopyTrades(newPositions, supabase, DELTA_API_URL);
      }

      // 5. Check for closed positions
      const closedPositions = previousMasterPositions.filter(pos => 
        !positionSymbols.includes(pos.product_symbol)
      );

      if (closedPositions.length > 0) {
        console.log(`🚨 DETECTED ${closedPositions.length} CLOSED POSITION(S):`);
        closedPositions.forEach(pos => {
          console.log(`   ❌ ${pos.product_symbol} position was closed by master`);
        });

        // Close corresponding follower positions immediately
        await closeFollowerPositions(closedPositions, supabase, DELTA_API_URL);
      }

      if (newPositions.length === 0 && closedPositions.length === 0) {
        console.log(`📊 No new trades detected. Master has ${openMasterPositions.length} open positions`);
      }

      // Update previous positions
      previousMasterPositions = openMasterPositions;

    } catch (error) {
      console.log(`❌ Error in monitoring loop: ${error.message}`);
    }
  }, 5000); // Check every 5 seconds for immediate execution

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping real-time copy trading...');
    clearInterval(monitorInterval);
    console.log('✅ Real-time copy trading stopped');
    process.exit(0);
  });
}

// Function to execute copy trades immediately
async function executeCopyTrades(newPositions, supabase, apiUrl) {
  try {
    // Get active followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log(`\n⚡ EXECUTING COPY TRADES FOR ${followers.length} FOLLOWER(S)...`);

    for (const follower of followers) {
      if (!follower.api_key || !follower.api_secret) {
        console.log(`⚠️  Follower ${follower.follower_name} has no API credentials`);
        continue;
      }

      console.log(`\n🎯 Processing follower: ${follower.follower_name}`);

      for (const newPosition of newPositions) {
        const symbol = newPosition.product_symbol;
        const size = parseFloat(newPosition.size);
        const side = size > 0 ? 'buy' : 'sell';
        
        // Calculate copy size based on follower settings
        let copySize = Math.abs(size);
        if (follower.copy_mode === 'multiplier') {
          copySize = copySize * 0.1; // 10% copy ratio
        }
        
        // Convert to contract size (1 contract = 10 units)
        const contractSize = Math.max(1, Math.ceil(copySize * 10));
        
        console.log(`   ⚡ Executing ${symbol} ${side} ${contractSize} contracts for ${follower.follower_name}...`);

        const orderResult = await placeOrder(
          follower.api_key,
          follower.api_secret,
          newPosition.product_id,
          contractSize,
          side,
          apiUrl
        );

        if (orderResult.success) {
          console.log(`   ✅ Successfully executed ${follower.follower_name}'s ${symbol} order`);
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
          console.log(`   ❌ Failed to execute ${follower.follower_name}'s ${symbol} order:`, orderResult.error);
          
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

    console.log('\n✅ Copy trade execution completed');

  } catch (error) {
    console.log(`❌ Error executing copy trades: ${error.message}`);
  }
}

// Function to close follower positions immediately
async function closeFollowerPositions(closedPositions, supabase, apiUrl) {
  try {
    // Get active followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log(`\n🔧 CLOSING POSITIONS FOR ${followers.length} FOLLOWER(S)...`);

    for (const follower of followers) {
      if (!follower.api_key || !follower.api_secret) {
        console.log(`⚠️  Follower ${follower.follower_name} has no API credentials`);
        continue;
      }

      console.log(`\n🎯 Processing follower: ${follower.follower_name}`);

      // Get follower's current positions to know the actual size to close
      const followerPositionsResult = await getFollowerPositions(follower.api_key, follower.api_secret, apiUrl);
      
      if (!followerPositionsResult.success) {
        console.log(`   ❌ Could not get ${follower.follower_name}'s positions: ${followerPositionsResult.error}`);
        continue;
      }
      
      const followerPositions = followerPositionsResult.data?.result || [];

      for (const closedPosition of closedPositions) {
        const symbol = closedPosition.product_symbol;
        console.log(`   🔧 Closing ${symbol} position for ${follower.follower_name}...`);

        // Find the corresponding follower position
        const followerPosition = followerPositions.find(pos => 
          pos.product_symbol === symbol && 
          parseFloat(pos.size) !== 0
        );
        
        if (!followerPosition) {
          console.log(`   ⚠️ No open ${symbol} position found for ${follower.follower_name}`);
          continue;
        }
        
        // Get the actual position size from follower account
        const actualSize = Math.abs(parseFloat(followerPosition.size));
        const closeSide = parseFloat(followerPosition.size) > 0 ? 'sell' : 'buy';
        
        console.log(`   📊 Found ${actualSize} contracts to close (${closeSide})`);

        const closeResult = await placeOrder(
          follower.api_key, 
          follower.api_secret, 
          closedPosition.product_id, 
          actualSize, // Use actual position size instead of hardcoded 1
          closeSide, 
          apiUrl
        );

        if (closeResult.success) {
          console.log(`   ✅ Successfully closed ${follower.follower_name}'s ${symbol} position`);
          console.log(`      Order ID: ${closeResult.order_id}`);
          console.log(`      Closed Size: ${actualSize} contracts`);
        } else {
          console.log(`   ❌ Failed to close ${follower.follower_name}'s ${symbol} position:`, closeResult.error);
        }
      }
    }

    console.log('\n✅ Position closure process completed');

  } catch (error) {
    console.log(`❌ Error closing follower positions: ${error.message}`);
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

// Function to get follower positions
async function getFollowerPositions(apiKey, apiSecret, apiUrl) {
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

realTimeCopyTrading().catch(console.error); 