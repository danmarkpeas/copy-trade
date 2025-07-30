const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testTradesPage() {
  console.log('🔍 Testing Trades Page Functionality\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('📋 Environment Variables Check:');
  console.log('================================');
  console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ SET' : '❌ NOT SET'}`);
  console.log('');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Missing required environment variables');
    console.log('Please ensure your .env file is properly configured');
    return;
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    console.log('🔐 Testing Authentication...');
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Authentication error:', authError.message);
      console.log('💡 You need to be logged in to view trades');
      return;
    }

    if (!user) {
      console.log('❌ No authenticated user found');
      console.log('💡 Please log in to your account first');
      return;
    }

    console.log('✅ User authenticated:', user.email);
    console.log('');

    // Test broker accounts
    console.log('🏦 Testing Broker Accounts...');
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (brokerError) {
      console.log('❌ Error fetching broker accounts:', brokerError.message);
      return;
    }

    console.log(`✅ Found ${brokerAccounts?.length || 0} active broker accounts`);
    if (brokerAccounts && brokerAccounts.length > 0) {
      console.log('   Active broker:', brokerAccounts[0].account_name);
    }
    console.log('');

    // Test copy_trades table
    console.log('📊 Testing Copy Trades Table...');
    const { data: copyTrades, error: copyTradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (copyTradesError) {
      console.log('❌ Error fetching copy trades:', copyTradesError.message);
      if (copyTradesError.message.includes('does not exist')) {
        console.log('💡 The copy_trades table may not exist yet');
      }
    } else {
      console.log(`✅ Found ${copyTrades?.length || 0} copied trades`);
      if (copyTrades && copyTrades.length > 0) {
        console.log('   Latest trade:', copyTrades[0].original_symbol, copyTrades[0].status);
      }
    }
    console.log('');

    // Test trade_history table
    console.log('📈 Testing Trade History Table...');
    const { data: tradeHistory, error: historyError } = await supabase
      .from('trade_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (historyError) {
      console.log('❌ Error fetching trade history:', historyError.message);
      if (historyError.message.includes('does not exist')) {
        console.log('💡 The trade_history table may not exist yet');
      }
    } else {
      console.log(`✅ Found ${tradeHistory?.length || 0} trade history records`);
      if (tradeHistory && tradeHistory.length > 0) {
        console.log('   Latest trade:', tradeHistory[0].product_symbol, tradeHistory[0].state);
      }
    }
    console.log('');

    // Test followers
    console.log('👥 Testing Followers...');
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

    console.log('🎯 Summary:');
    console.log('===========');
    console.log('✅ Authentication: Working');
    console.log(`✅ Broker Accounts: ${brokerAccounts?.length || 0} active`);
    console.log(`✅ Copy Trades: ${copyTrades?.length || 0} found`);
    console.log(`✅ Trade History: ${tradeHistory?.length || 0} found`);
    console.log(`✅ Followers: ${followers?.length || 0} active`);
    console.log('');

    if (brokerAccounts && brokerAccounts.length > 0) {
      console.log('🚀 Ready to test real-time monitoring!');
      console.log('Visit http://localhost:3000/trades and click "Real-Time Monitor & Copy"');
    } else {
      console.log('⚠️  No active broker accounts found');
      console.log('Please create a broker account first at http://localhost:3000/connect-broker');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testTradesPage().catch(console.error); 