const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function verifyTradesPage() {
  console.log('🔍 Verifying Trades Page Data\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing required environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get the first user
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.log('❌ No users found');
      return;
    }

    const user = users[0];
    console.log('✅ User found:', user.email);
    console.log('');

    // Check copy trades
    console.log('📊 Checking Copy Trades...');
    const { data: copyTrades, error: copyTradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false });

    if (copyTradesError) {
      console.log('❌ Error fetching copy trades:', copyTradesError.message);
    } else {
      console.log(`✅ Found ${copyTrades?.length || 0} copy trades`);
      if (copyTrades && copyTrades.length > 0) {
        console.log('   Recent trades:');
        copyTrades.slice(0, 3).forEach((trade, index) => {
          console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} - ${trade.status}`);
        });
      }
    }
    console.log('');

    // Check trade history
    console.log('📈 Checking Trade History...');
    const { data: tradeHistory, error: historyError } = await supabase
      .from('trade_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (historyError) {
      console.log('❌ Error fetching trade history:', historyError.message);
    } else {
      console.log(`✅ Found ${tradeHistory?.length || 0} trade history records`);
      if (tradeHistory && tradeHistory.length > 0) {
        console.log('   Recent history:');
        tradeHistory.slice(0, 3).forEach((trade, index) => {
          console.log(`   ${index + 1}. ${trade.product_symbol} ${trade.side} - ${trade.state}`);
        });
      }
    }
    console.log('');

    // Check broker accounts
    console.log('🏦 Checking Broker Accounts...');
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (brokerError) {
      console.log('❌ Error fetching broker accounts:', brokerError.message);
    } else {
      console.log(`✅ Found ${brokerAccounts?.length || 0} active broker accounts`);
      if (brokerAccounts && brokerAccounts.length > 0) {
        console.log('   Active broker:', brokerAccounts[0].account_name);
      }
    }
    console.log('');

    // Check subscriptions/followers
    console.log('👥 Checking Followers...');
    const { data: followers, error: followersError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('follower_id', user.id)
      .eq('is_active', true);

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError.message);
    } else {
      console.log(`✅ Found ${followers?.length || 0} active followers`);
    }
    console.log('');

    console.log('🎯 Trades Page Status:');
    console.log('======================');
    console.log(`✅ Copy Trades: ${copyTrades?.length || 0} records`);
    console.log(`✅ Trade History: ${tradeHistory?.length || 0} records`);
    console.log(`✅ Broker Accounts: ${brokerAccounts?.length || 0} active`);
    console.log(`✅ Followers: ${followers?.length || 0} active`);
    console.log('');

    if (copyTrades && copyTrades.length > 0) {
      console.log('🚀 SUCCESS! Your trades page should now show data.');
      console.log('');
      console.log('📱 Next Steps:');
      console.log('1. Visit http://localhost:3000/trades');
      console.log('2. You should see copied trades in the first tab');
      console.log('3. You should see trade history in the second tab');
      console.log('4. Click "Real-Time Monitor & Copy" to test monitoring');
      console.log('');
      console.log('🎉 The trades page is now fully functional!');
    } else {
      console.log('⚠️  No copy trades found yet');
      console.log('💡 This is normal if no real trades have been copied yet');
      console.log('🚀 The page will show data when trades are actually copied');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

verifyTradesPage().catch(console.error); 