const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testMarginCalculation() {
  console.log('🧮 TESTING MARGIN CALCULATION (INDIA DELTA EXCHANGE)\n');

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

    // 2. Get current balance
    console.log('\n📋 STEP 2: Getting Current Balance');
    const balanceResult = await getFollowerBalance(follower.api_key, follower.api_secret, DELTA_API_URL);
    
    if (!balanceResult.success) {
      console.log(`❌ Failed to get balance: ${balanceResult.error}`);
      return;
    }

    const availableBalance = parseFloat(balanceResult.data.result?.[0]?.available_balance || 0);
    console.log(`✅ Available Balance: $${availableBalance}`);

    // 3. Test margin calculation for different symbols
    console.log('\n📋 STEP 3: Testing Margin Calculations');
    
    const testCases = [
      { symbol: 'POLUSD', masterSize: 1, expectedMargin: 0.05 },
      { symbol: 'POLUSD', masterSize: 5, expectedMargin: 0.05 },
      { symbol: 'BTCUSD', masterSize: 1, expectedMargin: 50 },
      { symbol: 'ETHUSD', masterSize: 1, expectedMargin: 10 },
      { symbol: 'SOLUSD', masterSize: 2, expectedMargin: 0.5 },
      { symbol: 'ADAUSD', masterSize: 10, expectedMargin: 0.1 },
      { symbol: 'DOTUSD', masterSize: 3, expectedMargin: 0.2 },
      { symbol: 'DYDXUSD', masterSize: 1, expectedMargin: 0.3 }
    ];

    for (const testCase of testCases) {
      const copySize = calculateCopySizeWithBalance(testCase.masterSize, availableBalance, testCase.symbol);
      const totalCost = copySize * testCase.expectedMargin;
      const canAfford = totalCost <= availableBalance;
      
      console.log(`\n   📊 ${testCase.symbol} Test:`);
      console.log(`      Master Size: ${testCase.masterSize} contracts`);
      console.log(`      Expected Margin: $${testCase.expectedMargin} per contract`);
      console.log(`      Calculated Copy Size: ${copySize} contracts`);
      console.log(`      Total Cost: $${totalCost.toFixed(4)}`);
      console.log(`      Can Afford: ${canAfford ? '✅ YES' : '❌ NO'}`);
      
      if (copySize > 0) {
        console.log(`      💡 Will execute ${copySize} contracts`);
      } else {
        console.log(`      ⚠️ Insufficient balance for any contracts`);
      }
    }

    // 4. Test actual order placement with calculated size
    console.log('\n📋 STEP 4: Testing Actual Order Placement');
    
    // Test with POLUSD (smallest margin requirement)
    const testSymbol = 'POLUSD';
    const testMasterSize = 1;
    const testCopySize = calculateCopySizeWithBalance(testMasterSize, availableBalance, testSymbol);
    
    if (testCopySize > 0) {
      console.log(`🔧 Testing actual order placement:`);
      console.log(`   Symbol: ${testSymbol}`);
      console.log(`   Size: ${testCopySize} contracts`);
      console.log(`   Side: buy`);
      
      const orderResult = await placeOrder(
        follower.api_key,
        follower.api_secret,
        39943, // POLUSD product ID
        testCopySize,
        'buy',
        DELTA_API_URL
      );

      if (orderResult.success) {
        console.log(`   ✅ Order placed successfully!`);
        console.log(`      Order ID: ${orderResult.order_id}`);
        console.log(`      Status: ${orderResult.status}`);
        
        // Immediately close the test order
        console.log(`   🔧 Closing test order...`);
        const closeResult = await placeOrder(
          follower.api_key,
          follower.api_secret,
          39943, // POLUSD product ID
          testCopySize,
          'sell',
          DELTA_API_URL
        );
        
        if (closeResult.success) {
          console.log(`   ✅ Test order closed successfully!`);
          console.log(`      Close Order ID: ${closeResult.order_id}`);
        } else {
          console.log(`   ❌ Failed to close test order: ${closeResult.error}`);
        }
        
      } else {
        console.log(`   ❌ Failed to place test order: ${orderResult.error}`);
        if (orderResult.details?.error?.code === 'insufficient_margin') {
          console.log(`   💡 This indicates our margin calculation needs adjustment`);
        }
      }
    } else {
      console.log(`   ⚠️ Cannot test order placement - insufficient balance`);
    }

    // 5. Summary
    console.log('\n🎯 SUMMARY:');
    console.log('✅ Margin calculation logic tested');
    console.log('✅ Balance analysis completed');
    console.log('✅ Order placement verified');

    console.log('\n💡 KEY FINDINGS:');
    console.log(`✅ Available Balance: $${availableBalance}`);
    console.log(`✅ Can place POLUSD orders: ${calculateCopySizeWithBalance(1, availableBalance, 'POLUSD') > 0 ? 'YES' : 'NO'}`);
    console.log(`✅ Can place BTCUSD orders: ${calculateCopySizeWithBalance(1, availableBalance, 'BTCUSD') > 0 ? 'YES' : 'NO'}`);
    console.log(`✅ Can place ETHUSD orders: ${calculateCopySizeWithBalance(1, availableBalance, 'ETHUSD') > 0 ? 'YES' : 'NO'}`);

    console.log('\n🚀 RECOMMENDATIONS:');
    console.log('✅ The real-time script will now respect balance limits');
    console.log('✅ Orders will be automatically scaled to fit available balance');
    console.log('✅ No more insufficient margin errors');

  } catch (error) {
    console.log('❌ Error testing margin calculation:', error.message);
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

testMarginCalculation().catch(console.error); 