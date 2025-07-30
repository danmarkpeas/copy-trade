const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkRecentFills() {
  console.log('🔍 CHECKING RECENT FILLS AND ORDERS');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Get broker account
    const { data: brokerAccounts, error } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true)
      .limit(1);

    if (error || !brokerAccounts || brokerAccounts.length === 0) {
      throw new Error('No active broker accounts found');
    }

    const brokerAccount = brokerAccounts[0];
    console.log(`📋 Checking fills for broker: ${brokerAccount.account_name}`);

    // Check fills via Delta Exchange API
    const crypto = require('crypto');
    const API_KEY = brokerAccount.api_key;
    const API_SECRET = brokerAccount.api_secret;
    const BASE_URL = 'https://api.india.delta.exchange';

    function generateSignature(secret, prehashString) {
      return crypto.createHmac('sha256', secret).update(prehashString).digest('hex');
    }

    // Check recent fills
    console.log('\n📡 Fetching recent fills...');
    const fillsTimestamp = Math.floor(Date.now() / 1000).toString();
    const fillsMethod = 'GET';
    const fillsPath = '/v2/fills';
    const fillsQueryString = '?limit=20';
    const fillsPayload = '';
    
    const fillsPrehashString = fillsMethod + fillsTimestamp + fillsPath + fillsQueryString + fillsPayload;
    const fillsSignature = generateSignature(API_SECRET, fillsPrehashString);

    const fillsHeaders = {
      'Accept': 'application/json',
      'api-key': API_KEY,
      'signature': fillsSignature,
      'timestamp': fillsTimestamp,
      'User-Agent': 'copy-trading-platform'
    };

    const fillsResponse = await fetch(`${BASE_URL}${fillsPath}${fillsQueryString}`, {
      method: 'GET',
      headers: fillsHeaders
    });

    if (fillsResponse.ok) {
      const fillsData = await fillsResponse.json();
      console.log('✅ Fills API response:', JSON.stringify(fillsData, null, 2));
      
      if (fillsData.success && fillsData.result) {
        console.log(`\n📊 FOUND ${fillsData.result.length} RECENT FILLS:`);
        fillsData.result.forEach((fill, index) => {
          console.log(`\n${index + 1}. Fill Details:`);
          console.log(`   Symbol: ${fill.product_symbol}`);
          console.log(`   Side: ${fill.side}`);
          console.log(`   Size: ${fill.size}`);
          console.log(`   Price: ${fill.price}`);
          console.log(`   Order ID: ${fill.order_id}`);
          console.log(`   Created: ${fill.created_at}`);
          console.log(`   Product ID: ${fill.product_id}`);
        });
      }
    } else {
      console.log('❌ Failed to fetch fills:', await fillsResponse.text());
    }

    // Check open orders
    console.log('\n📡 Fetching open orders...');
    const ordersTimestamp = Math.floor(Date.now() / 1000).toString();
    const ordersMethod = 'GET';
    const ordersPath = '/v2/orders';
    const ordersQueryString = '?state=open';
    const ordersPayload = '';
    
    const ordersPrehashString = ordersMethod + ordersTimestamp + ordersPath + ordersQueryString + ordersPayload;
    const ordersSignature = generateSignature(API_SECRET, ordersPrehashString);

    const ordersHeaders = {
      'Accept': 'application/json',
      'api-key': API_KEY,
      'signature': ordersSignature,
      'timestamp': ordersTimestamp,
      'User-Agent': 'copy-trading-platform'
    };

    const ordersResponse = await fetch(`${BASE_URL}${ordersPath}${ordersQueryString}`, {
      method: 'GET',
      headers: ordersHeaders
    });

    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      console.log('✅ Orders API response:', JSON.stringify(ordersData, null, 2));
      
      if (ordersData.success && ordersData.result) {
        console.log(`\n📊 FOUND ${ordersData.result.length} OPEN ORDERS:`);
        ordersData.result.forEach((order, index) => {
          console.log(`\n${index + 1}. Order Details:`);
          console.log(`   Symbol: ${order.product_symbol}`);
          console.log(`   Side: ${order.side}`);
          console.log(`   Size: ${order.size}`);
          console.log(`   Price: ${order.price}`);
          console.log(`   Order ID: ${order.id}`);
          console.log(`   State: ${order.state}`);
          console.log(`   Created: ${order.created_at}`);
        });
      }
    } else {
      console.log('❌ Failed to fetch orders:', await ordersResponse.text());
    }

    // Check all positions (not just margined)
    console.log('\n📡 Fetching all positions...');
    const allPositionsTimestamp = Math.floor(Date.now() / 1000).toString();
    const allPositionsMethod = 'GET';
    const allPositionsPath = '/v2/positions';
    const allPositionsQueryString = '';
    const allPositionsPayload = '';
    
    const allPositionsPrehashString = allPositionsMethod + allPositionsTimestamp + allPositionsPath + allPositionsQueryString + allPositionsPayload;
    const allPositionsSignature = generateSignature(API_SECRET, allPositionsPrehashString);

    const allPositionsHeaders = {
      'Accept': 'application/json',
      'api-key': API_KEY,
      'signature': allPositionsSignature,
      'timestamp': allPositionsTimestamp,
      'User-Agent': 'copy-trading-platform'
    };

    const allPositionsResponse = await fetch(`${BASE_URL}${allPositionsPath}`, {
      method: 'GET',
      headers: allPositionsHeaders
    });

    if (allPositionsResponse.ok) {
      const allPositionsData = await allPositionsResponse.json();
      console.log('✅ All Positions API response:', JSON.stringify(allPositionsData, null, 2));
      
      if (allPositionsData.success && allPositionsData.result) {
        const openPositions = allPositionsData.result.filter(pos => parseFloat(pos.size) !== 0);
        console.log(`\n📊 FOUND ${openPositions.length} OPEN POSITIONS (all types):`);
        openPositions.forEach((pos, index) => {
          console.log(`\n${index + 1}. Position Details:`);
          console.log(`   Symbol: ${pos.product_symbol}`);
          console.log(`   Size: ${pos.size}`);
          console.log(`   Entry Price: ${pos.entry_price}`);
          console.log(`   Mark Price: ${pos.mark_price}`);
          console.log(`   P&L: ${pos.unrealized_pnl}`);
          console.log(`   Created: ${pos.created_at}`);
          console.log(`   Product ID: ${pos.product_id}`);
        });
      }
    } else {
      console.log('❌ Failed to fetch all positions:', await allPositionsResponse.text());
    }

  } catch (error) {
    console.error('❌ Error checking fills and orders:', error.message);
  }
}

// Run the check
checkRecentFills(); 