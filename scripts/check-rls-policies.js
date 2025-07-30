const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLSPolicies() {
  console.log('🔍 CHECKING RLS POLICIES');
  console.log('========================\n');

  try {
    // Check if RLS is enabled on followers table
    console.log('📋 Checking RLS on followers table...');
    const { data: rlsInfo, error: rlsError } = await supabase
      .from('information_schema.tables')
      .select('table_name, row_security')
      .eq('table_schema', 'public')
      .eq('table_name', 'followers');

    if (rlsError) {
      console.log('❌ Error checking RLS:', rlsError.message);
    } else {
      console.log('✅ RLS Info:', rlsInfo);
    }

    // Check RLS policies on followers table
    console.log('\n📋 Checking RLS policies on followers table...');
    const { data: policies, error: policiesError } = await supabase
      .from('information_schema.policies')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'followers');

    if (policiesError) {
      console.log('❌ Error checking policies:', policiesError.message);
    } else {
      console.log(`✅ Found ${policies?.length || 0} policies:`);
      if (policies && policies.length > 0) {
        policies.forEach((policy, index) => {
          console.log(`  ${index + 1}. ${policy.policy_name}`);
          console.log(`     Action: ${policy.action}`);
          console.log(`     Roles: ${policy.roles}`);
          console.log(`     Command: ${policy.command}`);
          console.log(`     Definition: ${policy.definition}`);
          console.log('');
        });
      }
    }

    // Test with service role (should work)
    console.log('\n🔄 Testing with service role...');
    const { data: serviceFollowers, error: serviceError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (serviceError) {
      console.log('❌ Service role error:', serviceError.message);
    } else {
      console.log(`✅ Service role found ${serviceFollowers?.length || 0} followers`);
    }

    // Test with anon key (should not work)
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
      console.log('❌ Anon key error:', anonError.message);
    } else {
      console.log(`✅ Anon key found ${anonFollowers?.length || 0} followers`);
    }

    // Check if we need to create policies
    console.log('\n📋 Checking if we need to create policies...');
    if (!policies || policies.length === 0) {
      console.log('⚠️ No RLS policies found - this might be the issue');
      console.log('   Need to create policies for authenticated users');
    }

  } catch (error) {
    console.log('❌ Check error:', error.message);
  }
}

// Run the check
checkRLSPolicies().then(() => {
  console.log('\n🎉 RLS CHECK COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Check error:', error);
  process.exit(1);
}); 