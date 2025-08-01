const PositionClosingDetector = require('../services/PositionClosingDetector');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPositionClosingDetector() {
  console.log('🧪 TESTING POSITION CLOSING DETECTOR');
  console.log('=' .repeat(50));

  try {
    // 1. Get master trader credentials
    console.log('1. Getting master trader credentials...');
    
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('account_status', 'active')
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    const masterAccount = brokerAccounts[0];
    console.log(`✅ Found master trader: ${masterAccount.broker_name}`);

    if (!masterAccount.api_key || !masterAccount.api_secret) {
      console.log('❌ Master trader missing API credentials');
      return;
    }

    // 2. Create position closing detector
    console.log('\n2. Creating position closing detector...');
    
    const detector = new PositionClosingDetector(
      masterAccount.api_key,
      masterAccount.api_secret
    );

    // 3. Set up event handlers
    console.log('3. Setting up event handlers...');
    
    detector.setPositionClosedCallback((symbol, positionData, reason) => {
      console.log(`\n🎯 POSITION CLOSED DETECTED:`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Reason: ${reason}`);
      console.log(`   Data:`, JSON.stringify(positionData, null, 2));
      
      // Test copy trading logic here
      console.log(`   🔄 This would trigger copy trade close for followers`);
    });

    detector.setPositionOpenedCallback((symbol, positionData) => {
      console.log(`\n🎯 POSITION OPENED DETECTED:`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Data:`, JSON.stringify(positionData, null, 2));
      
      // Test copy trading logic here
      console.log(`   📈 This would trigger copy trade open for followers`);
    });

    // 4. Start the detector
    console.log('\n4. Starting position closing detector...');
    detector.start();

    // 5. Monitor for a period
    console.log('\n5. Monitoring for position changes...');
    console.log('   📊 The detector is now running and listening for position changes');
    console.log('   🎯 Have the master trader open/close positions to test');
    console.log('   ⏰ Monitoring for 60 seconds...');

    let monitoringTime = 0;
    const maxMonitoringTime = 60; // 60 seconds

    const monitorInterval = setInterval(() => {
      monitoringTime += 5;
      console.log(`   ⏱️  Monitoring time: ${monitoringTime}s/${maxMonitoringTime}s`);
      
      if (monitoringTime >= maxMonitoringTime) {
        clearInterval(monitorInterval);
        console.log('\n⏰ Monitoring period completed');
        
        // Get current positions
        const currentPositions = detector.getCurrentPositions();
        console.log(`\n📊 Current positions detected: ${currentPositions.length}`);
        
        if (currentPositions.length > 0) {
          currentPositions.forEach(pos => {
            console.log(`   - ${pos.symbol}: ${pos.size} @ ${pos.entry_price}`);
          });
        }

        // Stop the detector
        detector.stop();
        console.log('✅ Position closing detector test completed');
      }
    }, 5000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

testPositionClosingDetector(); 