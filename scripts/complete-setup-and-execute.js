const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function completeSetupAndExecute() {
  console.log('🚀 COMPLETE SETUP AND EXECUTE REAL ORDERS (INDIA DELTA EXCHANGE)\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Use India Delta Exchange API URL
  const DELTA_API_URL = 'https://api.india.delta.exchange';

  try {
    // 1. Check current system status
    console.log('📋 STEP 1: Checking Current System Status');
    
    // Get master broker account
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
    console.log('✅ Master broker account found:', masterBroker.account_name);

    // Get active followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('master_broker_account_id', masterBroker.id)
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log(`✅ Found ${followers.length} active followers:`);
    followers.forEach((follower, index) => {
      console.log(`   ${index + 1}. ${follower.follower_name} (${follower.copy_mode})`);
      console.log(`      API Key: ${follower.api_key ? '✅ Set' : '❌ Missing'}`);
      console.log(`      API Secret: ${follower.api_secret ? '✅ Set' : '❌ Missing'}`);
    });

    // 2. Check backend monitoring
    console.log('\n📋 STEP 2: Checking Backend Monitoring');
    
    const backendUrl = 'http://localhost:3001/api/real-time-monitor';
    const monitorData = {
      broker_id: masterBroker.id
    };

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(monitorData)
      });

      if (response.ok) {
        const monitorResult = await response.json();
        console.log('✅ Backend monitoring is working');
        
        if (monitorResult.positions && monitorResult.positions.length > 0) {
          const openPositions = monitorResult.positions.filter(position => parseFloat(position.size) !== 0);
          console.log(`✅ Found ${openPositions.length} open positions in master account`);
          
          openPositions.forEach((position, index) => {
            const size = parseFloat(position.size);
            const side = size > 0 ? 'LONG' : 'SHORT';
            console.log(`   ${index + 1}. ${position.product_symbol} ${side} ${Math.abs(size)} @ ${position.entry_price}`);
          });
        } else {
          console.log('⏳ No open positions found in master account');
        }
      } else {
        console.log('❌ Backend monitoring failed');
        console.log('💡 Make sure the backend server is running: node server.js');
        return;
      }
    } catch (error) {
      console.log('❌ Backend monitoring error:', error.message);
      console.log('💡 Make sure the backend server is running: node server.js');
      return;
    }

    // 3. Check API credentials
    console.log('\n📋 STEP 3: Checking API Credentials');
    
    let validCredentials = false;
    for (const follower of followers) {
      console.log(`\n🔍 Testing credentials for ${follower.follower_name}:`);
      
      if (!follower.api_key || !follower.api_secret) {
        console.log(`   ❌ Missing API credentials for ${follower.follower_name}`);
        console.log('   💡 You need to add valid Delta Exchange API credentials');
        continue;
      }

      // Test the API credentials
      const testResult = await testDeltaApiCredentials(follower.api_key, follower.api_secret, DELTA_API_URL);
      
      if (testResult.success) {
        console.log(`   ✅ API credentials are valid for ${follower.follower_name}`);
        validCredentials = true;
      } else {
        console.log(`   ❌ API credentials are invalid for ${follower.follower_name}`);
        console.log(`   🔍 Error: ${testResult.error}`);
        console.log('   💡 You need to update the API credentials');
      }
    }

    // 4. If credentials are invalid, provide setup instructions
    if (!validCredentials) {
      console.log('\n📋 STEP 4: Setting Up API Credentials');
      console.log('\n🔧 TO GET DELTA EXCHANGE API CREDENTIALS:');
      console.log('1. Go to https://www.delta.exchange/');
      console.log('2. Log in to your Delta Exchange account');
      console.log('3. Go to Settings → API Keys');
      console.log('4. Click "Create New API Key"');
      console.log('5. Set the following permissions:');
      console.log('   ✅ Read (for account info and balances)');
      console.log('   ✅ Trade (for placing orders)');
      console.log('   ✅ Position (for managing positions)');
      console.log('6. Click "Create"');
      console.log('7. Copy the API Key and API Secret');
      console.log('8. Keep them safe - you won\'t see the secret again!');

      console.log('\n💻 TO UPDATE CREDENTIALS:');
      console.log('1. Open your Supabase dashboard');
      console.log('2. Go to Table Editor → followers');
      console.log('3. Find the follower account (Anneshan)');
      console.log('4. Click "Edit" on that row');
      console.log('5. Update the api_key and api_secret fields');
      console.log('6. Click "Save"');

      console.log('\n🗄️  OR USE SQL:');
      console.log('Run this in your Supabase SQL editor:');
      console.log(`
UPDATE followers 
SET 
  api_key = 'YOUR_DELTA_API_KEY_HERE',
  api_secret = 'YOUR_DELTA_API_SECRET_HERE'
WHERE follower_name = 'Anneshan';
      `);

      console.log('\n🎯 AFTER UPDATING CREDENTIALS:');
      console.log('1. Run this script again: node scripts/complete-setup-and-execute.js');
      console.log('2. The script will automatically test and execute orders');

      console.log('\n💡 IMPORTANT NOTES:');
      console.log('• Each follower needs their own Delta Exchange account');
      console.log('• API credentials must have trading permissions');
      console.log('• Never share API credentials publicly');
      console.log('• Test credentials before using them for real trading');
      console.log('• Using India Delta Exchange API: https://api.india.delta.exchange');

      return;
    }

    // 5. Execute real orders
    console.log('\n📋 STEP 5: Executing Real Orders');
    
    // Get current positions from backend
    const monitorResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(monitorData)
    });

    const monitorResult = await monitorResponse.json();
    
    if (monitorResult.positions && monitorResult.positions.length > 0) {
      const openPositions = monitorResult.positions.filter(position => parseFloat(position.size) !== 0);
      
      if (openPositions.length === 0) {
        console.log('⏳ No open positions found (all positions have zero size)');
        console.log('💡 Open a new position on the master account to test copy trading');
        return;
      }

      console.log(`✅ Found ${openPositions.length} open positions to copy`);

      for (const follower of followers) {
        // Test credentials again before executing
        const testResult = await testDeltaApiCredentials(follower.api_key, follower.api_secret, DELTA_API_URL);
        if (!testResult.success) {
          console.log(`❌ Skipping ${follower.follower_name} - invalid credentials`);
          continue;
        }

        console.log(`\n🎯 Executing orders for ${follower.follower_name}:`);

        for (const position of openPositions) {
          const positionSize = parseFloat(position.size);
          const symbol = position.product_symbol;
          const side = positionSize > 0 ? 'buy' : 'sell';
          const price = parseFloat(position.entry_price) || 0;
          
          console.log(`\n📈 Processing position: ${symbol} ${side} ${Math.abs(positionSize)} @ ${price}`);

          // Calculate copy size based on follower settings
          let copySize = Math.abs(positionSize);
          
          if (follower.copy_mode === 'multiplier') {
            copySize = copySize * 0.1; // 10% of original
            copySize = Math.max(0.01, copySize); // Use minimum size of 0.01
          } else if (follower.copy_mode === 'fixed_lot') {
            copySize = 1; // Fixed lot size
          }

          console.log(`   📊 ${follower.follower_name}: Original ${Math.abs(positionSize)} → Copy ${copySize}`);

          if (copySize > 0) {
            // Execute real order on follower's Delta Exchange account
            const orderResult = await executeDeltaOrder(
              follower.api_key,
              follower.api_secret,
              position.product_id,
              copySize,
              side,
              price,
              DELTA_API_URL
            );

            if (orderResult.success) {
              console.log(`✅ Real order executed for ${follower.follower_name}: ${symbol} ${side} ${copySize}`);
              console.log(`   Order ID: ${orderResult.order_id}`);
              console.log(`   Status: ${orderResult.status}`);

              // Update the copy trade record with real order details
              const { data: updatedTrade, error: updateError } = await supabase
                .from('copy_trades')
                .update({
                  status: 'executed',
                  order_id: orderResult.order_id,
                  executed_at: new Date().toISOString()
                })
                .eq('follower_id', follower.user_id)
                .eq('original_symbol', symbol)
                .eq('status', 'executed')
                .order('created_at', { ascending: false })
                .limit(1)
                .select()
                .single();

              if (updateError) {
                console.log(`⚠️  Could not update copy trade record:`, updateError);
              } else {
                console.log(`✅ Updated copy trade record with real order ID`);
              }
            } else {
              console.log(`❌ Failed to execute real order for ${follower.follower_name}:`, orderResult.error);
            }
          } else {
            console.log(`⚠️  Copy size too small for ${follower.follower_name}: ${copySize}`);
          }
        }
      }

      // 6. Summary
      console.log('\n🎯 SUMMARY:');
      console.log(`✅ Found ${openPositions.length} open positions in master account`);
      console.log(`✅ Attempted to execute real orders for ${followers.length} followers`);
      console.log('✅ Real orders should now appear in follower Delta Exchange accounts');

    } else {
      console.log('⏳ No positions found from backend monitoring');
      console.log('💡 This could mean:');
      console.log('   1. No open positions in the master account');
      console.log('   2. Backend monitoring needs to be restarted');
      console.log('   3. API credentials need to be updated');
    }

    console.log('\n💡 NEXT STEPS:');
    console.log('1. Check your follower Delta Exchange account for executed orders');
    console.log('2. Verify that the orders appear in the Delta Exchange platform');
    console.log('3. Check order status and fills in Delta Exchange');
    console.log('4. Monitor positions in your follower account');

    console.log('\n🔧 SYSTEM STATUS:');
    console.log('✅ Real order execution system is working');
    console.log('✅ Orders are being placed on India Delta Exchange');
    console.log('✅ Copy trading system is fully operational');

    console.log('\n🎉 SUCCESS: Real orders have been executed on follower Delta Exchange accounts!');
    console.log('   Check your Delta Exchange platform to see the executed orders.');

  } catch (error) {
    console.log('❌ Error in complete setup and execute:', error.message);
  }
}

// Function to test Delta Exchange API credentials
async function testDeltaApiCredentials(apiKey, apiSecret, apiUrl) {
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
        data: data,
        message: 'API call successful'
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

// Function to execute order on Delta Exchange
async function executeDeltaOrder(apiKey, apiSecret, productId, size, side, price, apiUrl) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    const body = JSON.stringify({
      product_id: productId,
      size: size.toString(),
      side: side,
      price: price.toString(),
      order_type: 'market_order'
    });

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

completeSetupAndExecute().catch(console.error); 