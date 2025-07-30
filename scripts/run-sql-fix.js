const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSqlFix() {
  console.log('🔧 Running SQL Function Fix\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing required environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'fix-function-conflict.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 SQL Content to execute:');
    console.log('=' .repeat(50));
    console.log(sqlContent);
    console.log('=' .repeat(50));
    console.log('');

    console.log('⚠️  IMPORTANT: This script will modify your database functions.');
    console.log('   Please review the SQL above before proceeding.');
    console.log('');
    console.log('🚀 To execute this SQL:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/urjgxetnqogwryhpafma/sql');
    console.log('   2. Copy the SQL content above');
    console.log('   3. Paste it in the SQL editor');
    console.log('   4. Click "Run" to execute');
    console.log('');
    console.log('📋 After running the SQL, test with: node scripts/test-function-fix.js');
    console.log('');

    // Try to execute via RPC if available
    console.log('🔄 Attempting to execute via RPC...');
    try {
      const { data, error } = await supabase
        .rpc('exec_sql', { sql_query: sqlContent });

      if (error) {
        console.log('❌ RPC execution failed:', error.message);
        console.log('   This is expected - please use the manual SQL execution method above.');
      } else {
        console.log('✅ SQL executed successfully via RPC!');
        console.log('   Result:', data);
      }
    } catch (rpcError) {
      console.log('❌ RPC function not available:', rpcError.message);
      console.log('   Please use the manual SQL execution method above.');
    }

  } catch (error) {
    console.log('❌ Error reading SQL file:', error.message);
  }
}

runSqlFix().catch(console.error); 