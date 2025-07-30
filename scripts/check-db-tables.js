const { createClient } = require('@supabase/supabase-js');

async function checkDatabaseTables() {
  console.log('🔍 Checking database tables...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const tables = [
    'users',
    'traders', 
    'followers',
    'trades',
    'copied_trades',
    'notifications',
    'broker_accounts',
    'subscriptions',
    'trade_history',
    'copy_trades',
    'trade_sync_status'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Table exists`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  console.log('\n📊 Summary:');
  console.log('Tables should exist: users, traders, followers, trades, copied_trades, notifications, broker_accounts, subscriptions, trade_history, copy_trades, trade_sync_status');
}

checkDatabaseTables().catch(console.error); 