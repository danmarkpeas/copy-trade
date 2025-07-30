const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkFollowerSetup() {
  console.log('🔍 CHECKING ANNESHAN FOLLOWER SETUP\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Get Anneshan's follower details
    console.log('📋 STEP 1: Anneshan Follower Details');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_name', 'Anneshan');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No follower found for Anneshan');
      return;
    }

    const follower = followers[0];
    console.log('✅ Anneshan follower found:');
    console.log(`   ID: ${follower.id}`);
    console.log(`   Name: ${follower.follower_name}`);
    console.log(`   User ID: ${follower.user_id}`);
    console.log(`   Master Broker ID: ${follower.master_broker_account_id}`);
    console.log(`   Account Status: ${follower.account_status}`);
    console.log(`   Copy Mode: ${follower.copy_mode}`);
    console.log(`   Copy Ratio: ${follower.copy_ratio}`);
    console.log(`   Is Active: ${follower.is_active}`);
    console.log(`   Created: ${follower.created_at}`);

    // 2. Get the master broker account
    console.log('\n📋 STEP 2: Master Broker Account');
    const { data: masterBroker, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', follower.master_broker_account_id)
      .single();

    if (brokerError || !masterBroker) {
      console.log('❌ Master broker account not found');
      return;
    }

    console.log('✅ Master broker found:');
    console.log(`   ID: ${masterBroker.id}`);
    console.log(`   Name: ${masterBroker.account_name}`);
    console.log(`   User ID: ${masterBroker.user_id}`);
    console.log(`   Account Status: ${masterBroker.account_status}`);
    console.log(`   Is Active: ${masterBroker.is_active}`);
    console.log(`   Is Verified: ${masterBroker.is_verified}`);

    // 3. Check if Anneshan has a broker account
    console.log('\n📋 STEP 3: Anneshan Broker Account');
    const { data: followerBroker, error: followerBrokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', follower.user_id)
      .eq('is_active', true);

    if (followerBrokerError) {
      console.log('❌ Error checking follower broker:', followerBrokerError);
    } else if (!followerBroker || followerBroker.length === 0) {
      console.log('⚠️  Anneshan does not have an active broker account');
      console.log('   This is why trades are not being copied!');
    } else {
      console.log('✅ Anneshan has broker account(s):');
      followerBroker.forEach((broker, index) => {
        console.log(`   ${index + 1}. ${broker.account_name}`);
        console.log(`      ID: ${broker.id}`);
        console.log(`      Status: ${broker.account_status}`);
        console.log(`      API Key: ${broker.api_key?.substring(0, 10)}...`);
      });
    }

    // 4. Check recent copy trades
    console.log('\n📊 STEP 4: Recent Copy Trades');
    const { data: copyTrades, error: tradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .eq('follower_id', follower.user_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (tradesError) {
      console.log('❌ Error fetching copy trades:', tradesError);
    } else {
      console.log(`✅ Found ${copyTrades?.length || 0} copy trades for Anneshan:`);
      if (copyTrades && copyTrades.length > 0) {
        copyTrades.forEach((trade, index) => {
          const timeAgo = Math.floor((Date.now() - new Date(trade.created_at).getTime()) / (1000 * 60));
          console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size} (${trade.status})`);
          console.log(`      Master Trade ID: ${trade.master_trade_id}`);
          console.log(`      Follower Order ID: ${trade.follower_order_id || 'Not set'}`);
          console.log(`      Time Ago: ${timeAgo} minutes`);
          console.log('');
        });
      }
    }

    // 5. Check copy trading engine status
    console.log('🎯 COPY TRADING ANALYSIS:');
    
    if (!followerBroker || followerBroker.length === 0) {
      console.log('❌ ISSUE FOUND: Anneshan has no broker account');
      console.log('   → Trades cannot be copied without a broker account');
      console.log('   → The copy trading engine filters out trades for followers without broker accounts');
    } else {
      console.log('✅ Anneshan has broker account(s)');
      console.log('   → Copy trading should work');
    }

    console.log(`   → Follower Status: ${follower.account_status}`);
    console.log(`   → Copy Mode: ${follower.copy_mode}`);
    console.log(`   → Copy Ratio: ${follower.copy_ratio}`);

    console.log('\n💡 RECOMMENDATIONS:');
    if (!followerBroker || followerBroker.length === 0) {
      console.log('1. 🔗 Create a broker account for Anneshan');
      console.log('2. 🔑 Add API keys with trading permissions');
      console.log('3. ✅ Verify the broker account is active');
      console.log('4. 🔄 Restart the copy trading engine');
    } else {
      console.log('1. 🔍 Check if the broker account has sufficient balance');
      console.log('2. 🔑 Verify API keys have trading permissions');
      console.log('3. 📊 Check copy trading engine logs for specific errors');
      console.log('4. 🔄 Test with a new trade on the master account');
    }

  } catch (error) {
    console.log('❌ Error checking follower setup:', error.message);
  }
}

checkFollowerSetup().catch(console.error); 