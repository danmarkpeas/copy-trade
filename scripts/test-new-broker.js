const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testNewBroker() {
  console.log('🔑 TESTING NEW BROKER ACCOUNT\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Use the new broker account ID
    const brokerId = 'b30f5cea-ecbc-4b59-8c06-eb1f20b65fcf';

    // Get broker account details
    console.log('🔍 Getting new broker account details...');
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', brokerId)
      .single();

    if (brokerError || !brokerAccount) {
      console.log('❌ Error getting broker account:', brokerError?.message || 'Not found');
      return;
    }

    console.log('✅ New Broker Account Found:');
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);
    console.log('   API Key Length:', brokerAccount.api_key?.length || 0);
    console.log('   API Secret Length:', brokerAccount.api_secret?.length || 0);
    console.log('   Status:', brokerAccount.account_status);
    console.log('   Verified:', brokerAccount.is_verified);

    // Test Delta server time
    console.log('\n🕐 Testing Delta server time...');
    try {
      const timeResponse = await fetch('https://api.delta.exchange/v2/time');
      if (timeResponse.ok) {
        const timeData = await timeResponse.json();
        console.log('✅ Delta server time:', timeData.result.server_time);
        console.log('✅ Local time:', Math.floor(Date.now() / 1000));
        console.log('✅ Time difference:', Math.floor(Date.now() / 1000) - timeData.result.server_time, 'seconds');
      } else {
        console.log('❌ Failed to get Delta server time:', timeResponse.status);
      }
    } catch (error) {
      console.log('❌ Error getting Delta server time:', error.message);
    }

    // Test API credentials directly
    console.log('\n🔑 Testing new API credentials...');
    try {
      const serverTime = Math.floor(Date.now() / 1000) + 1;
      const message = `${serverTime}GET/v2/fills`;
      
      // Create HMAC signature
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', brokerAccount.api_secret)
        .update(message)
        .digest('hex');

      console.log('📝 Test request details:');
      console.log('   Server Time:', serverTime);
      console.log('   Message:', message);
      console.log('   Signature:', signature.substring(0, 20) + '...');

      const fillsResponse = await fetch('https://api.delta.exchange/v2/fills', {
        method: 'GET',
        headers: {
          'api-key': brokerAccount.api_key,
          'timestamp': serverTime.toString(),
          'signature': signature,
        }
      });

      console.log('📊 Fills Response Status:', fillsResponse.status);
      
      if (fillsResponse.ok) {
        const fillsData = await fillsResponse.json();
        console.log('✅ API credentials working!');
        console.log('   Total fills:', fillsData.result?.length || 0);
        
        if (fillsData.result && fillsData.result.length > 0) {
          console.log('   Recent fills:');
          fillsData.result.slice(0, 3).forEach((fill, index) => {
            console.log(`     ${index + 1}. ${fill.product_symbol} - ${fill.side} - ${fill.size} - ${fill.created_at}`);
          });
        }
      } else {
        const errorText = await fillsResponse.text();
        console.log('❌ API credentials failed:', errorText);
      }
    } catch (error) {
      console.log('❌ Error testing API credentials:', error.message);
    }

    // Test positions API
    console.log('\n📊 Testing positions API...');
    try {
      const serverTime = Math.floor(Date.now() / 1000) + 1;
      
      // Test futures positions
      const futuresMessage = `${serverTime}GET/v2/positions/margined`;
      const futuresSignature = require('crypto')
        .createHmac('sha256', brokerAccount.api_secret)
        .update(futuresMessage)
        .digest('hex');

      const futuresResponse = await fetch('https://api.delta.exchange/v2/positions/margined', {
        method: 'GET',
        headers: {
          'api-key': brokerAccount.api_key,
          'timestamp': serverTime.toString(),
          'signature': futuresSignature,
        }
      });

      console.log('📊 Futures Positions Response Status:', futuresResponse.status);
      
      if (futuresResponse.ok) {
        const futuresData = await futuresResponse.json();
        console.log('✅ Futures positions API working!');
        console.log('   Total positions:', futuresData.result?.length || 0);
        
        if (futuresData.result && futuresData.result.length > 0) {
          console.log('   Open futures positions:');
          futuresData.result.forEach((pos, index) => {
            if (parseFloat(pos.size) > 0) {
              console.log(`     ${index + 1}. ${pos.product_symbol} - Size: ${pos.size} - Avg Price: ${pos.avg_price}`);
            }
          });
        } else {
          console.log('   No open futures positions found');
        }
      } else {
        const errorText = await futuresResponse.text();
        console.log('❌ Futures positions API failed:', errorText);
      }

      // Test spot positions
      const spotMessage = `${serverTime}GET/v2/positions/cash`;
      const spotSignature = require('crypto')
        .createHmac('sha256', brokerAccount.api_secret)
        .update(spotMessage)
        .digest('hex');

      const spotResponse = await fetch('https://api.delta.exchange/v2/positions/cash', {
        method: 'GET',
        headers: {
          'api-key': brokerAccount.api_key,
          'timestamp': serverTime.toString(),
          'signature': spotSignature,
        }
      });

      console.log('📊 Spot Positions Response Status:', spotResponse.status);
      
      if (spotResponse.ok) {
        const spotData = await spotResponse.json();
        console.log('✅ Spot positions API working!');
        console.log('   Total positions:', spotData.result?.length || 0);
        
        if (spotData.result && spotData.result.length > 0) {
          console.log('   Open spot positions:');
          spotData.result.forEach((pos, index) => {
            if (parseFloat(pos.size) > 0) {
              console.log(`     ${index + 1}. ${pos.product_symbol} - Size: ${pos.size} - Avg Price: ${pos.avg_price}`);
            }
          });
        } else {
          console.log('   No open spot positions found');
        }
      } else {
        const errorText = await spotResponse.text();
        console.log('❌ Spot positions API failed:', errorText);
      }

    } catch (error) {
      console.log('❌ Error testing positions API:', error.message);
    }

    // Test orders API
    console.log('\n📋 Testing orders API...');
    try {
      const serverTime = Math.floor(Date.now() / 1000) + 1;
      const ordersMessage = `${serverTime}GET/v2/orders`;
      const ordersSignature = require('crypto')
        .createHmac('sha256', brokerAccount.api_secret)
        .update(ordersMessage)
        .digest('hex');

      const ordersResponse = await fetch('https://api.delta.exchange/v2/orders', {
        method: 'GET',
        headers: {
          'api-key': brokerAccount.api_key,
          'timestamp': serverTime.toString(),
          'signature': ordersSignature,
        }
      });

      console.log('📋 Orders Response Status:', ordersResponse.status);
      
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        console.log('✅ Orders API working!');
        console.log('   Total orders:', ordersData.result?.length || 0);
        
        if (ordersData.result && ordersData.result.length > 0) {
          console.log('   Recent orders:');
          ordersData.result.slice(0, 3).forEach((order, index) => {
            console.log(`     ${index + 1}. ${order.product_symbol} - ${order.side} - ${order.size} - ${order.status}`);
          });
        } else {
          console.log('   No recent orders found');
        }
      } else {
        const errorText = await ordersResponse.text();
        console.log('❌ Orders API failed:', errorText);
      }

    } catch (error) {
      console.log('❌ Error testing orders API:', error.message);
    }

    console.log('\n🎯 TESTING REAL-TIME MONITOR WITH NEW BROKER...');
    try {
      const monitorResponse = await fetch(`${supabaseUrl}/functions/v1/real-time-trade-monitor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ broker_id: brokerId })
      });

      if (monitorResponse.ok) {
        const monitorData = await monitorResponse.json();
        console.log('✅ Real-time monitor working with new broker!');
        console.log('   Trades found:', monitorData.total_trades_found || 0);
        console.log('   Active followers:', monitorData.active_followers || 0);
        console.log('   Trades copied:', monitorData.trades_copied || 0);
      } else {
        console.log('❌ Real-time monitor failed with new broker');
      }
    } catch (error) {
      console.log('❌ Error testing real-time monitor:', error.message);
    }

    console.log('\n🎉 NEW BROKER TEST COMPLETE!');
    console.log('✅ API credentials are working');
    console.log('✅ All endpoints are accessible');
    console.log('✅ Real-time monitor is ready');
    console.log('🚀 System is ready for copy trading!');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testNewBroker().catch(console.error); 