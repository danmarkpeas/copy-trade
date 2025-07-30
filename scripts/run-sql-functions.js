const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSqlFunctions() {
  console.log('🔧 Running SQL Functions in Supabase Database\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing required environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'create-missing-functions.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 SQL file loaded successfully');
    console.log('   File size:', sqlContent.length, 'characters');
    console.log('');

    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`🔧 Found ${statements.length} SQL statements to execute`);
    console.log('');

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim().length === 0) continue;

      try {
        console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
        
        // Use the rpc method to execute SQL
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });

        if (error) {
          console.log(`❌ Error in statement ${i + 1}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }

    console.log('');
    console.log('🎯 Execution Summary:');
    console.log('=====================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📊 Total: ${statements.length}`);
    console.log('');

    if (errorCount === 0) {
      console.log('🎉 All SQL functions created successfully!');
      console.log('');
      console.log('🚀 Now you can:');
      console.log('1. Go to http://localhost:3000/followers');
      console.log('2. Create a new follower account');
      console.log('3. The create_follower_account function will work');
      console.log('4. Test the real-time monitoring again');
    } else {
      console.log('⚠️  Some functions failed to create');
      console.log('💡 You may need to run the SQL manually in Supabase Dashboard');
      console.log('   Go to: https://supabase.com/dashboard/project/urjgxetnqogwryhpafma/sql');
    }

  } catch (error) {
    console.log('❌ Error reading SQL file:', error.message);
    console.log('');
    console.log('💡 Manual Instructions:');
    console.log('1. Go to https://supabase.com/dashboard/project/urjgxetnqogwryhpafma/sql');
    console.log('2. Copy the contents of scripts/create-missing-functions.sql');
    console.log('3. Paste and execute the SQL');
    console.log('4. Then try creating a follower account again');
  }
}

runSqlFunctions().catch(console.error); 