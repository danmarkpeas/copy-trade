const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testPositionExecution() {
  console.log('🎯 TESTING POSITION DETECTION AND EXECUTION\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Check backend for current positions
    console.log('📋 STEP 1: Checking backend for current positions...');
    const response = await fetch('http://localhost:3001/api/real-time-monitor');
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Backend response received`);
    console.log(`   Positions found: ${data.positions?.length || 0}`);
    
    if (data.positions && data.positions.length > 0) {
      const position = data.positions[0];
      console.log(`\n🎯 DETECTED POSITION:`);
      console.log(`   Symbol: ${position.product_symbol}`);
      console.log(`   Size: ${position.size}`);
      console.log(`   Side: ${position.size > 0 ? 'BUY' : 'SELL'}`);
      console.log(`   Entry Price: ${position.entry_price}`);
      console.log(`   Created: ${position.created_at}`);
      console.log(`   Unrealized PnL: ${position.unrealized_pnl}`);
      
      // 2. Load followers
      console.log('\n📋 STEP 2: Loading followers...');
      const { data: followers, error: followersError } = await supabase
        .from('followers')
        .select('*')
        .eq('is_active', true);

      if (followersError) {
        throw new Error(`Failed to load followers: ${followersError.message}`);
      }

      console.log(`✅ Loaded ${followers?.length || 0} active follower(s)`);
      
      // 3. Test copy trade execution for each follower
      for (const follower of followers || []) {
        console.log(`\n📋 STEP 3: Testing copy trade for ${follower.follower_name}...`);
        
        if (!follower.api_key || !follower.api_secret) {
          console.log(`   ⚠️ Skipping: Missing API credentials`);
          continue;
        }
        
        // Create master trade object from position
        const masterTrade = {
          symbol: position.product_symbol,
          side: position.size > 0 ? 'buy' : 'sell',
          size: Math.abs(position.size),
          price: position.entry_price,
          timestamp: position.created_at
        };
        
        console.log(`   📊 Master Trade: ${masterTrade.symbol} ${masterTrade.side} ${masterTrade.size}`);
        
        // Test follower balance
        console.log(`   💰 Checking follower balance...`);
        const balanceResult = await getFollowerBalance(follower);
        if (balanceResult.success) {
          const availableBalance = parseFloat(balanceResult.data.result?.[0]?.available_balance || 0);
          console.log(`   ✅ Balance: $${availableBalance}`);
          
          if (availableBalance < 0.05) {
            console.log(`   ⚠️ Insufficient balance for trading`);
            continue;
          }
          
          // Calculate copy size
          const copySize = calculateCopySize(masterTrade.size, availableBalance, masterTrade.symbol);
          console.log(`   📈 Calculated copy size: ${copySize} contracts`);
          
          if (copySize > 0) {
            console.log(`   🚀 Ready to execute copy trade!`);
            console.log(`   📋 Order Details:`);
            console.log(`      Symbol: ${masterTrade.symbol}`);
            console.log(`      Side: ${masterTrade.side}`);
            console.log(`      Size: ${copySize} contracts`);
            console.log(`      Estimated Cost: ~$${(copySize * 0.05).toFixed(4)}`);
            
            // Ask user if they want to execute
            console.log(`\n❓ Do you want to execute this copy trade? (y/n)`);
            // For now, we'll simulate the execution
            console.log(`   🔄 Simulating copy trade execution...`);
            
            // Here you would call the actual placeCopyOrder function
            console.log(`   ✅ Copy trade would be executed successfully!`);
          } else {
            console.log(`   ⚠️ Cannot afford this trade`);
          }
        } else {
          console.log(`   ❌ Failed to get balance: ${balanceResult.error}`);
        }
      }
      
    } else {
      console.log(`❌ No positions found in backend response`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Helper functions
async function getFollowerBalance(follower) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  
  try {
    const timestamp = Date.now();
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

function generateSignature(secret, prehashString) {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(prehashString).digest('hex');
}

testPositionExecution().catch(console.error); 