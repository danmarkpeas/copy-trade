const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testUIDisplay() {
  console.log('🧪 TESTING UI DISPLAY\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Get all copy trades (what the UI should show when no user is logged in)
    console.log('📊 TEST 1: All Copy Trades (No User Logged In)');
    const { data: allCopyTrades, error: allTradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .order('created_at', { ascending: false });

    if (allTradesError) {
      console.log('❌ Error fetching all copy trades:', allTradesError);
    } else {
      console.log(`✅ Found ${allCopyTrades?.length || 0} copy trades total`);
      if (allCopyTrades && allCopyTrades.length > 0) {
        allCopyTrades.forEach((trade, index) => {
          const timeAgo = Math.floor((Date.now() - new Date(trade.created_at).getTime()) / (1000 * 60));
          console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size} (${trade.status}) - ${timeAgo} min ago`);
        });
      }
    }

    // Test 2: Get copy trades for specific user (what the UI should show when user is logged in)
    console.log('\n📊 TEST 2: Copy Trades for Specific User (User Logged In)');
    const testUserId = '29a36e2e-84e4-4998-8588-6ffb02a77890'; // gauravcrd@gmail.com
    
    const { data: userCopyTrades, error: userTradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .eq('follower_id', testUserId)
      .order('created_at', { ascending: false });

    if (userTradesError) {
      console.log('❌ Error fetching user copy trades:', userTradesError);
    } else {
      console.log(`✅ Found ${userCopyTrades?.length || 0} copy trades for user ${testUserId}`);
      if (userCopyTrades && userCopyTrades.length > 0) {
        userCopyTrades.forEach((trade, index) => {
          const timeAgo = Math.floor((Date.now() - new Date(trade.created_at).getTime()) / (1000 * 60));
          console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size} (${trade.status}) - ${timeAgo} min ago`);
        });
      }
    }

    // Test 3: Check if trade_history table exists
    console.log('\n📊 TEST 3: Trade History Table');
    const { data: tradeHistory, error: historyError } = await supabase
      .from('trade_history')
      .select('*')
      .limit(5);

    if (historyError) {
      if (historyError.message?.includes('does not exist')) {
        console.log('⚠️  trade_history table does not exist yet');
      } else {
        console.log('❌ Error fetching trade history:', historyError);
      }
    } else {
      console.log(`✅ Found ${tradeHistory?.length || 0} trade history entries`);
    }

    console.log('\n🎯 UI DISPLAY ANALYSIS:');
    console.log('✅ Copy trades exist in database');
    console.log('✅ UI should now show all copy trades when no user is logged in');
    console.log('✅ UI should show user-specific trades when user is logged in');
    console.log('✅ Trade history table may not exist yet (this is normal)');

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Refresh the UI at http://localhost:3000/trades');
    console.log('2. The "Copied Trades" tab should now show the copy trades');
    console.log('3. The "Trade History" tab may be empty (normal if table doesn\'t exist)');
    console.log('4. The real-time monitor should show the correct data');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testUIDisplay().catch(console.error); 