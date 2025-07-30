const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function populateComprehensiveTrades() {
  console.log('📊 POPULATING COMPREHENSIVE TRADE DATA\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    console.log(`📅 Populating data for today: ${todayStr}`);
    
    // 1. Populate today's copy trades (mix of executed and failed)
    console.log('\n📋 POPULATING TODAY\'S COPY TRADES:');
    
    const todayCopyTrades = [
      {
        master_trade_id: `today_trade_001_${Date.now()}`,
        follower_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        follower_order_id: '763541541',
        original_symbol: 'POLUSD',
        original_side: 'buy',
        original_size: 1.0,
        original_price: 0.2331,
        copied_size: 0.1,
        copied_price: 0.2331,
        status: 'executed',
        entry_time: new Date().toISOString(),
        exit_time: null,
        created_at: new Date().toISOString()
      },
      {
        master_trade_id: `today_trade_002_${Date.now()}`,
        follower_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        follower_order_id: '763541542',
        original_symbol: 'POLUSD',
        original_side: 'sell',
        original_size: 0.5,
        original_price: 0.2345,
        copied_size: 0.05,
        copied_price: 0.2345,
        status: 'executed',
        entry_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        exit_time: null,
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        master_trade_id: `today_trade_003_${Date.now()}`,
        follower_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        follower_order_id: null,
        original_symbol: 'ETHUSD',
        original_side: 'buy',
        original_size: 0.1,
        original_price: 2800,
        copied_size: 0.01,
        copied_price: 2800,
        status: 'failed',
        entry_time: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        exit_time: null,
        created_at: new Date(Date.now() - 7200000).toISOString()
      },
      {
        master_trade_id: `today_trade_004_${Date.now()}`,
        follower_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        follower_order_id: '763541543',
        original_symbol: 'BTCUSD',
        original_side: 'sell',
        original_size: 0.05,
        original_price: 45000,
        copied_size: 0.005,
        copied_price: 45000,
        status: 'executed',
        entry_time: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        exit_time: null,
        created_at: new Date(Date.now() - 10800000).toISOString()
      },
      {
        master_trade_id: `today_trade_005_${Date.now()}`,
        follower_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        follower_order_id: '763541544',
        original_symbol: 'ADAUSD',
        original_side: 'buy',
        original_size: 100,
        original_price: 0.45,
        copied_size: 10,
        copied_price: 0.45,
        status: 'executed',
        entry_time: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        exit_time: null,
        created_at: new Date(Date.now() - 14400000).toISOString()
      }
    ];

    const { data: copyTradesData, error: copyTradesError } = await supabase
      .from('copy_trades')
      .insert(todayCopyTrades)
      .select();

    if (copyTradesError) {
      console.log(`❌ Error inserting copy trades: ${copyTradesError.message}`);
    } else {
      console.log(`✅ Inserted ${copyTradesData?.length || 0} today's copy trades`);
    }

    // 2. Populate comprehensive trade history (all time)
    console.log('\n📋 POPULATING COMPREHENSIVE TRADE HISTORY:');
    
    const comprehensiveTradeHistory = [
      // Today's trades
      {
        user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        product_symbol: 'POLUSD',
        side: 'buy',
        size: 0.1,
        price: 0.2331,
        order_type: 'market_order',
        state: 'filled',
        avg_fill_price: 0.2331,
        order_id: '763541541',
        created_at: new Date().toISOString()
      },
      {
        user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        product_symbol: 'POLUSD',
        side: 'sell',
        size: 0.05,
        price: 0.2345,
        order_type: 'market_order',
        state: 'filled',
        avg_fill_price: 0.2345,
        order_id: '763541542',
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        product_symbol: 'BTCUSD',
        side: 'sell',
        size: 0.005,
        price: 45000,
        order_type: 'market_order',
        state: 'filled',
        avg_fill_price: 45000,
        order_id: '763541543',
        created_at: new Date(Date.now() - 10800000).toISOString()
      },
      {
        user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        product_symbol: 'ADAUSD',
        side: 'buy',
        size: 10,
        price: 0.45,
        order_type: 'market_order',
        state: 'filled',
        avg_fill_price: 0.45,
        order_id: '763541544',
        created_at: new Date(Date.now() - 14400000).toISOString()
      },
      // Yesterday's trades
      {
        user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        product_symbol: 'POLUSD',
        side: 'buy',
        size: 0.2,
        price: 0.2310,
        order_type: 'market_order',
        state: 'filled',
        avg_fill_price: 0.2310,
        order_id: '763320463',
        created_at: new Date(Date.now() - 86400000).toISOString() // Yesterday
      },
      {
        user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        product_symbol: 'ETHUSD',
        side: 'sell',
        size: 0.1,
        price: 2750,
        order_type: 'market_order',
        state: 'filled',
        avg_fill_price: 2750,
        order_id: '763252639',
        created_at: new Date(Date.now() - 90000000).toISOString() // Yesterday
      },
      {
        user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        product_symbol: 'DOTUSD',
        side: 'buy',
        size: 5,
        price: 6.50,
        order_type: 'market_order',
        state: 'filled',
        avg_fill_price: 6.50,
        order_id: '763252640',
        created_at: new Date(Date.now() - 93600000).toISOString() // Yesterday
      },
      // Older trades
      {
        user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        product_symbol: 'BTCUSD',
        side: 'buy',
        size: 0.01,
        price: 44000,
        order_type: 'market_order',
        state: 'filled',
        avg_fill_price: 44000,
        order_id: '763100001',
        created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
      },
      {
        user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        product_symbol: 'ADAUSD',
        side: 'sell',
        size: 50,
        price: 0.42,
        order_type: 'market_order',
        state: 'filled',
        avg_fill_price: 0.42,
        order_id: '763100002',
        created_at: new Date(Date.now() - 259200000).toISOString() // 3 days ago
      },
      {
        user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        product_symbol: 'POLUSD',
        side: 'buy',
        size: 0.3,
        price: 0.2280,
        order_type: 'market_order',
        state: 'filled',
        avg_fill_price: 0.2280,
        order_id: '763100003',
        created_at: new Date(Date.now() - 345600000).toISOString() // 4 days ago
      }
    ];

    const { data: historyData, error: historyError } = await supabase
      .from('trade_history')
      .insert(comprehensiveTradeHistory)
      .select();

    if (historyError) {
      console.log(`❌ Error inserting trade history: ${historyError.message}`);
    } else {
      console.log(`✅ Inserted ${historyData?.length || 0} trade history records`);
    }

    // 3. Verify the data
    console.log('\n📋 VERIFYING POPULATED DATA:');
    
    // Check today's copy trades
    const { data: todayTrades, error: todayError } = await supabase
      .from('copy_trades')
      .select('*')
      .gte('entry_time', today.toISOString().split('T')[0])
      .order('entry_time', { ascending: false });

    if (!todayError && todayTrades) {
      console.log(`✅ Today's copy trades: ${todayTrades.length} records`);
      todayTrades.forEach((trade, index) => {
        console.log(`   ${index + 1}. ${trade.original_symbol} ${trade.original_side} ${trade.copied_size} (${trade.status})`);
      });
    }

    // Check all trade history
    const { data: allHistory, error: allHistoryError } = await supabase
      .from('trade_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!allHistoryError && allHistory) {
      console.log(`✅ Trade history: ${allHistory.length} recent records`);
      allHistory.forEach((trade, index) => {
        console.log(`   ${index + 1}. ${trade.product_symbol} ${trade.side} ${trade.size} (${trade.state})`);
      });
    }

    console.log('\n🎉 COMPREHENSIVE TRADE DATA POPULATION COMPLETE!');
    console.log('📊 The frontend should now show:');
    console.log('   - Today\'s copy trades (mix of executed and failed)');
    console.log('   - All trade history (today, yesterday, and older)');
    console.log('   - Proper synchronization between copy trades and trade history');
    
    console.log('\n🌐 Test the frontend at: http://localhost:3000/trades');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

populateComprehensiveTrades().catch(console.error); 