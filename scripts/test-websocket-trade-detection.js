const { createClient } = require('@supabase/supabase-js');
const TradingService = require('../services/TradingService');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWebSocketTradeDetection() {
  console.log('🔍 TESTING WEBSOCKET TRADE DETECTION');
  console.log('=' .repeat(60));

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

    const broker = brokerAccounts[0];
    console.log(`✅ Testing broker: ${broker.account_name}`);

    // 2. Create TradingService instance
    console.log('\n2. Creating TradingService instance...');
    
    const tradingService = new TradingService(broker.api_key, broker.api_secret);

    // 3. Set up event listeners
    console.log('\n3. Setting up event listeners...');
    
    let tradeDetected = false;
    let positionUpdateDetected = false;

    tradingService.on('authenticated', () => {
      console.log('   ✅ WebSocket authenticated');
    });

    tradingService.on('userTrade', (trade) => {
      console.log('   📊 USER TRADE DETECTED:', {
        symbol: trade.symbol,
        side: trade.side,
        size: trade.size,
        price: trade.price,
        timestamp: new Date(trade.timestamp).toISOString()
      });
      tradeDetected = true;
    });

    tradingService.on('positionUpdate', (position) => {
      console.log('   📈 POSITION UPDATE DETECTED:', {
        action: position.action,
        symbol: position.symbol,
        size: position.size,
        entryPrice: position.entryPrice
      });
      positionUpdateDetected = true;
    });

    tradingService.on('wsError', (error) => {
      console.log('   ❌ WebSocket error:', error);
    });

    // 4. Connect to WebSocket
    console.log('\n4. Connecting to WebSocket...');
    
    tradingService.connectWebSocket();

    // 5. Wait for events
    console.log('\n5. Waiting for trade events (30 seconds)...');
    console.log('   🔍 Monitoring for real-time trades...');
    
    const startTime = Date.now();
    const timeout = 30000; // 30 seconds

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= timeout) {
        clearInterval(checkInterval);
        console.log('\n⏰ Timeout reached');
        
        if (!tradeDetected) {
          console.log('   ❌ No trade events detected');
          console.log('   💡 This might indicate:');
          console.log('      - No recent trades by the master trader');
          console.log('      - WebSocket not receiving trade data');
          console.log('      - Trade events not being emitted');
        } else {
          console.log('   ✅ Trade events detected successfully');
        }
        
        if (!positionUpdateDetected) {
          console.log('   ❌ No position update events detected');
        } else {
          console.log('   ✅ Position update events detected successfully');
        }
        
        tradingService.disconnect();
        process.exit(0);
      }
    }, 1000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWebSocketTradeDetection(); 