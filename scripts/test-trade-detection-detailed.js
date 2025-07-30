const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testTradeDetectionDetailed() {
  console.log('🔍 DETAILED TRADE DETECTION TEST\n');

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

    const API_KEY = brokerAccount.api_key;
    const API_SECRET = brokerAccount.api_secret;
    const BASE_URL = 'https://api.india.delta.exchange';

    // Correct signature generation function
    function generateSignature(secret, prehashString) {
      return crypto.createHmac('sha256', secret).update(prehashString).digest('hex');
    }

    console.log('\n🕐 TIME ANALYSIS:');
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
    const tenMinutesAgo = new Date(now.getTime() - (10 * 60 * 1000));
    
    console.log('   Current time:', now.toISOString());
    console.log('   5 minutes ago:', fiveMinutesAgo.toISOString());
    console.log('   10 minutes ago:', tenMinutesAgo.toISOString());

    console.log('\n🔐 TESTING FILLS ENDPOINT...');
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

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Fills found: ${data.result?.length || 0}`);
        
        if (data.result && data.result.length > 0) {
          console.log('\n📊 ALL FILLS WITH TIME ANALYSIS:');
          data.result.forEach((fill, index) => {
            const fillTime = new Date(fill.created_at);
            const isWithin5Min = fillTime > fiveMinutesAgo;
            const isWithin10Min = fillTime > tenMinutesAgo;
            
            console.log(`   ${index + 1}. ${fill.product_symbol} ${fill.side} ${fill.size} @ ${fill.price}`);
            console.log(`      Time: ${fillTime.toISOString()}`);
            console.log(`      5min window: ${isWithin5Min ? '✅ YES' : '❌ NO'}`);
            console.log(`      10min window: ${isWithin10Min ? '✅ YES' : '❌ NO'}`);
            console.log('');
          });
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Fills failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ Error testing fills: ${error.message}`);
    }

    console.log('\n🔐 TESTING ORDERS HISTORY ENDPOINT...');
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

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Orders found: ${data.result?.length || 0}`);
        
        if (data.result && data.result.length > 0) {
          console.log('\n📊 ALL ORDERS WITH TIME ANALYSIS:');
          data.result.forEach((order, index) => {
            const orderTime = new Date(order.created_at);
            const isWithin5Min = orderTime > fiveMinutesAgo;
            const isWithin10Min = orderTime > tenMinutesAgo;
            
            console.log(`   ${index + 1}. ${order.product_symbol} ${order.side} ${order.size} @ ${order.limit_price || order.avg_price || 'N/A'}`);
            console.log(`      Time: ${orderTime.toISOString()}`);
            console.log(`      5min window: ${isWithin5Min ? '✅ YES' : '❌ NO'}`);
            console.log(`      10min window: ${isWithin10Min ? '✅ YES' : '❌ NO'}`);
            console.log('');
          });
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Orders failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ Error testing orders: ${error.message}`);
    }

    console.log('\n🎯 RECOMMENDATION:');
    console.log('Based on the time analysis, we can see which trades should be detected.');
    console.log('If trades are within the time window but not detected, the issue is in the Edge Function logic.');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testTradeDetectionDetailed().catch(console.error); 