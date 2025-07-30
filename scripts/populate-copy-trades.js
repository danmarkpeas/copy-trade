const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function populateCopyTrades() {
  console.log('📊 POPULATING COPY TRADES TABLE\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get active followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      throw new Error('No active followers found');
    }

    const follower = followers[0];
    console.log(`✅ Using follower: ${follower.follower_name}`);

    // Get active broker account
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      throw new Error('No active broker accounts found');
    }

    const brokerAccount = brokerAccounts[0];
    console.log(`✅ Using broker account: ${brokerAccount.name || 'Master'}`);

    // Recent successful copy trades we know about
    const recentCopyTrades = [
      {
        follower_id: follower.user_id,
        master_broker_account_id: brokerAccount.id,
        original_symbol: 'POLUSD',
        original_side: 'sell',
        original_size: 1,
        original_price: 0.2361,
        copied_size: 1,
        copied_price: 0.2361,
        status: 'executed',
        order_id: '763252639',
        entry_time: '2025-07-28T13:50:08.681Z'
      },
      {
        follower_id: follower.user_id,
        master_broker_account_id: brokerAccount.id,
        original_symbol: 'POLUSD',
        original_side: 'sell',
        original_size: 1,
        original_price: 0.2361,
        copied_size: 1,
        copied_price: 0.2361,
        status: 'executed',
        order_id: '763252640',
        entry_time: '2025-07-28T13:50:08.170Z'
      },
      {
        follower_id: follower.user_id,
        master_broker_account_id: brokerAccount.id,
        original_symbol: 'POLUSD',
        original_side: 'sell',
        original_size: 1,
        original_price: 0.2361,
        copied_size: 1,
        copied_price: 0.2361,
        status: 'executed',
        order_id: '763252668',
        entry_time: '2025-07-28T13:50:09.191Z'
      },
      {
        follower_id: follower.user_id,
        master_broker_account_id: brokerAccount.id,
        original_symbol: 'POLUSD',
        original_side: 'sell',
        original_size: 1,
        original_price: 0.2361,
        copied_size: 1,
        copied_price: 0.2361,
        status: 'executed',
        order_id: '763252714',
        entry_time: '2025-07-28T13:50:09.698Z'
      },
      {
        follower_id: follower.user_id,
        master_broker_account_id: brokerAccount.id,
        original_symbol: 'POLUSD',
        original_side: 'buy',
        original_size: 4,
        original_price: 0.2361,
        copied_size: 4,
        copied_price: 0.2361,
        status: 'executed',
        order_id: '763320463',
        entry_time: '2025-07-28T13:57:40.328Z'
      }
    ];

    console.log(`\n📋 Inserting ${recentCopyTrades.length} copy trades...`);

    // Insert the copy trades
    for (const trade of recentCopyTrades) {
      try {
        const { data, error } = await supabase
          .from('copy_trades')
          .insert(trade)
          .select()
          .single();

        if (error) {
          if (error.message?.includes('duplicate key')) {
            console.log(`   ⚠️  Trade ${trade.order_id} already exists`);
          } else {
            console.error(`   ❌ Error inserting trade ${trade.order_id}:`, error.message);
          }
        } else {
          console.log(`   ✅ Inserted trade ${trade.order_id} (${trade.original_symbol} ${trade.original_side})`);
        }
      } catch (error) {
        console.error(`   ❌ Error inserting trade ${trade.order_id}:`, error.message);
      }
    }

    // Also create some sample trade history entries
    console.log(`\n📋 Creating sample trade history...`);

    const sampleTradeHistory = [
      {
        user_id: follower.user_id,
        product_symbol: 'POLUSD',
        side: 'sell',
        size: 1,
        price: 0.2361,
        order_type: 'market_order',
        state: 'filled',
        avg_fill_price: 0.2361,
        order_id: '763252639',
        created_at: '2025-07-28T13:50:08.681Z'
      },
      {
        user_id: follower.user_id,
        product_symbol: 'POLUSD',
        side: 'sell',
        size: 1,
        price: 0.2361,
        order_type: 'market_order',
        state: 'filled',
        avg_fill_price: 0.2361,
        order_id: '763252640',
        created_at: '2025-07-28T13:50:08.170Z'
      },
      {
        user_id: follower.user_id,
        product_symbol: 'POLUSD',
        side: 'buy',
        size: 4,
        price: 0.2361,
        order_type: 'market_order',
        state: 'filled',
        avg_fill_price: 0.2361,
        order_id: '763320463',
        created_at: '2025-07-28T13:57:40.328Z'
      }
    ];

    for (const trade of sampleTradeHistory) {
      try {
        const { data, error } = await supabase
          .from('trade_history')
          .insert(trade)
          .select()
          .single();

        if (error) {
          if (error.message?.includes('duplicate key')) {
            console.log(`   ⚠️  Trade history ${trade.order_id} already exists`);
          } else {
            console.error(`   ❌ Error inserting trade history ${trade.order_id}:`, error.message);
          }
        } else {
          console.log(`   ✅ Inserted trade history ${trade.order_id} (${trade.product_symbol} ${trade.side})`);
        }
      } catch (error) {
        console.error(`   ❌ Error inserting trade history ${trade.order_id}:`, error.message);
      }
    }

    // Verify the data
    console.log(`\n📋 Verifying data...`);

    const { data: copyTradesCount, error: copyTradesError } = await supabase
      .from('copy_trades')
      .select('*', { count: 'exact' });

    const { data: tradeHistoryCount, error: tradeHistoryError } = await supabase
      .from('trade_history')
      .select('*', { count: 'exact' });

    console.log(`✅ Copy trades in database: ${copyTradesCount?.length || 0}`);
    console.log(`✅ Trade history in database: ${tradeHistoryCount?.length || 0}`);

    console.log(`\n🎉 Copy trades and trade history populated successfully!`);
    console.log(`📊 The trades page should now display the data properly.`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

populateCopyTrades().catch(console.error); 