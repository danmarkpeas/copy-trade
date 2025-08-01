const { createClient } = require('@supabase/supabase-js');
const TradingService = require('../services/TradingService');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugTradeDetection() {
  console.log('🔍 DEBUGGING TRADE DETECTION');
  console.log('=' .repeat(50));

  try {
    // 1. Get active broker accounts
    console.log('1. Getting active broker accounts...');
    
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    console.log(`✅ Found ${brokerAccounts.length} active broker accounts`);

    for (const broker of brokerAccounts) {
      console.log(`\n🔍 Testing broker: ${broker.broker_name} (${broker.id})`);
      
      if (!broker.api_key || !broker.api_secret) {
        console.log('   ❌ Missing API credentials');
        continue;
      }

      // 2. Create TradingService instance
      console.log('   🔧 Creating TradingService instance...');
      const tradingService = new TradingService(broker.api_key, broker.api_secret);

      // 3. Set up event listeners
      console.log('   📡 Setting up event listeners...');
      
      tradingService.on('authenticated', () => {
        console.log('   ✅ WebSocket authenticated');
      });

      tradingService.on('userTrade', (trade) => {
        console.log('   📊 USER TRADE DETECTED:', trade);
      });

      tradingService.on('positionUpdate', (position) => {
        console.log('   📈 POSITION UPDATE DETECTED:', position);
      });

      tradingService.on('wsError', (error) => {
        console.log('   ❌ WebSocket error:', error);
      });

      tradingService.on('wsClose', () => {
        console.log('   🔌 WebSocket closed');
      });

      // 4. Connect to WebSocket
      console.log('   🔗 Connecting to WebSocket...');
      tradingService.connectWebSocket();

      // 5. Wait for events
      console.log('   ⏳ Waiting for trade events (30 seconds)...');
      
      let eventCount = 0;
      const maxWaitTime = 30000; // 30 seconds
      const startTime = Date.now();

      const checkTimeout = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= maxWaitTime) {
          clearInterval(checkTimeout);
          console.log('   ⏰ Timeout reached - no events detected');
          console.log('   💡 This might indicate:');
          console.log('      - No recent trades by the master trader');
          console.log('      - WebSocket connection issues');
          console.log('      - API authentication problems');
          
          // Disconnect
          tradingService.disconnect();
        }
      }, 1000);

      // 6. Check recent trades manually
      console.log('\n   📋 Checking recent trades manually...');
      try {
        const recentTrades = await tradingService.getRecentTrades();
        if (recentTrades.success && recentTrades.data.length > 0) {
          console.log(`   ✅ Found ${recentTrades.data.length} recent trades`);
          console.log('   📊 Most recent trades:');
          recentTrades.data.slice(0, 3).forEach((trade, index) => {
            console.log(`      ${index + 1}. ${trade.symbol} ${trade.side} ${trade.size} @ ${trade.price}`);
          });
        } else {
          console.log('   ℹ️  No recent trades found');
        }
      } catch (error) {
        console.log('   ❌ Error fetching recent trades:', error.message);
      }

      // 7. Check positions
      console.log('\n   📊 Checking current positions...');
      try {
        const positions = await tradingService.getPositions();
        if (positions.success && positions.data.length > 0) {
          console.log(`   ✅ Found ${positions.data.length} open positions`);
          positions.data.forEach((pos, index) => {
            console.log(`      ${index + 1}. ${pos.product_symbol} ${pos.size} @ ${pos.entry_price}`);
          });
        } else {
          console.log('   ℹ️  No open positions found');
        }
      } catch (error) {
        console.log('   ❌ Error fetching positions:', error.message);
      }

      // Wait a bit more for any delayed events
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      clearInterval(checkTimeout);
      tradingService.disconnect();
    }

    console.log('\n🎯 DEBUG COMPLETE');
    console.log('📊 If no trade events were detected, the master trader may not have made recent trades');
    console.log('💡 Try having the master trader place a new trade to test the system');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugTradeDetection(); 