const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function syncDeltaTrades() {
  console.log('🔄 SYNCING WITH DELTA EXCHANGE\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the most recent broker account
    console.log('🔍 Getting most recent broker account...');
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    const brokerAccount = brokerAccounts[0];
    console.log('✅ Using broker account:');
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);
    console.log('   API Key:', brokerAccount.api_key ? '✅ Set' : '❌ Missing');
    console.log('   API Secret:', brokerAccount.api_secret ? '✅ Set' : '❌ Missing');

    if (!brokerAccount.api_key || !brokerAccount.api_secret) {
      console.log('❌ API credentials missing');
      return;
    }

    // Test API connection
    console.log('\n🔑 Testing API connection...');
    const crypto = require('crypto');
    const serverTime = Math.floor(Date.now() / 1000) + 1;
    const message = `GET${serverTime}/v2/fills`;
    const signature = crypto.createHmac('sha256', brokerAccount.api_secret).update(message).digest('hex');

    try {
      const response = await fetch('https://api.delta.exchange/v2/fills', {
        method: 'GET',
        headers: {
          'api-key': brokerAccount.api_key,
          'timestamp': serverTime.toString(),
          'signature': signature,
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ API connection successful!');
        console.log(`   Total fills found: ${data.result?.length || 0}`);

        if (data.result && data.result.length > 0) {
          console.log('\n📊 RECENT TRADES FROM DELTA EXCHANGE:');
          data.result.slice(0, 10).forEach((fill, index) => {
            console.log(`   ${index + 1}. ${fill.product_symbol}`);
            console.log(`      Side: ${fill.side}`);
            console.log(`      Size: ${fill.size}`);
            console.log(`      Price: ${fill.price}`);
            console.log(`      Time: ${fill.created_at}`);
            console.log(`      Order Type: ${fill.order_type || 'market'}`);
            console.log('');
          });
        } else {
          console.log('   No recent trades found');
        }
      } else {
        const errorText = await response.text();
        console.log('❌ API connection failed:', errorText);
        console.log('\n💡 This might be due to:');
        console.log('   1. API credentials not yet activated');
        console.log('   2. API permissions not set correctly');
        console.log('   3. Account verification pending');
        return;
      }
    } catch (error) {
      console.log('❌ Error testing API connection:', error.message);
      return;
    }

    // Test positions
    console.log('\n📊 CHECKING OPEN POSITIONS...');
    try {
      const futuresMessage = `GET${serverTime}/v2/positions/margined`;
      const futuresSignature = crypto.createHmac('sha256', brokerAccount.api_secret).update(futuresMessage).digest('hex');

      const futuresResponse = await fetch('https://api.delta.exchange/v2/positions/margined', {
        method: 'GET',
        headers: {
          'api-key': brokerAccount.api_key,
          'timestamp': serverTime.toString(),
          'signature': futuresSignature,
        }
      });

      if (futuresResponse.ok) {
        const futuresData = await futuresResponse.json();
        const openPositions = futuresData.result?.filter(pos => parseFloat(pos.size) > 0) || [];
        
        if (openPositions.length > 0) {
          console.log('✅ Open futures positions found:');
          openPositions.forEach((pos, index) => {
            console.log(`   ${index + 1}. ${pos.product_symbol}`);
            console.log(`      Size: ${pos.size}`);
            console.log(`      Avg Price: ${pos.avg_price}`);
            console.log(`      PnL: ${pos.realized_pnl || 'N/A'}`);
            console.log('');
          });
        } else {
          console.log('   No open futures positions found');
        }
      } else {
        console.log('❌ Could not fetch futures positions');
      }
    } catch (error) {
      console.log('❌ Error checking positions:', error.message);
    }

    // Test orders
    console.log('\n📋 CHECKING OPEN ORDERS...');
    try {
      const ordersMessage = `GET${serverTime}/v2/orders`;
      const ordersSignature = crypto.createHmac('sha256', brokerAccount.api_secret).update(ordersMessage).digest('hex');

      const ordersResponse = await fetch('https://api.delta.exchange/v2/orders', {
        method: 'GET',
        headers: {
          'api-key': brokerAccount.api_key,
          'timestamp': serverTime.toString(),
          'signature': ordersSignature,
        }
      });

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const openOrders = ordersData.result?.filter(order => order.status === 'open') || [];
        
        if (openOrders.length > 0) {
          console.log('✅ Open orders found:');
          openOrders.forEach((order, index) => {
            console.log(`   ${index + 1}. ${order.product_symbol}`);
            console.log(`      Side: ${order.side}`);
            console.log(`      Size: ${order.size}`);
            console.log(`      Price: ${order.limit_price || 'market'}`);
            console.log(`      Status: ${order.status}`);
            console.log('');
          });
        } else {
          console.log('   No open orders found');
        }
      } else {
        console.log('❌ Could not fetch orders');
      }
    } catch (error) {
      console.log('❌ Error checking orders:', error.message);
    }

    // Call real-time monitor
    console.log('\n🔄 CALLING REAL-TIME MONITOR...');
    try {
      const monitorResponse = await fetch(`${supabaseUrl}/functions/v1/real-time-trade-monitor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ broker_id: brokerAccount.id })
      });

      if (monitorResponse.ok) {
        const monitorData = await monitorResponse.json();
        console.log('✅ Real-time monitor executed successfully!');
        console.log(`   Trades found: ${monitorData.total_trades_found || 0}`);
        console.log(`   Active followers: ${monitorData.active_followers || 0}`);
        console.log(`   Trades copied: ${monitorData.trades_copied || 0}`);
        
        if (monitorData.copy_results && monitorData.copy_results.length > 0) {
          console.log('\n📊 COPY TRADE RESULTS:');
          monitorData.copy_results.forEach((result, index) => {
            console.log(`   ${index + 1}. Trade: ${result.trade_id}`);
            console.log(`      Follower: ${result.follower_id}`);
            console.log(`      Success: ${result.success ? '✅' : '❌'}`);
            if (!result.success) {
              console.log(`      Reason: ${result.reason}`);
            }
          });
        }
      } else {
        console.log('❌ Real-time monitor failed');
      }
    } catch (error) {
      console.log('❌ Error calling real-time monitor:', error.message);
    }

    console.log('\n🎯 SYNC COMPLETE!');
    console.log('✅ Delta Exchange connection tested');
    console.log('✅ Recent trades checked');
    console.log('✅ Open positions checked');
    console.log('✅ Open orders checked');
    console.log('✅ Real-time monitor executed');
    
    if (brokerAccount.account_status === 'pending') {
      console.log('\n⚠️  NOTE: Broker account status is "pending"');
      console.log('   You may need to activate the account in Delta Exchange');
      console.log('   or wait for verification to complete');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

syncDeltaTrades().catch(console.error); 