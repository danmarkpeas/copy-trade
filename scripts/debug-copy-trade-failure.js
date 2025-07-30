const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugCopyTradeFailure() {
  console.log('🔍 DEBUGGING COPY TRADE FAILURE\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the most recent failed copy trade
    const { data: recentCopyTrades, error } = await supabase
      .from('copy_trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error fetching copy trades:', error);
      return;
    }

    console.log('📋 RECENT COPY TRADES:');
    recentCopyTrades.forEach((trade, index) => {
      console.log(`\n${index + 1}. Copy Trade Details:`);
      console.log(`   ID: ${trade.id}`);
      console.log(`   Symbol: ${trade.original_symbol}`);
      console.log(`   Side: ${trade.original_side}`);
      console.log(`   Original Size: ${trade.original_size}`);
      console.log(`   Copied Size: ${trade.copied_size}`);
      console.log(`   Status: ${trade.status}`);
      console.log(`   Order ID: ${trade.order_id}`);
      console.log(`   Entry Time: ${trade.entry_time}`);
      console.log(`   Created: ${trade.created_at}`);
      if (trade.error_message) {
        console.log(`   Error: ${trade.error_message}`);
      }
    });

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
    console.log(`\n👤 TESTING FOLLOWER: ${follower.follower_name}`);

    // Test the exact copy trade that should be executed
    const testTrade = {
      symbol: 'POLUSD',
      side: 'sell',
      size: 1,
      price: 0.2331
    };

    console.log(`\n🎯 TESTING COPY TRADE EXECUTION:`);
    console.log(`   Symbol: ${testTrade.symbol}`);
    console.log(`   Side: ${testTrade.side}`);
    console.log(`   Size: ${testTrade.size}`);
    console.log(`   Price: ${testTrade.price}`);

    // Test follower balance
    const balance = await getFollowerBalance(follower);
    console.log(`\n💰 FOLLOWER BALANCE:`);
    if (balance) {
      console.log(`   USD: ${balance.usd}`);
      console.log(`   Available for trading: ${balance.usd}`);
    } else {
      console.log(`   ❌ Failed to get balance`);
    }

    // Test order placement
    const orderResult = await placeTestOrder(follower, testTrade);
    console.log(`\n📊 ORDER PLACEMENT RESULT:`);
    if (orderResult.success) {
      console.log(`   ✅ Order placed successfully`);
      console.log(`   Order ID: ${orderResult.orderId}`);
      console.log(`   Status: ${orderResult.status}`);
    } else {
      console.log(`   ❌ Order placement failed`);
      console.log(`   Error: ${orderResult.error}`);
    }

    // Check current follower positions
    const position = await getFollowerPosition(follower, 'POLUSD');
    console.log(`\n📈 CURRENT FOLLOWER POSITION:`);
    if (position && position.size !== 0) {
      console.log(`   Symbol: ${position.product_symbol}`);
      console.log(`   Size: ${position.size}`);
      console.log(`   Side: ${position.size > 0 ? 'BUY' : 'SELL'}`);
      console.log(`   Entry Price: ${position.entry_price}`);
      console.log(`   Unrealized PnL: ${position.unrealized_pnl}`);
    } else {
      console.log(`   ✅ No open positions`);
    }

    console.log(`\n🔍 DIAGNOSIS:`);
    if (!balance) {
      console.log(`❌ ISSUE: Cannot fetch follower balance - API credentials may be invalid`);
    } else if (parseFloat(balance.usd) < 0.05) {
      console.log(`❌ ISSUE: Insufficient balance - Need at least $0.05 USD`);
    } else if (!orderResult.success) {
      console.log(`❌ ISSUE: Order placement failing - ${orderResult.error}`);
    } else {
      console.log(`✅ All tests passed - Copy trade should work`);
    }

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
      const usdBalance = data.result.find(b => b.currency === 'USD');
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

async function placeTestOrder(follower, trade) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  const productIds = {
    'POLUSD': 39943
  };
  
  try {
    const productId = productIds[trade.symbol];
    if (!productId) {
      return { success: false, error: 'Invalid symbol' };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    const message = `POST${timestamp}${path}`;
    const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

    const orderData = {
      product_id: productId,
      size: trade.size,
      side: trade.side,
      order_type: 'market_order',
      time_in_force: 'gtc'
    };

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
        error: data.message || 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function getFollowerPosition(follower, symbol) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  const productIds = {
    'POLUSD': 39943
  };
  
  try {
    const productId = productIds[symbol];
    if (!productId) {
      return null;
    }
    
    const timestamp = Math.floor(Date.now() / 1000);
    const path = `/v2/positions?product_id=${productId}`;
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
      const positions = Array.isArray(data.result) ? data.result : [data.result];
      return positions.find(pos => pos.size !== 0) || null;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

debugCopyTradeFailure().catch(console.error); 