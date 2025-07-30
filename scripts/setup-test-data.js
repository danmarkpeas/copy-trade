const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function setupTestData() {
  console.log('🔧 Setting up test data for trades page\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing required environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get the current user (you need to be logged in)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Please log in to your account first');
      console.log('Visit http://localhost:3000 and sign in');
      return;
    }

    console.log('✅ User authenticated:', user.email);
    console.log('');

    // Check if broker account exists
    console.log('🏦 Checking broker accounts...');
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (brokerError) {
      console.log('❌ Error checking broker accounts:', brokerError.message);
      return;
    }

    if (!brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      console.log('💡 Please create a broker account first at http://localhost:3000/connect-broker');
      return;
    }

    const brokerAccount = brokerAccounts[0];
    console.log('✅ Found active broker account:', brokerAccount.account_name);
    console.log('');

    // Create a test follower (subscription)
    console.log('👥 Creating test follower...');
    const { data: follower, error: followerError } = await supabase
      .from('subscriptions')
      .insert({
        follower_id: user.id,
        trader_id: user.id, // Following yourself for testing
        broker_account_id: brokerAccount.id,
        copy_mode: 'multiplier',
        multiplier: 0.5,
        capital_allocated: 1000,
        drawdown_limit: 5,
        is_active: true,
        sync_status: 'active'
      })
      .select()
      .single();

    if (followerError) {
      if (followerError.message.includes('duplicate key')) {
        console.log('✅ Test follower already exists');
      } else {
        console.log('❌ Error creating follower:', followerError.message);
        return;
      }
    } else {
      console.log('✅ Created test follower');
    }
    console.log('');

    // Create some sample copy trades
    console.log('📊 Creating sample copy trades...');
    const sampleTrades = [
      {
        master_trade_id: 'test_trade_001',
        master_broker_id: brokerAccount.id,
        follower_id: user.id,
        follower_order_id: 'follower_order_001',
        original_symbol: 'BTC-PERP',
        original_side: 'buy',
        original_size: 0.1,
        original_price: 45000,
        copied_size: 0.05,
        copied_price: 45000,
        status: 'executed',
        entry_time: new Date().toISOString(),
        created_at: new Date().toISOString()
      },
      {
        master_trade_id: 'test_trade_002',
        master_broker_id: brokerAccount.id,
        follower_id: user.id,
        follower_order_id: 'follower_order_002',
        original_symbol: 'ETH-PERP',
        original_side: 'sell',
        original_size: 1.0,
        original_price: 2800,
        copied_size: 0.5,
        copied_price: 2800,
        status: 'pending',
        entry_time: new Date().toISOString(),
        created_at: new Date().toISOString()
      },
      {
        master_trade_id: 'test_trade_003',
        master_broker_id: brokerAccount.id,
        follower_id: user.id,
        follower_order_id: 'follower_order_003',
        original_symbol: 'SOL-PERP',
        original_side: 'buy',
        original_size: 10,
        original_price: 120,
        copied_size: 5,
        copied_price: 120,
        status: 'executed',
        entry_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        exit_time: new Date().toISOString(),
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ];

    for (const trade of sampleTrades) {
      const { error: tradeError } = await supabase
        .from('copy_trades')
        .insert(trade);

      if (tradeError) {
        if (tradeError.message.includes('duplicate key')) {
          console.log('✅ Sample trade already exists:', trade.original_symbol);
        } else {
          console.log('❌ Error creating sample trade:', tradeError.message);
        }
      } else {
        console.log('✅ Created sample trade:', trade.original_symbol);
      }
    }
    console.log('');

    // Create sample trade history
    console.log('📈 Creating sample trade history...');
    const sampleHistory = [
      {
        user_id: user.id,
        product_symbol: 'BTC-PERP',
        side: 'buy',
        size: 0.05,
        price: 45000,
        order_type: 'market',
        state: 'filled',
        avg_fill_price: 45000,
        order_id: 'history_order_001',
        created_at: new Date().toISOString()
      },
      {
        user_id: user.id,
        product_symbol: 'ETH-PERP',
        side: 'sell',
        size: 0.5,
        price: 2800,
        order_type: 'limit',
        state: 'open',
        avg_fill_price: 0,
        order_id: 'history_order_002',
        created_at: new Date().toISOString()
      }
    ];

    for (const history of sampleHistory) {
      const { error: historyError } = await supabase
        .from('trade_history')
        .insert(history);

      if (historyError) {
        if (historyError.message.includes('duplicate key')) {
          console.log('✅ Trade history already exists:', history.product_symbol);
        } else {
          console.log('❌ Error creating trade history:', historyError.message);
        }
      } else {
        console.log('✅ Created trade history:', history.product_symbol);
      }
    }
    console.log('');

    console.log('🎉 Test data setup complete!');
    console.log('============================');
    console.log('✅ Created test follower');
    console.log('✅ Created 3 sample copy trades');
    console.log('✅ Created 2 sample trade history records');
    console.log('');
    console.log('🚀 Now visit http://localhost:3000/trades');
    console.log('You should see:');
    console.log('- Copied trades in the "Copied Trades" tab');
    console.log('- Trade history in the "Trade History" tab');
    console.log('- Real-time monitoring should show 1 active follower');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

setupTestData().catch(console.error); 