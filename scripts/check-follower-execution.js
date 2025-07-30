const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

async function checkFollowerExecution() {
  console.log('🔍 CHECKING FOLLOWER TRADE EXECUTION\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Get the follower's broker account details
    console.log('📋 STEP 1: Getting Follower Broker Account');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*, broker_accounts!followers_follower_broker_account_id_fkey(*)')
      .eq('follower_name', 'Anneshan')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active follower found for Anneshan');
      return;
    }

    const follower = followers[0];
    const followerBroker = follower.broker_accounts;
    
    console.log('✅ Follower found:');
    console.log(`   Name: ${follower.follower_name}`);
    console.log(`   User ID: ${follower.user_id}`);
    console.log(`   Copy Mode: ${follower.copy_mode}`);
    console.log(`   Copy Ratio: ${follower.copy_ratio}`);
    
    if (followerBroker) {
      console.log(`   Broker Account: ${followerBroker.account_name}`);
      console.log(`   API Key: ${followerBroker.api_key?.substring(0, 10)}...`);
    } else {
      console.log('   ⚠️  No broker account linked to follower');
      return;
    }

    // 2. Check recent copy trades in database
    console.log('\n📊 STEP 2: Recent Copy Trades in Database');
    const { data: copyTrades, error: tradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .eq('follower_id', follower.user_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (tradesError) {
      console.log('❌ Error fetching copy trades:', tradesError);
    } else {
      console.log(`✅ Found ${copyTrades?.length || 0} recent copy trades:`);
      if (copyTrades && copyTrades.length > 0) {
        copyTrades.forEach((trade, index) => {
          const timeAgo = Math.floor((Date.now() - new Date(trade.created_at).getTime()) / (1000 * 60));
          console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size} (${trade.status})`);
          console.log(`      Master Trade ID: ${trade.master_trade_id}`);
          console.log(`      Follower Order ID: ${trade.follower_order_id || 'Not set'}`);
          console.log(`      Entry Time: ${trade.entry_time}`);
          console.log(`      Time Ago: ${timeAgo} minutes`);
          console.log('');
        });
      }
    }

    // 3. Check follower's actual positions via API
    console.log('🔌 STEP 3: Checking Follower Positions via API');
    if (followerBroker.api_key && followerBroker.api_secret) {
      try {
        const positions = await getFollowerPositions(followerBroker);
        console.log(`✅ Follower has ${positions.length} open positions:`);
        
        if (positions.length > 0) {
          positions.forEach((pos, index) => {
            console.log(`   ${index + 1}. ${pos.product_symbol} ${pos.size} @ ${pos.entry_price}`);
            console.log(`      Unrealized PnL: ${pos.unrealized_pnl}`);
            console.log(`      Mark Price: ${pos.mark_price}`);
            console.log('');
          });
        } else {
          console.log('   📭 No open positions found');
        }
      } catch (error) {
        console.log('❌ Error fetching follower positions:', error.message);
      }
    }

    // 4. Check follower's recent fills/orders
    console.log('📋 STEP 4: Checking Follower Recent Fills');
    if (followerBroker.api_key && followerBroker.api_secret) {
      try {
        const fills = await getFollowerFills(followerBroker);
        console.log(`✅ Follower has ${fills.length} recent fills:`);
        
        if (fills.length > 0) {
          fills.slice(0, 5).forEach((fill, index) => {
            const timeAgo = Math.floor((Date.now() - new Date(fill.timestamp).getTime()) / (1000 * 60));
            console.log(`   ${index + 1}. ${fill.product_symbol} ${fill.side} ${fill.size} @ ${fill.price}`);
            console.log(`      Fill ID: ${fill.fill_id}`);
            console.log(`      Time Ago: ${timeAgo} minutes`);
            console.log('');
          });
        } else {
          console.log('   📭 No recent fills found');
        }
      } catch (error) {
        console.log('❌ Error fetching follower fills:', error.message);
      }
    }

    // 5. Analysis
    console.log('🎯 EXECUTION ANALYSIS:');
    const executedTrades = copyTrades?.filter(t => t.status === 'executed') || [];
    const pendingTrades = copyTrades?.filter(t => t.status === 'pending') || [];
    const failedTrades = copyTrades?.filter(t => t.status === 'failed') || [];
    
    console.log(`   ✅ Executed: ${executedTrades.length}`);
    console.log(`   ⏳ Pending: ${pendingTrades.length}`);
    console.log(`   ❌ Failed: ${failedTrades.length}`);
    
    if (executedTrades.length > 0) {
      console.log('   🎉 Copy trading is working! Trades are being executed.');
    } else {
      console.log('   ⚠️  No executed copy trades found. Check the copy trading engine.');
    }

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Check if follower has sufficient balance for trades');
    console.log('2. Verify API permissions (Read, Trade)');
    console.log('3. Check copy trading engine logs for errors');
    console.log('4. Monitor real-time WebSocket connections');

  } catch (error) {
    console.log('❌ Error checking follower execution:', error.message);
  }
}

async function getFollowerPositions(brokerAccount) {
  const API_KEY = brokerAccount.api_key;
  const API_SECRET = brokerAccount.api_secret;
  const BASE_URL = 'https://api.india.delta.exchange';

  function generateSignature(secret, prehashString) {
    return crypto.createHmac('sha256', secret).update(prehashString).digest('hex');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'GET';
  const path = '/v2/positions/margined';
  const queryString = '';
  const payload = '';
  
  const prehashString = method + timestamp + path + queryString + payload;
  const signature = generateSignature(API_SECRET, prehashString);

  const headers = {
    'Accept': 'application/json',
    'api-key': API_KEY,
    'signature': signature,
    'timestamp': timestamp,
    'User-Agent': 'copy-trading-platform'
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: headers
  });

  if (response.ok) {
    const data = await response.json();
    return data.result || [];
  } else {
    const errorText = await response.text();
    throw new Error(`Failed to fetch positions: ${errorText}`);
  }
}

async function getFollowerFills(brokerAccount) {
  const API_KEY = brokerAccount.api_key;
  const API_SECRET = brokerAccount.api_secret;
  const BASE_URL = 'https://api.india.delta.exchange';

  function generateSignature(secret, prehashString) {
    return crypto.createHmac('sha256', secret).update(prehashString).digest('hex');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'GET';
  const path = '/v2/fills';
  const queryString = '';
  const payload = '';
  
  const prehashString = method + timestamp + path + queryString + payload;
  const signature = generateSignature(API_SECRET, prehashString);

  const headers = {
    'Accept': 'application/json',
    'api-key': API_KEY,
    'signature': signature,
    'timestamp': timestamp,
    'User-Agent': 'copy-trading-platform'
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: headers
  });

  if (response.ok) {
    const data = await response.json();
    return data.result || [];
  } else {
    const errorText = await response.text();
    throw new Error(`Failed to fetch fills: ${errorText}`);
  }
}

checkFollowerExecution().catch(console.error); 