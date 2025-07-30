const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function applyForeignKeyFix() {
  console.log('🔧 Applying Foreign Key Constraint Fix...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-follower-foreign-key.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📋 SQL Fix to run in Supabase Dashboard:');
    console.log('=' .repeat(60));
    console.log(sqlContent);
    console.log('=' .repeat(60));

    console.log('\n📋 Instructions:');
    console.log('1. Go to https://supabase.com/dashboard/project/urjgxetnqogwryhpafma/sql');
    console.log('2. Copy and paste the SQL above');
    console.log('3. Click "Run"');
    console.log('4. This will fix the foreign key constraint issue');

    console.log('\n🔍 Problem Identified:');
    console.log('   The followers.subscribed_to field was referencing the "traders" table');
    console.log('   But it should reference the "users" table');
    console.log('   This caused the foreign key constraint error');

    console.log('\n🔧 Solution:');
    console.log('   - Drop the incorrect foreign key constraint');
    console.log('   - Add the correct foreign key constraint to reference users(id)');
    console.log('   - Test the insertion to verify it works');

    // Test the insertion after the user applies the fix
    console.log('\n🧪 After applying the SQL fix, test with:');
    console.log('   node scripts/test-follower-creation-after-fix.js');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('   The foreign key constraint error was caused by:');
  console.log('   - followers.subscribed_to referencing "traders" table instead of "users" table');
  console.log('   - The SQL fix above will correct this reference');
  console.log('   - After applying the fix, follower creation should work correctly');
}

applyForeignKeyFix().catch(console.error); 