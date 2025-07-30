const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStatus() {
  console.log('🔍 CHECKING DATABASE STATUS');
  console.log('==========================\n');

  try {
    // Check users
    console.log('👤 Checking users...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, name, created_at');

    if (userError) {
      console.error('❌ Error fetching users:', userError);
    } else {
      console.log(`✅ Users: ${users?.length || 0}`);
      if (users && users.length > 0) {
        users.forEach(user => {
          console.log(`   - ${user.email} (${user.id})`);
        });
      }
    }

    // Check broker accounts
    console.log('\n🏦 Checking broker accounts...');
    const { data: brokers, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('id, account_name, broker_name, account_status, user_id, is_verified');

    if (brokerError) {
      console.error('❌ Error fetching broker accounts:', brokerError);
    } else {
      console.log(`✅ Broker accounts: ${brokers?.length || 0}`);
      if (brokers && brokers.length > 0) {
        brokers.forEach(broker => {
          console.log(`   - ${broker.account_name} (${broker.broker_name}) - ${broker.account_status}`);
        });
      }
    }

    // Check followers
    console.log('\n👥 Checking followers...');
    const { data: followers, error: followerError } = await supabase
      .from('followers')
      .select('id, follower_name, copy_mode, account_status, user_id, master_broker_account_id');

    if (followerError) {
      console.error('❌ Error fetching followers:', followerError);
    } else {
      console.log(`✅ Followers: ${followers?.length || 0}`);
      if (followers && followers.length > 0) {
        followers.forEach(follower => {
          console.log(`   - ${follower.follower_name} (${follower.copy_mode}) - ${follower.account_status}`);
        });
      }
    }

    // Check copy trades
    console.log('\n📊 Checking copy trades...');
    const { data: trades, error: tradeError } = await supabase
      .from('copy_trades')
      .select('id, broker_name, follower_name, symbol, side, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (tradeError) {
      console.error('❌ Error fetching copy trades:', tradeError);
    } else {
      console.log(`✅ Recent copy trades: ${trades?.length || 0}`);
      if (trades && trades.length > 0) {
        trades.forEach(trade => {
          console.log(`   - ${trade.symbol} ${trade.side} (${trade.broker_name} → ${trade.follower_name})`);
        });
      }
    }

    // Summary
    console.log('\n📋 SUMMARY');
    console.log('==========');
    console.log(`Users: ${users?.length || 0}`);
    console.log(`Brokers: ${brokers?.length || 0} (${brokers?.filter(b => b.account_status === 'active').length || 0} active)`);
    console.log(`Followers: ${followers?.length || 0} (${followers?.filter(f => f.account_status === 'active').length || 0} active)`);
    console.log(`Recent trades: ${trades?.length || 0}`);

    if ((brokers?.length || 0) === 0) {
      console.log('\n❌ ISSUE: No broker accounts found');
      console.log('💡 Solution: Create broker accounts through the frontend');
    } else if ((brokers?.filter(b => b.account_status === 'active').length || 0) === 0) {
      console.log('\n❌ ISSUE: No active broker accounts');
      console.log('💡 Solution: Activate broker accounts or create new ones');
    } else {
      console.log('\n✅ System appears to be properly configured');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDatabaseStatus(); 