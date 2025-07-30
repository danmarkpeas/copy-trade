const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function realTimeCopyTrading() {
  console.log('⚡ REAL-TIME COPY TRADING (INDIA DELTA EXCHANGE) - FIXED VERSION');
  console.log('🚀 Starting real-time copy trading...');
  console.log('⚡ Monitoring for immediate trade execution');
  console.log('🔄 Press Ctrl+C to stop monitoring\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Use India Delta Exchange API URL
  const DELTA_API_URL = 'https://api.india.delta.exchange';

  let lastMasterPositions = [];
  let lastCheckTime = 0;

  while (true) {
    try {
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      console.log(`⏰ ${timeString} - Checking for new trades...`);

      // Get master positions from backend
      const masterPositions = await getMasterPositions();
      
      if (masterPositions.length === 0) {
        console.log('📊 No new trades detected. Master has 0 open positions');
      } else {
        console.log(`📊 Master has ${masterPositions.length} open positions`);
        
        // Check for new positions
        const newPositions = masterPositions.filter(pos => 
          !lastMasterPositions.some(lastPos => 
            lastPos.product_symbol === pos.product_symbol && 
            lastPos.size === pos.size
          )
        );

        if (newPositions.length > 0) {
          console.log(`🚨 DETECTED ${newPositions.length} NEW TRADE(S):`);
          newPositions.forEach(pos => {
            console.log(`   ✅ ${pos.product_symbol} ${pos.size > 0 ? 'BUY' : 'SELL'} ${Math.abs(pos.size)} @ ${pos.entry_price}`);
          });

          // Execute copy trades
          await executeCopyTrades(newPositions);
        }
      }

      // Check for closed positions
      const closedPositions = lastMasterPositions.filter(lastPos => 
        !masterPositions.some(pos => 
          pos.product_symbol === lastPos.product_symbol && 
          pos.size === lastPos.size
        )
      );

      if (closedPositions.length > 0) {
        console.log(`🔴 DETECTED ${closedPositions.length} CLOSED POSITION(S):`);
        closedPositions.forEach(pos => {
          console.log(`   ❌ ${pos.product_symbol} position closed`);
        });

        // Close follower positions
        await closeFollowerPositions(closedPositions);
      }

      lastMasterPositions = masterPositions;
      lastCheckTime = Date.now();

      // Wait 6 seconds before next check
      await sleep(6000);

    } catch (error) {
      console.log(`❌ Error in monitoring loop: ${error.message}`);
      await sleep(10000); // Wait longer on error
    }
  }
}

// Function to get master positions from backend
async function getMasterPositions() {
  try {
    const response = await fetch('http://localhost:3001/api/real-time-monitor');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.positions || [];
  } catch (error) {
    console.log(`❌ Error getting master positions: ${error.message}`);
    return [];
  }
}

// Function to execute copy trades with balance check
async function executeCopyTrades(newPositions) {
  try {
    console.log(`⚡ EXECUTING COPY TRADES FOR ${newPositions.length} POSITION(S)...`);

    // Get active followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log(`🎯 Processing ${followers.length} follower(s)...`);

    for (const follower of followers) {
      if (!follower.api_key || !follower.api_secret) {
        console.log(`   ⚠️ Skipping ${follower.follower_name}: No API credentials`);
        continue;
      }

      // Check available balance first
      const balanceResult = await getFollowerBalance(follower.api_key, follower.api_secret, DELTA_API_URL);
      if (!balanceResult.success) {
        console.log(`   ❌ Failed to get ${follower.follower_name}'s balance: ${balanceResult.error}`);
        continue;
      }

      const availableBalance = parseFloat(balanceResult.data.result?.[0]?.available_balance || 0);
      console.log(`   💰 ${follower.follower_name}'s available balance: $${availableBalance}`);

      if (availableBalance < 0.05) {
        console.log(`   ⚠️ ${follower.follower_name} has insufficient balance (< $0.05)`);
        continue;
      }

      for (const position of newPositions) {
        try {
          const symbol = position.product_symbol;
          const side = position.size > 0 ? 'buy' : 'sell';
          const masterSize = Math.abs(position.size);
          
          // Calculate copy size based on available balance
          const copySize = calculateCopySizeWithBalance(masterSize, availableBalance, symbol);
          
          if (copySize < 1) {
            console.log(`   ⚠️ ${follower.follower_name}: Insufficient balance for ${symbol} (need at least 1 contract)`);
            continue;
          }

          console.log(`   ⚡ Executing ${symbol} ${side} ${copySize} contracts for ${follower.follower_name}...`);

          const orderResult = await placeOrder(
            follower.api_key,
            follower.api_secret,
            position.product_id,
            copySize,
            side,
            DELTA_API_URL
          );

          if (orderResult.success) {
            console.log(`   ✅ Successfully executed ${follower.follower_name}'s ${symbol} order`);
            console.log(`      Order ID: ${orderResult.order_id}`);
            console.log(`      Size: ${copySize} contracts`);
            
            // Save to database
            await saveCopyTrade(follower, symbol, side, copySize, 'executed', orderResult.order_id);
          } else {
            console.log(`   ❌ Failed to execute ${follower.follower_name}'s ${symbol} order: ${orderResult.error}`);
            await saveCopyTrade(follower, symbol, side, copySize, 'failed', null, orderResult.error);
          }

        } catch (error) {
          console.log(`   ❌ Error executing ${follower.follower_name}'s ${position.product_symbol} order: ${error.message}`);
        }
      }
    }

    console.log('✅ Copy trade execution completed\n');

  } catch (error) {
    console.log(`❌ Error executing copy trades: ${error.message}`);
  }
}

// Function to calculate copy size based on available balance
function calculateCopySizeWithBalance(masterSize, availableBalance, symbol) {
  // Conservative margin estimates per contract
  const marginEstimates = {
    'POLUSD': 0.05,  // $0.05 per contract
    'BTCUSD': 50,    // $50 per contract
    'ETHUSD': 10,    // $10 per contract
    'SOLUSD': 0.5,   // $0.5 per contract
    'ADAUSD': 0.1,   // $0.1 per contract
    'DOTUSD': 0.2,   // $0.2 per contract
    'DYDXUSD': 0.3   // $0.3 per contract
  };

  const marginPerContract = marginEstimates[symbol] || 0.1; // Default $0.1
  const maxContracts = Math.floor(availableBalance / marginPerContract);
  
  // Use the smaller of master size or max possible contracts
  const copySize = Math.min(masterSize, maxContracts);
  
  console.log(`      💰 Balance calculation: $${availableBalance} / $${marginPerContract} = ${maxContracts} max contracts`);
  console.log(`      📊 Copy size: ${copySize} contracts (master: ${masterSize})`);
  
  return copySize;
}

// Function to get follower balance
async function getFollowerBalance(apiKey, apiSecret, apiUrl) {
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

// Function to close follower positions
async function closeFollowerPositions(closedPositions) {
  try {
    console.log(`🔧 CLOSING FOLLOWER POSITIONS FOR ${closedPositions.length} CLOSED MASTER POSITION(S)...`);

    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    for (const follower of followers) {
      if (!follower.api_key || !follower.api_secret) {
        continue;
      }

      for (const closedPosition of closedPositions) {
        try {
          const symbol = closedPosition.product_symbol;
          const productId = closedPosition.product_id;
          
          // Get actual follower position size
          const actualSize = await getFollowerPositionSize(follower, symbol, productId, DELTA_API_URL);
          
          if (actualSize > 0) {
            const closeSide = closedPosition.size > 0 ? 'sell' : 'buy';
            console.log(`   🔧 Closing ${follower.follower_name}'s ${symbol} position: ${actualSize} contracts`);
            
            const orderResult = await placeOrder(
              follower.api_key,
              follower.api_secret,
              productId,
              actualSize,
              closeSide,
              DELTA_API_URL
            );

            if (orderResult.success) {
              console.log(`   ✅ Successfully closed ${follower.follower_name}'s ${symbol} position`);
              console.log(`      Order ID: ${orderResult.order_id}`);
            } else {
              console.log(`   ❌ Failed to close ${follower.follower_name}'s ${symbol} position: ${orderResult.error}`);
            }
          } else {
            console.log(`   ℹ️ ${follower.follower_name} has no ${symbol} position to close`);
          }

        } catch (error) {
          console.log(`   ❌ Error closing ${follower.follower_name}'s ${closedPosition.product_symbol} position: ${error.message}`);
        }
      }
    }

    console.log('✅ Position closure completed\n');

  } catch (error) {
    console.log(`❌ Error closing follower positions: ${error.message}`);
  }
}

// Function to get follower position size using the correct API
async function getFollowerPositionSize(follower, symbol, productId, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = `/v2/positions?product_id=${productId}`; // Key fix: added product_id
    const message = `GET${timestamp}${path}`;
    const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

    const response = await fetch(`${apiUrl}${path}`, {
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
      const position = Array.isArray(data.result) ? data.result[0] : data.result; // Fixed parsing
      if (position && position.size !== undefined) {
        return Math.abs(parseFloat(position.size));
      }
    }
    return 0;
  } catch (error) {
    console.log(`   ⚠️ Could not get ${follower.follower_name}'s ${symbol} position: ${error.message}`);
    return 0;
  }
}

// Function to place order
async function placeOrder(apiKey, apiSecret, productId, size, side, apiUrl) {
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
        status: data.result?.state,
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
      error: error.message,
      type: 'network_error'
    };
  }
}

// Function to save copy trade to database
async function saveCopyTrade(follower, symbol, side, size, status, orderId = null, errorMessage = null) {
  try {
    const { error } = await supabase
      .from('copy_trades')
      .insert({
        follower_id: follower.id,
        follower_name: follower.follower_name,
        symbol: symbol,
        side: side,
        size: size,
        status: status,
        order_id: orderId,
        executed_at: new Date().toISOString()
      });

    if (error) {
      console.log(`   ⚠️ Error saving copy trade to database: ${error.message}`);
    }
  } catch (error) {
    console.log(`   ⚠️ Error saving copy trade: ${error.message}`);
  }
}

// Helper function to sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

realTimeCopyTrading().catch(console.error); 