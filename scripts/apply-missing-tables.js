const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function applyMissingTables() {
  console.log('🔧 Applying missing tables...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read the SQL file
  const sqlContent = fs.readFileSync('scripts/create-missing-tables.sql', 'utf8');
  
  // Split into individual statements
  const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.trim()) {
      try {
        console.log(`\n🔧 Executing statement ${i + 1}/${statements.length}...`);
        console.log(`   ${statement.substring(0, 50)}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.log(`   ❌ Error: ${error.message}`);
        } else {
          console.log(`   ✅ Success`);
        }
      } catch (err) {
        console.log(`   ❌ Exception: ${err.message}`);
      }
    }
  }

  console.log('\n✅ Finished applying missing tables');
}

applyMissingTables().catch(console.error); 