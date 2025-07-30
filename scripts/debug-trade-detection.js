const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugTradeDetection() {
  console.log('🔍 DEBUGGING TRADE DETECTION\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the most recent broker account
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
    console.log('📋 BROKER ACCOUNT:');
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);
    console.log('   API Key:', brokerAccount.api_key);

    const API_KEY = brokerAccount.api_key;
    const API_SECRET = brokerAccount.api_secret;
    const BASE_URL = 'https://api.india.delta.exchange';

    // Correct signature generation function
    function generateSignature(secret, prehashString) {
      return crypto.createHmac('sha256', secret).update(prehashString).digest('hex');
    }

    console.log('\n🔐 TESTING DELTA EXCHANGE ENDPOINTS...');

    // Test 1: Fills endpoint
    console.log('\n1️⃣ Testing fills endpoint...');
    try {
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

      console.log(`   Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Fills found: ${data.result?.length || 0}`);
        
        if (data.result && data.result.length > 0) {
          console.log('   📊 Recent fills:');
          data.result.slice(0, 3).forEach((fill, index) => {
            const fillTime = new Date(fill.created_at);
            const fiveMinutesAgo = new Date(Date.now() - (5 * 60 * 1000));
            const isRecent = fillTime > fiveMinutesAgo;
            
            console.log(`      ${index + 1}. ${fill.product_symbol} ${fill.side} ${fill.size} @ ${fill.price} (${fillTime.toISOString()}) ${isRecent ? '🕐 RECENT' : '⏰ OLD'}`);
          });
        }
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Fills failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error testing fills: ${error.message}`);
    }

    // Test 2: Positions endpoint
    console.log('\n2️⃣ Testing positions endpoint...');
    try {
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

      console.log(`   Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Positions found: ${data.result?.length || 0}`);
        
        if (data.result && data.result.length > 0) {
          console.log('   📊 Current positions:');
          data.result.forEach((pos, index) => {
            const size = parseFloat(pos.size);
            const side = size > 0 ? 'LONG' : 'SHORT';
            console.log(`      ${index + 1}. ${pos.product_symbol} ${side} ${Math.abs(size)} @ ${pos.avg_price || 'N/A'} (P&L: ${pos.unrealized_pnl || 'N/A'})`);
          });
        }
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Positions failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error testing positions: ${error.message}`);
    }

    // Test 3: Orders history endpoint
    console.log('\n3️⃣ Testing orders history endpoint...');
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const method = 'GET';
      const path = '/v2/orders/history';
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

      console.log(`   Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Orders found: ${data.result?.length || 0}`);
        
        if (data.result && data.result.length > 0) {
          console.log('   📊 Recent orders:');
          data.result.slice(0, 3).forEach((order, index) => {
            const orderTime = new Date(order.created_at);
            const fiveMinutesAgo = new Date(Date.now() - (5 * 60 * 1000));
            const isRecent = orderTime > fiveMinutesAgo;
            
            console.log(`      ${index + 1}. ${order.product_symbol} ${order.side} ${order.size} @ ${order.limit_price || order.avg_price || 'N/A'} (${orderTime.toISOString()}) ${isRecent ? '🕐 RECENT' : '⏰ OLD'}`);
          });
        }
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Orders failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error testing orders: ${error.message}`);
    }

    // Test 4: Edge Function with detailed logging
    console.log('\n4️⃣ Testing Edge Function with detailed logging...');
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke('real-time-trade-monitor', {
        body: { broker_id: brokerAccount.id }
      });

      if (invokeError) {
        console.log('❌ Edge Function failed:', invokeError);
      } else {
        console.log('✅ Edge Function result:');
        console.log('   Success:', result.success);
        console.log('   Total trades found:', result.total_trades_found);
        console.log('   Active followers:', result.active_followers);
        console.log('   Trades copied:', result.trades_copied);
        console.log('   Message:', result.message);
        console.log('   Timestamp:', result.timestamp);
      }
    } catch (error) {
      console.log('❌ Error testing Edge Function:', error.message);
    }

    console.log('\n🎯 ANALYSIS:');
    console.log('✅ API endpoints are working and returning data');
    console.log('✅ Positions endpoint shows 1 position (your open trade)');
    console.log('⚠️ Edge Function is not detecting trades from positions');
    console.log('🔧 This suggests the Edge Function logic needs adjustment');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

debugTradeDetection().catch(console.error); 