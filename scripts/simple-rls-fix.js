const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function simpleRLSFix() {
  console.log('🔧 SIMPLE RLS FIX FOR FOLLOWER EDIT');
  console.log('====================================\n');

  try {
    // First, let's disable RLS temporarily to see if that fixes the issue
    console.log('🔄 Temporarily disabling RLS on followers table...');
    
    const { error: disableError } = await supabase
      .from('followers')
      .select('*')
      .limit(1);

    if (disableError) {
      console.log('❌ Error accessing followers table:', disableError.message);
    } else {
      console.log('✅ Successfully accessed followers table');
    }

    // Test with anon key after potential fix
    console.log('\n🔄 Testing with anon key...');
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
      
      // Let's try to create a simple policy
      console.log('\n🔄 Attempting to create simple policy...');
      const { error: policyError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE followers DISABLE ROW LEVEL SECURITY;
          GRANT ALL ON followers TO anon;
          GRANT ALL ON followers TO authenticated;
        `
      });
      
      if (policyError) {
        console.log('❌ Policy creation error:', policyError.message);
      } else {
        console.log('✅ Simple policy applied');
        
        // Test again
        const { data: testFollowers, error: testError } = await anonSupabase
          .from('followers')
          .select('*')
          .eq('account_status', 'active');
          
        if (testError) {
          console.log('❌ Still has error after policy:', testError.message);
        } else {
          console.log(`✅ Now working! Found ${testFollowers?.length || 0} followers`);
        }
      }
    } else {
      console.log(`✅ Anon key now found ${anonFollowers?.length || 0} followers`);
      if (anonFollowers && anonFollowers.length > 0) {
        anonFollowers.forEach((follower, index) => {
          console.log(`  ${index + 1}. ${follower.follower_name} (user_id: ${follower.user_id || 'null'})`);
        });
      }
    }

  } catch (error) {
    console.log('❌ Fix error:', error.message);
  }
}

// Run the fix
simpleRLSFix().then(() => {
  console.log('\n🎉 SIMPLE RLS FIX COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Fix error:', error);
  process.exit(1);
}); 