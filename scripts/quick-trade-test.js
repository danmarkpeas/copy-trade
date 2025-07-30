const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function quickTradeTest() {
  console.log('⚡ QUICK TRADE DETECTION TEST\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the most recent broker account
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    const brokerAccount = brokerAccounts[0];
    console.log('📋 BROKER:', brokerAccount.account_name);

    console.log('\n🔍 TESTING REAL-TIME MONITOR...');
    const { data: result, error: invokeError } = await supabase.functions.invoke('real-time-trade-monitor', {
      body: { broker_id: brokerAccount.id }
    });

    if (invokeError) {
      console.log('❌ Edge Function failed:', invokeError);
      return;
    }

    console.log('✅ MONITORING RESULT:');
    console.log('   Success:', result.success);
    console.log('   Total trades found:', result.total_trades_found);
    console.log('   Active followers:', result.active_followers);
    console.log('   Trades copied:', result.trades_copied);
    console.log('   Timestamp:', result.timestamp);

    if (result.total_trades_found > 0) {
      console.log('\n🎉 SUCCESS! New trade detected!');
      console.log('✅ Copy trading system is working live');
    } else {
      console.log('\n⏳ No recent trades detected');
      console.log('💡 Place a new trade in Delta Exchange and run this test again');
    }

    // Check for new copy trades
    console.log('\n📊 CHECKING FOR NEW COPY TRADES...');
    const { data: copyTrades, error: copyTradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (copyTradesError) {
      console.log('❌ Error fetching copy trades:', copyTradesError);
    } else {
      console.log(`   Recent copy trades: ${copyTrades?.length || 0}`);
      if (copyTrades && copyTrades.length > 0) {
        const latestTrade = copyTrades[0];
        const tradeTime = new Date(latestTrade.created_at);
        const now = new Date();
        const minutesAgo = Math.floor((now - tradeTime) / (1000 * 60));
        
        console.log(`   Latest: ${latestTrade.original_symbol} ${latestTrade.original_side} ${latestTrade.original_size} (${minutesAgo} min ago)`);
      }
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

quickTradeTest().catch(console.error); 