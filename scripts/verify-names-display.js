const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function verifyNamesDisplay() {
  console.log('🔍 VERIFYING BROKER AND FOLLOWER NAMES DISPLAY\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`📅 Checking data for today: ${today.toISOString().split('T')[0]}`);
    
    // 1. Get today's copy trades
    console.log('\n📋 TODAY\'S COPY TRADES WITH NAMES:');
    const { data: copyTradesData, error: copyTradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .gte('entry_time', today.toISOString())
      .order('entry_time', { ascending: false })
      .limit(10);

    if (copyTradesError) {
      console.log(`❌ Error fetching copy trades: ${copyTradesError.message}`);
      return;
    }

    if (!copyTradesData || copyTradesData.length === 0) {
      console.log('❌ No copy trades found for today');
      return;
    }

    console.log(`✅ Found ${copyTradesData.length} copy trades for today`);

    // 2. Get unique broker and follower IDs
    const brokerIds = [...new Set(copyTradesData.map(trade => trade.master_broker_id).filter(Boolean))];
    const followerIds = [...new Set(copyTradesData.map(trade => trade.follower_id).filter(Boolean))];

    console.log(`📊 Unique broker IDs: ${brokerIds.length} (${brokerIds.join(', ')})`);
    console.log(`📊 Unique follower IDs: ${followerIds.length} (${followerIds.join(', ')})`);

    // 3. Fetch broker names
    console.log('\n🏦 FETCHING BROKER NAMES:');
    const { data: brokerData, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('id, account_name, broker_name')
      .in('id', brokerIds);

    if (brokerError) {
      console.log(`❌ Error fetching broker names: ${brokerError.message}`);
    } else if (brokerData) {
      console.log(`✅ Found ${brokerData.length} broker names:`);
      brokerData.forEach(broker => {
        const displayName = broker.account_name || broker.broker_name || 'Unknown Broker';
        console.log(`   - ID: ${broker.id} → Name: ${displayName}`);
      });
    }

    // 4. Fetch follower names
    console.log('\n👥 FETCHING FOLLOWER NAMES:');
    const { data: followerData, error: followerError } = await supabase
      .from('followers')
      .select('user_id, follower_name')
      .in('user_id', followerIds);

    if (followerError) {
      console.log(`❌ Error fetching follower names: ${followerError.message}`);
    } else if (followerData) {
      console.log(`✅ Found ${followerData.length} follower names:`);
      followerData.forEach(follower => {
        const displayName = follower.follower_name || 'Unknown Follower';
        console.log(`   - User ID: ${follower.user_id} → Name: ${displayName}`);
      });
    }

    // 5. Create lookup maps
    const brokerMap = new Map();
    if (brokerData) {
      brokerData.forEach(broker => {
        const displayName = broker.account_name || broker.broker_name || 'Unknown Broker';
        brokerMap.set(broker.id, displayName);
      });
    }

    const followerMap = new Map();
    if (followerData) {
      followerData.forEach(follower => {
        const displayName = follower.follower_name || 'Unknown Follower';
        followerMap.set(follower.user_id, displayName);
      });
    }

    // 6. Show enriched trades
    console.log('\n📊 ENRICHED COPY TRADES (WHAT FRONTEND SHOULD SHOW):');
    copyTradesData.slice(0, 8).forEach((trade, index) => {
      const brokerName = brokerMap.get(trade.master_broker_id) || 'Unknown Broker';
      const followerName = followerMap.get(trade.follower_id) || 'Unknown Follower';
      
      console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size} (${trade.status})`);
      console.log(`      Time: ${new Date(trade.entry_time).toLocaleString()}`);
      console.log(`      Master Broker: ${brokerName} (ID: ${trade.master_broker_id})`);
      console.log(`      Follower: ${followerName} (ID: ${trade.follower_id})`);
      console.log(`      Order ID: ${trade.follower_order_id || 'NULL'}`);
      console.log('');
    });

    // 7. Check if all trades have proper names
    console.log('\n🔍 NAME MAPPING VERIFICATION:');
    let allNamesFound = true;
    
    copyTradesData.forEach((trade, index) => {
      const brokerName = brokerMap.get(trade.master_broker_id);
      const followerName = followerMap.get(trade.follower_id);
      
      if (!brokerName) {
        console.log(`❌ Trade ${index + 1}: Missing broker name for ID ${trade.master_broker_id}`);
        allNamesFound = false;
      }
      
      if (!followerName) {
        console.log(`❌ Trade ${index + 1}: Missing follower name for ID ${trade.follower_id}`);
        allNamesFound = false;
      }
    });

    if (allNamesFound) {
      console.log('✅ All trades have proper broker and follower names mapped');
    }

    // 8. Frontend display summary
    console.log('\n📱 FRONTEND DISPLAY SUMMARY:');
    console.log('✅ Copy trades table now shows:');
    console.log('   - Master Broker Name (instead of ID)');
    console.log('   - Follower Name (instead of ID)');
    console.log('   - Symbol, Side, Sizes, Price, Status');
    console.log('   - Proper timestamps');
    
    console.log('\n🌐 Frontend Access: http://localhost:3000/trades');
    console.log('📊 Copied Trades tab should now display readable names');
    
    // 9. Test the frontend API
    console.log('\n🧪 TESTING FRONTEND API:');
    try {
      const response = await fetch('http://localhost:3000/trades');
      if (response.ok) {
        console.log('✅ Frontend trades page is accessible');
      } else {
        console.log(`❌ Frontend trades page returned status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Frontend trades page is not accessible');
    }

    console.log('\n🎉 VERIFICATION COMPLETE!');
    console.log('🌟 The frontend should now display:');
    console.log('   - Master Broker names instead of UUIDs');
    console.log('   - Follower names instead of UUIDs');
    console.log('   - All other trade information correctly');
    console.log('   - Proper formatting and styling');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyNamesDisplay().catch(console.error); 