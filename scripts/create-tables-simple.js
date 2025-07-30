const { createClient } = require('@supabase/supabase-js');

async function createMissingTables() {
  console.log('🔧 Creating missing tables...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const tables = [
    {
      name: 'copy_trades',
      sql: `
        CREATE TABLE IF NOT EXISTS copy_trades (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          master_trade_id text NOT NULL,
          master_broker_id uuid REFERENCES broker_accounts(id) ON DELETE CASCADE,
          follower_id uuid REFERENCES users(id) ON DELETE CASCADE,
          follower_order_id text,
          original_symbol text NOT NULL,
          original_side text NOT NULL CHECK (original_side IN ('buy', 'sell')),
          original_size numeric NOT NULL,
          original_price numeric NOT NULL,
          copied_size numeric NOT NULL,
          copied_price numeric NOT NULL,
          status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'exited', 'cancelled')),
          entry_time timestamptz DEFAULT now(),
          exit_time timestamptz,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
      `
    },
    {
      name: 'trade_sync_status',
      sql: `
        CREATE TABLE IF NOT EXISTS trade_sync_status (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          master_broker_id uuid REFERENCES broker_accounts(id) ON DELETE CASCADE,
          follower_id uuid REFERENCES users(id) ON DELETE CASCADE,
          master_trade_id text NOT NULL,
          follower_trade_id text,
          sync_status text NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'unsynced', 'error')),
          last_verified timestamptz DEFAULT now(),
          error_message text,
          retry_count int DEFAULT 0,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
      `
    }
  ];

  for (const table of tables) {
    try {
      console.log(`🔧 Creating table: ${table.name}`);
      
      // Try to query the table first to see if it exists
      const { data: checkData, error: checkError } = await supabase
        .from(table.name)
        .select('*')
        .limit(1);

      if (checkError && checkError.message.includes('does not exist')) {
        console.log(`   ❌ Table ${table.name} does not exist - needs to be created manually`);
        console.log(`   📝 Please run this SQL in your Supabase dashboard:`);
        console.log(`   ${table.sql}`);
      } else {
        console.log(`   ✅ Table ${table.name} exists`);
      }
    } catch (err) {
      console.log(`   ❌ Error checking ${table.name}: ${err.message}`);
    }
  }

  console.log('\n📋 Manual Steps Required:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Run the SQL commands shown above');
  console.log('4. Then run the test again');
}

createMissingTables().catch(console.error); 