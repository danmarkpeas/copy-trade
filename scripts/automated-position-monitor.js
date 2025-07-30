const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function automatedPositionMonitor() {
  console.log('🤖 AUTOMATED POSITION MONITOR (INDIA DELTA EXCHANGE)\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Use India Delta Exchange API URL
  const DELTA_API_URL = 'https://api.india.delta.exchange';

  // Store previous master positions to detect changes
  let previousMasterPositions = [];

  console.log('🚀 Starting automated position monitoring...');
  console.log('📡 Monitoring every 30 seconds for position changes');
  console.log('🔄 Press Ctrl+C to stop monitoring\n');

  // Start monitoring loop
  const monitorInterval = setInterval(async () => {
    try {
      console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Checking positions...`);

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

      // 2. Get current master positions
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

      // 3. Check for position changes
      const positionSymbols = openMasterPositions.map(pos => pos.product_symbol);
      const previousSymbols = previousMasterPositions.map(pos => pos.product_symbol);

      // Find closed positions (in previous but not in current)
      const closedPositions = previousMasterPositions.filter(pos => 
        !positionSymbols.includes(pos.product_symbol)
      );

      // Find new positions (in current but not in previous)
      const newPositions = openMasterPositions.filter(pos => 
        !previousSymbols.includes(pos.product_symbol)
      );

      // 4. Handle position changes
      if (closedPositions.length > 0) {
        console.log(`🚨 DETECTED ${closedPositions.length} CLOSED POSITION(S):`);
        closedPositions.forEach(pos => {
          console.log(`   ❌ ${pos.product_symbol} position was closed by master`);
        });

        // Close corresponding follower positions
        await closeFollowerPositions(closedPositions, supabase, DELTA_API_URL);
      }

      if (newPositions.length > 0) {
        console.log(`🆕 DETECTED ${newPositions.length} NEW POSITION(S):`);
        newPositions.forEach(pos => {
          const size = parseFloat(pos.size);
          const side = size > 0 ? 'LONG' : 'SHORT';
          console.log(`   ✅ ${pos.product_symbol} ${side} ${Math.abs(size)} @ ${pos.entry_price}`);
        });
      }

      if (closedPositions.length === 0 && newPositions.length === 0) {
        console.log(`📊 No position changes detected. Master has ${openMasterPositions.length} open positions`);
      }

      // Update previous positions
      previousMasterPositions = openMasterPositions;

    } catch (error) {
      console.log(`❌ Error in monitoring loop: ${error.message}`);
    }
  }, 30000); // Check every 30 seconds

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping automated position monitor...');
    clearInterval(monitorInterval);
    console.log('✅ Automated monitoring stopped');
    process.exit(0);
  });
}

// Function to close follower positions
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

    console.log(`\n🔧 Closing positions for ${followers.length} follower(s)...`);

    for (const follower of followers) {
      if (!follower.api_key || !follower.api_secret) {
        console.log(`⚠️  Follower ${follower.follower_name} has no API credentials`);
        continue;
      }

      console.log(`\n🎯 Processing follower: ${follower.follower_name}`);

      for (const closedPosition of closedPositions) {
        const symbol = closedPosition.product_symbol;
        console.log(`   🔧 Closing ${symbol} position for ${follower.follower_name}...`);

        // We need to determine the size and side based on the follower's copy settings
        // For now, we'll assume 1 contract (the minimum we used before)
        const productId = closedPosition.product_id;
        const size = 1; // 1 contract
        const side = 'sell'; // Assume it was a long position to close

        const closeResult = await closePosition(follower.api_key, follower.api_secret, productId, size, side, apiUrl);

        if (closeResult.success) {
          console.log(`   ✅ Successfully closed ${follower.follower_name}'s ${symbol} position`);
          console.log(`      Order ID: ${closeResult.order_id}`);
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

// Function to close position
async function closePosition(apiKey, apiSecret, productId, size, side, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    const orderData = {
      product_id: productId,
      size: size,
      side: side,
      order_type: 'market_order'
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
        message: 'Position closed successfully'
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

automatedPositionMonitor().catch(console.error); 