const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function executeExistingPosition() {
  console.log('🎯 EXECUTING COPY TRADE FOR EXISTING POSITION\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Get current position from backend
    console.log('📋 STEP 1: Getting current position...');
    const response = await fetch('http://localhost:3001/api/real-time-monitor');
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.positions || data.positions.length === 0) {
      console.log('❌ No positions found');
      return;
    }
    
    const position = data.positions[0];
    console.log(`✅ Position found: ${position.product_symbol} ${position.size > 0 ? 'BUY' : 'SELL'} ${Math.abs(position.size)}`);
    
    // 2. Load follower
    console.log('\n📋 STEP 2: Loading follower...');
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (error || !followers || followers.length === 0) {
      throw new Error('No active followers found');
    }
    
    const follower = followers[0];
    console.log(`✅ Follower loaded: ${follower.follower_name}`);
    
    // 3. Check follower balance
    console.log('\n📋 STEP 3: Checking follower balance...');
    const balanceResult = await getFollowerBalance(follower);
    if (!balanceResult.success) {
      throw new Error(`Failed to get balance: ${balanceResult.error}`);
    }
    
    const availableBalance = parseFloat(balanceResult.data.result?.[0]?.available_balance || 0);
    console.log(`✅ Available balance: $${availableBalance}`);
    
    if (availableBalance < 0.05) {
      throw new Error('Insufficient balance for trading');
    }
    
    // 4. Create master trade object
    const masterTrade = {
      symbol: position.product_symbol,
      side: position.size > 0 ? 'buy' : 'sell',
      size: Math.abs(position.size),
      price: position.entry_price,
      timestamp: position.created_at
    };
    
    console.log(`\n📊 Master Trade: ${masterTrade.symbol} ${masterTrade.side} ${masterTrade.size}`);
    
    // 5. Calculate copy size
    const copySize = calculateCopySize(masterTrade.size, availableBalance, masterTrade.symbol);
    console.log(`📈 Calculated copy size: ${copySize} contracts`);
    
    if (copySize === 0) {
      throw new Error('Cannot afford this trade');
    }
    
    // 6. Execute copy order
    console.log('\n📋 STEP 4: Executing copy order...');
    const orderResult = await placeCopyOrder(follower, masterTrade, copySize, new Date().toISOString());
    
    if (orderResult.success) {
      console.log(`✅ Copy order executed successfully!`);
      console.log(`   Order ID: ${orderResult.order_id}`);
      console.log(`   Symbol: ${masterTrade.symbol}`);
      console.log(`   Side: ${masterTrade.side}`);
      console.log(`   Size: ${copySize} contracts`);
      
      // 7. Save to database
      console.log('\n📋 STEP 5: Saving to database...');
      await saveCopyTrade(follower, masterTrade, copySize, 'executed', orderResult.order_id, new Date().toISOString());
      console.log(`✅ Copy trade saved to database`);
      
    } else {
      console.log(`❌ Copy order failed: ${orderResult.error}`);
      await saveCopyTrade(follower, masterTrade, copySize, 'failed', null, new Date().toISOString(), orderResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Helper functions
async function getFollowerBalance(follower) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/wallet/balances';
    const prehashString = `${timestamp}GET${path}`;
    const signature = generateSignature(follower.api_secret, prehashString);
    
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
    return { success: response.ok, data, error: data.error || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function calculateCopySize(masterSize, availableBalance, symbol) {
  // For POLUSD, 1 contract requires ~$0.05 margin
  const marginPerContract = 0.05;
  const maxContracts = Math.floor(availableBalance / marginPerContract);
  const copySize = Math.min(masterSize, maxContracts);
  return Math.max(1, Math.ceil(copySize * 10)); // Convert to contract units
}

async function placeCopyOrder(follower, masterTrade, copySize, masterTimestamp) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    // Convert to contract size (1 contract = 10 POL for POLUSD)
    const contractSize = Math.max(1, Math.ceil(copySize * 10));
    
    const orderData = {
      product_id: getProductId(masterTrade.symbol),
      size: contractSize,
      side: masterTrade.side,
      order_type: 'market_order',
      time_in_force: 'good_til_cancelled'
    };
    
    const prehashString = `${timestamp}POST${path}${JSON.stringify(orderData)}`;
    const signature = generateSignature(follower.api_secret, prehashString);
    
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
    
    if (response.ok && data.result) {
      return { 
        success: true, 
        order_id: data.result.id,
        data: data.result 
      };
    } else {
      return { 
        success: false, 
        error: data.error || 'Unknown error',
        details: data 
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function saveCopyTrade(follower, masterTrade, copySize, status, orderId, masterTimestamp, errorMessage = null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const copyTrade = {
      master_trade_id: `manual_${Date.now()}`,
      master_broker_id: 'manual_execution',
      follower_id: follower.id,
      original_symbol: masterTrade.symbol,
      original_side: masterTrade.side,
      original_size: masterTrade.size,
      original_price: masterTrade.price,
      copied_size: copySize,
      copied_price: masterTrade.price,
      status: status,
      entry_time: masterTimestamp,
      order_id: orderId
    };

    const { data, error } = await supabase
      .from('copy_trades')
      .insert(copyTrade)
      .select()
      .single();

    if (error) {
      console.error('Database error saving copy trade:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving copy trade to database:', error);
    return false;
  }
}

function getProductId(symbol) {
  const productIds = {
    'POLUSD': 39943,
    'ADAUSD': 39944,
    'DOTUSD': 39945
  };
  return productIds[symbol] || 39943; // Default to POLUSD
}

function generateSignature(secret, prehashString) {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(prehashString).digest('hex');
}

executeExistingPosition().catch(console.error); 