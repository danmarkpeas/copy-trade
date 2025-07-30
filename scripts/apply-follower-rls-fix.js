const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyFollowerRLSFix() {
  console.log('🔧 APPLYING FOLLOWER RLS FIX');
  console.log('============================\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-follower-rls-policies.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon to get individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.log(`❌ Error executing statement ${i + 1}:`, error.message);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`❌ Exception executing statement ${i + 1}:`, err.message);
        }
      }
    }

    console.log('\n🎉 RLS policies applied successfully!');

    // Test the fix
    console.log('\n🧪 Testing the fix...');
    
    // Test with anon key (should now work for system followers)
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: anonFollowers, error: anonError } = await anonSupabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (anonError) {
      console.log('❌ Anon key still has error:', anonError.message);
    } else {
      console.log(`✅ Anon key now found ${anonFollowers?.length || 0} followers`);
      if (anonFollowers && anonFollowers.length > 0) {
        anonFollowers.forEach((follower, index) => {
          console.log(`  ${index + 1}. ${follower.follower_name} (user_id: ${follower.user_id || 'null'})`);
        });
      }
    }

    // Test with service role (should still work)
    const { data: serviceFollowers, error: serviceError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (serviceError) {
      console.log('❌ Service role error:', serviceError.message);
    } else {
      console.log(`✅ Service role still found ${serviceFollowers?.length || 0} followers`);
    }

  } catch (error) {
    console.log('❌ Error applying RLS fix:', error.message);
  }
}

// Run the fix
applyFollowerRLSFix().then(() => {
  console.log('\n🎉 FOLLOWER RLS FIX COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Fix error:', error);
  process.exit(1);
}); 