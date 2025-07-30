const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkCurrentPositions() {
  console.log('🔍 CHECKING CURRENT POSITIONS');
  
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
    console.log(`📋 Checking positions for broker: ${brokerAccount.account_name}`);

    // Check positions via Delta Exchange API
    const crypto = require('crypto');
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

    console.log('📡 Fetching positions from Delta Exchange...');
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: headers
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Positions API response:', JSON.stringify(data, null, 2));
      
      if (data.success && data.result) {
        const openPositions = data.result.filter(pos => parseFloat(pos.size) !== 0);
        
        if (openPositions.length > 0) {
          console.log(`\n📊 FOUND ${openPositions.length} OPEN POSITIONS:`);
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
          
          // Now test position detection
          await testPositionDetection(openPositions, brokerAccount);
        } else {
          console.log('📊 No open positions found');
        }
      } else {
        console.log('❌ API response indicates no success');
      }
    } else {
      console.log('❌ Failed to fetch positions:', await response.text());
    }

  } catch (error) {
    console.error('❌ Error checking positions:', error.message);
  }
}

async function testPositionDetection(openPositions, brokerAccount) {
  console.log(`\n🧪 TESTING POSITION DETECTION`);
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get followers for this broker
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*')
      .eq('master_broker_account_id', brokerAccount.id)
      .eq('account_status', 'active');

    if (error || !followers || followers.length === 0) {
      throw new Error('No active followers found');
    }

    console.log(`👥 Found ${followers.length} followers for testing`);

    for (const position of openPositions) {
      console.log(`\n🎯 Testing position: ${position.product_symbol}`);
      
      const masterTrade = {
        symbol: position.product_symbol,
        side: parseFloat(position.size) > 0 ? 'buy' : 'sell',
        size: Math.abs(parseFloat(position.size)),
        price: position.entry_price,
        timestamp: position.created_at,
        broker_id: brokerAccount.id
      };

      console.log(`📊 Master trade details:`, masterTrade);

      for (const follower of followers) {
        console.log(`\n👤 Testing follower: ${follower.follower_name}`);
        
        // Calculate copy size
        const copySize = Math.max(0.01, Math.min(masterTrade.size * 0.1, 1000 / 100));
        console.log(`   📊 Calculated copy size: ${copySize} contracts`);

        // Simulate order placement
        console.log(`   📝 Simulating order placement...`);
        
        // Save copy trade to database
        const { data, error: saveError } = await supabase
          .from('copy_trades')
          .insert({
            master_trade_id: `position_${Date.now()}`,
            master_broker_id: masterTrade.broker_id,
            follower_id: follower.user_id,
            follower_order_id: `simulated_position_${Date.now()}`,
            original_symbol: masterTrade.symbol,
            original_side: masterTrade.side,
            original_size: masterTrade.size,
            original_price: masterTrade.price,
            copied_size: copySize,
            copied_price: masterTrade.price,
            status: 'executed',
            entry_time: masterTrade.timestamp,
            created_at: new Date().toISOString()
          })
          .select();

        if (saveError) {
          console.log(`   ❌ Failed to save copy trade: ${saveError.message}`);
        } else {
          console.log(`   ✅ Copy trade saved successfully: ${data?.[0]?.id || 'unknown'}`);
          console.log(`   🎯 ${follower.follower_name} would have executed:`);
          console.log(`      Symbol: ${masterTrade.symbol}`);
          console.log(`      Side: ${masterTrade.side}`);
          console.log(`      Size: ${copySize} contracts`);
          console.log(`      Price: ${masterTrade.price}`);
        }
      }
    }

    console.log(`\n✅ POSITION DETECTION TEST COMPLETED`);
    console.log(`📊 Check the database for saved copy trades`);
    console.log(`🌐 Check the frontend at http://localhost:3000/trades`);

  } catch (error) {
    console.error('❌ Position detection test failed:', error.message);
  }
}

// Run the check
checkCurrentPositions(); 