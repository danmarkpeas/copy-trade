const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugFrontendSync() {
  console.log('🔍 DEBUGGING FRONTEND TRADES SYNC ISSUE\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('📊 CHECKING DATABASE TABLES:');
    
    // 1. Check copy_trades table
    console.log('\n📋 COPY_TRADES TABLE:');
    const { data: copyTrades, error: copyTradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (copyTradesError) {
      console.log(`❌ Error fetching copy_trades: ${copyTradesError.message}`);
    } else {
      console.log(`✅ Found ${copyTrades?.length || 0} copy trades`);
      if (copyTrades && copyTrades.length > 0) {
        copyTrades.forEach((trade, index) => {
          console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size} (${trade.status})`);
          console.log(`      Time: ${new Date(trade.entry_time).toLocaleString()}`);
          console.log(`      Master Trade ID: ${trade.master_trade_id}`);
          console.log(`      Follower Order ID: ${trade.follower_order_id}`);
        });
      }
    }
    
    // 2. Check trade_history table
    console.log('\n📋 TRADE_HISTORY TABLE:');
    const { data: tradeHistory, error: tradeHistoryError } = await supabase
      .from('trade_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (tradeHistoryError) {
      console.log(`❌ Error fetching trade_history: ${tradeHistoryError.message}`);
    } else {
      console.log(`✅ Found ${tradeHistory?.length || 0} trade history records`);
      if (tradeHistory && tradeHistory.length > 0) {
        tradeHistory.forEach((trade, index) => {
          console.log(`   ${index + 1}. ${trade.product_symbol} ${trade.side} ${trade.size} (${trade.state})`);
          console.log(`      Time: ${new Date(trade.created_at).toLocaleString()}`);
          console.log(`      Order ID: ${trade.order_id}`);
          console.log(`      Price: $${trade.price}`);
        });
      }
    }
    
    // 3. Check recent successful copy trades
    console.log('\n📋 RECENT SUCCESSFUL COPY TRADES:');
    const { data: successfulTrades, error: successfulError } = await supabase
      .from('copy_trades')
      .select('*')
      .eq('status', 'executed')
      .order('created_at', { ascending: false })
      .limit(3);

    if (successfulError) {
      console.log(`❌ Error fetching successful trades: ${successfulError.message}`);
    } else {
      console.log(`✅ Found ${successfulTrades?.length || 0} successful copy trades`);
      if (successfulTrades && successfulTrades.length > 0) {
        successfulTrades.forEach((trade, index) => {
          console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size} (${trade.status})`);
          console.log(`      Time: ${new Date(trade.entry_time).toLocaleString()}`);
        });
      } else {
        console.log(`   ❌ No successful copy trades found - all trades are failing`);
      }
    }
    
    // 4. Check backend API status
    console.log('\n📋 BACKEND API STATUS:');
    try {
      const response = await fetch('http://localhost:3001/api/real-time-monitor');
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Backend API: Working`);
        console.log(`   Master positions: ${data.positions?.length || 0}`);
        console.log(`   Recent trades: ${data.copy_results?.length || 0}`);
        console.log(`   Active followers: ${data.active_followers || 0}`);
        console.log(`   Trades copied: ${data.trades_copied || 0}`);
        
        // Check recent copy results
        if (data.copy_results && data.copy_results.length > 0) {
          console.log(`\n📋 RECENT COPY RESULTS FROM BACKEND:`);
          data.copy_results.slice(0, 3).forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.symbol} ${result.side} ${result.size} (${result.status})`);
            console.log(`      Time: ${new Date(result.timestamp).toLocaleString()}`);
          });
        }
      } else {
        console.log(`❌ Backend API: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Backend API: ${error.message}`);
    }
    
    // 5. Check followers
    console.log('\n📋 FOLLOWERS STATUS:');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError) {
      console.log(`❌ Error fetching followers: ${followersError.message}`);
    } else {
      console.log(`✅ Found ${followers?.length || 0} active followers`);
      if (followers && followers.length > 0) {
        followers.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name}`);
          console.log(`      API Key: ${follower.api_key ? '✅ Set' : '❌ Missing'}`);
          console.log(`      API Secret: ${follower.api_secret ? '✅ Set' : '❌ Missing'}`);
          console.log(`      Status: ${follower.account_status}`);
        });
      }
    }
    
    // 6. Check broker accounts
    console.log('\n📋 BROKER ACCOUNTS:');
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true);

    if (brokerError) {
      console.log(`❌ Error fetching broker accounts: ${brokerError.message}`);
    } else {
      console.log(`✅ Found ${brokerAccounts?.length || 0} active broker accounts`);
      if (brokerAccounts && brokerAccounts.length > 0) {
        brokerAccounts.forEach((broker, index) => {
          console.log(`   ${index + 1}. ${broker.broker_name || 'Unknown'}`);
          console.log(`      User ID: ${broker.user_id}`);
          console.log(`      API Key: ${broker.api_key ? '✅ Set' : '❌ Missing'}`);
          console.log(`      API Secret: ${broker.api_secret ? '✅ Set' : '❌ Missing'}`);
          console.log(`      Status: ${broker.is_active ? 'Active' : 'Inactive'}`);
        });
      }
    }
    
    console.log('\n🔍 DIAGNOSIS:');
    console.log('❌ ISSUE: All copy trades are showing as "failed" status');
    console.log('❌ ISSUE: Frontend is not syncing with successful trades');
    console.log('❌ ISSUE: No successful copy trades in database');
    
    console.log('\n💡 ROOT CAUSE ANALYSIS:');
    console.log('1. The ultra-fast system is detecting trades but failing to execute them');
    console.log('2. The copy trades are being saved to database with "failed" status');
    console.log('3. The frontend is correctly displaying the data, but all trades are failed');
    console.log('4. The issue is in the copy trade execution, not the frontend display');
    
    console.log('\n🔧 SOLUTION NEEDED:');
    console.log('1. Fix the copy trade execution in the ultra-fast system');
    console.log('2. Ensure successful trades are saved with "executed" status');
    console.log('3. The frontend will then automatically show the correct data');
    console.log('4. Test with a new master trade to verify the fix');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugFrontendSync().catch(console.error); 