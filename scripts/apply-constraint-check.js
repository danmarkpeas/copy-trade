const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function applyConstraintCheck() {
  console.log('🔍 Applying Foreign Key Constraint Check...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-follower-constraints.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📋 SQL Content to run in Supabase Dashboard:');
    console.log('=' .repeat(50));
    console.log(sqlContent);
    console.log('=' .repeat(50));

    console.log('\n📋 Instructions:');
    console.log('1. Go to https://supabase.com/dashboard/project/urjgxetnqogwryhpafma/sql');
    console.log('2. Copy and paste the SQL above');
    console.log('3. Click "Run"');
    console.log('4. Check the results to identify the constraint issue');

    // Test a manual insertion with proper UUID
    console.log('\n🧪 Testing manual insertion with proper UUID...');
    const testFollowerData = {
      id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
      subscribed_to: 'fdb32e0d-0778-4f76-b153-c72b8656ab47',
      capital_allocated: 1000,
      risk_level: 'medium',
      copy_mode: 'fixed lot',
      follower_name: 'Test Follower UUID',
      lot_size: 0.01,
      master_broker_account_id: 'f1bff339-23e2-4763-9aad-a3a02d18cf22',
      profile_id: null,
      api_key: 'test_key',
      api_secret: 'test_secret',
      account_status: 'active',
      is_verified: true,
      created_at: new Date().toISOString()
    };

    console.log('   Attempting to insert with valid UUID...');
    const { data: insertedFollower, error: insertError } = await supabase
      .from('followers')
      .insert(testFollowerData)
      .select()
      .single();

    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      console.log('   Code:', insertError.code);
      console.log('   Details:', insertError.details);
      console.log('   Hint:', insertError.hint);
      
      if (insertError.message.includes('foreign key constraint')) {
        console.log('\n🔍 This confirms the foreign key constraint issue');
        console.log('   Run the SQL above in Supabase Dashboard to identify the exact constraint');
      }
    } else {
      console.log('✅ Manual insertion successful:', insertedFollower.id);
      
      // Clean up
      const { error: deleteError } = await supabase
        .from('followers')
        .delete()
        .eq('id', insertedFollower.id);
      
      if (deleteError) {
        console.log('⚠️  Warning: Could not clean up test record:', deleteError.message);
      } else {
        console.log('✅ Test record cleaned up');
      }
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Run the SQL in Supabase Dashboard to check constraints');
  console.log('2. Look for any triggers that might be causing issues');
  console.log('3. Check if the foreign key references are correct');
  console.log('4. If needed, temporarily disable triggers to test');
}

applyConstraintCheck().catch(console.error); 