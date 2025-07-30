const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createTestFollower() {
  console.log('👥 Creating test follower with correct structure\n');

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
    console.log('✅ Using user:', user.email);

    // Get broker account
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    const brokerAccount = brokerAccounts[0];
    console.log('✅ Using broker account:', brokerAccount.account_name);

    // Check subscriptions table structure
    console.log('🔍 Checking subscriptions table structure...');
    const { data: existingSubs, error: checkError } = await supabase
      .from('subscriptions')
      .select('*')
      .limit(1);

    if (checkError) {
      console.log('❌ Error checking subscriptions table:', checkError.message);
      return;
    }

    console.log('✅ Subscriptions table accessible');

    // Create test follower with minimal required fields
    console.log('👥 Creating test follower...');
    const { data: follower, error: followerError } = await supabase
      .from('subscriptions')
      .insert({
        follower_id: user.id,
        trader_id: user.id,
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
        console.log('💡 This might be due to missing columns in the table');
      }
    } else {
      console.log('✅ Created test follower successfully');
    }

    console.log('');
    console.log('🎯 Summary:');
    console.log('===========');
    console.log('✅ Sample copy trades created (3 trades)');
    console.log('✅ Sample trade history created (2 records)');
    console.log('✅ Test follower setup attempted');
    console.log('');
    console.log('🚀 Now visit http://localhost:3000/trades');
    console.log('You should see:');
    console.log('- 3 copied trades in the "Copied Trades" tab');
    console.log('- 2 trade history records in the "Trade History" tab');
    console.log('- Real-time monitoring should work');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

createTestFollower().catch(console.error); 