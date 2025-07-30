const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function finalNamesVerification() {
  console.log('🎯 FINAL NAMES DISPLAY VERIFICATION\n');
  
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
    const { data: copyTradesData, error: copyTradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .gte('entry_time', today.toISOString())
      .order('entry_time', { ascending: false })
      .limit(5);

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

    // 3. Fetch broker names
    const { data: brokerData, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('id, account_name, broker_name')
      .in('id', brokerIds);

    // 4. Fetch follower names
    const { data: followerData, error: followerError } = await supabase
      .from('followers')
      .select('user_id, follower_name')
      .in('user_id', followerIds);

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

    // 6. Show what the frontend should display
    console.log('\n📱 FRONTEND DISPLAY PREVIEW:');
    console.log('┌─────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ Copy Time           │ Master Broker │ Follower │ Symbol │ Side │ Size │ Status │');
    console.log('├─────────────────────────────────────────────────────────────────────────────────┤');
    
    copyTradesData.slice(0, 5).forEach((trade) => {
      const brokerName = brokerMap.get(trade.master_broker_id) || 'Unknown Broker';
      const followerName = followerMap.get(trade.follower_id) || 'Unknown Follower';
      const time = new Date(trade.entry_time).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log(`│ ${time.padEnd(19)} │ ${brokerName.padEnd(13)} │ ${followerName.padEnd(8)} │ ${trade.original_symbol.padEnd(6)} │ ${trade.original_side.toUpperCase().padEnd(4)} │ ${trade.copied_size.toString().padEnd(4)} │ ${trade.status.padEnd(6)} │`);
    });
    
    console.log('└─────────────────────────────────────────────────────────────────────────────────┘');

    // 7. Summary
    console.log('\n✅ VERIFICATION SUMMARY:');
    console.log(`   📊 Total trades checked: ${copyTradesData.length}`);
    console.log(`   🏦 Broker names found: ${brokerData ? brokerData.length : 0}`);
    console.log(`   👥 Follower names found: ${followerData ? followerData.length : 0}`);
    
    let successCount = 0;
    copyTradesData.forEach(trade => {
      const hasBrokerName = brokerMap.has(trade.master_broker_id);
      const hasFollowerName = followerMap.has(trade.follower_id);
      if (hasBrokerName && hasFollowerName) successCount++;
    });
    
    console.log(`   ✅ Trades with both names: ${successCount}/${copyTradesData.length}`);
    console.log(`   📈 Success rate: ${Math.round((successCount / copyTradesData.length) * 100)}%`);

    // 8. Frontend access
    console.log('\n🌐 FRONTEND ACCESS:');
    console.log('   📱 Trades Page: http://localhost:3000/trades');
    console.log('   📊 Copied Trades tab should now show:');
    console.log('      - "Master" instead of broker UUID');
    console.log('      - "Anneshan" instead of follower UUID');
    console.log('      - All other trade information correctly');

    // 9. Test frontend accessibility
    console.log('\n🧪 TESTING FRONTEND:');
    try {
      const response = await fetch('http://localhost:3000/trades');
      if (response.ok) {
        console.log('   ✅ Frontend is accessible');
        console.log('   📊 Navigate to the "Copied Trades" tab to see the names');
      } else {
        console.log(`   ❌ Frontend returned status: ${response.status}`);
      }
    } catch (error) {
      console.log('   ❌ Frontend is not accessible - make sure it\'s running');
    }

    console.log('\n🎉 VERIFICATION COMPLETE!');
    console.log('🌟 The frontend should now display readable names instead of UUIDs');
    console.log('📱 Check http://localhost:3000/trades to see the updated display');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

finalNamesVerification().catch(console.error); 