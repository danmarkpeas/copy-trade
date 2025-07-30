const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testEdgeFunctionDirect() {
  console.log('🔍 DIRECT EDGE FUNCTION TEST\n');

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
    console.log('📋 BROKER ACCOUNT:');
    console.log('   ID:', brokerAccount.id);
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);

    console.log('\n🔍 INVOKING EDGE FUNCTION DIRECTLY...');
    
    const { data: result, error: invokeError } = await supabase.functions.invoke('real-time-trade-monitor', {
      body: { broker_id: brokerAccount.id }
    });

    if (invokeError) {
      console.log('❌ Edge Function failed:', invokeError);
      return;
    }

    console.log('✅ Edge Function Response:');
    console.log('   Success:', result.success);
    console.log('   Message:', result.message);
    console.log('   Total trades found:', result.total_trades_found);
    console.log('   Active followers:', result.active_followers);
    console.log('   Trades copied:', result.trades_copied);
    console.log('   Timestamp:', result.timestamp);

    // Check if there are any copy trades in the database
    console.log('\n📊 CHECKING COPY TRADES IN DATABASE...');
    const { data: copyTrades, error: copyTradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (copyTradesError) {
      console.log('❌ Error fetching copy trades:', copyTradesError);
    } else {
      console.log(`   Recent copy trades: ${copyTrades?.length || 0}`);
      if (copyTrades && copyTrades.length > 0) {
        copyTrades.forEach((trade, index) => {
          console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.original_size} (${trade.status})`);
        });
      }
    }

    console.log('\n🎯 ANALYSIS:');
    if (result.total_trades_found === 0) {
      console.log('❌ No trades detected by Edge Function');
      console.log('🔧 Possible issues:');
      console.log('   1. Time window filtering is too strict');
      console.log('   2. API response format has changed');
      console.log('   3. Edge Function logic has a bug');
      console.log('   4. Trade data is not in expected format');
    } else {
      console.log('✅ Trades detected by Edge Function');
      console.log('✅ System is working correctly');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testEdgeFunctionDirect().catch(console.error); 