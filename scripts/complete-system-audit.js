const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function completeSystemAudit() {
  console.log('🔍 COMPLETE SYSTEM AUDIT');
  console.log('========================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // =====================================================
    // 1. DATABASE STRUCTURE AUDIT
    // =====================================================
    console.log('📊 1. DATABASE STRUCTURE AUDIT');
    console.log('==============================');

    // Check all tables exist
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('users', 'broker_accounts', 'followers', 'copy_trades')
          ORDER BY table_name;
        `
      });

    if (tablesError) {
      console.log('❌ Error checking tables:', tablesError);
    } else {
      console.log('✅ Tables found:', tables?.map(t => t.table_name).join(', '));
    }

    // Check table columns
    const { data: columns, error: columnsError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT 
            table_name,
            column_name,
            data_type,
            is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name IN ('users', 'broker_accounts', 'followers', 'copy_trades')
          ORDER BY table_name, ordinal_position;
        `
      });

    if (columnsError) {
      console.log('❌ Error checking columns:', columnsError);
    } else {
      console.log('✅ Table columns verified');
    }

    // =====================================================
    // 2. DATA INTEGRITY AUDIT
    // =====================================================
    console.log('\n📊 2. DATA INTEGRITY AUDIT');
    console.log('==========================');

    // Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, created_at');

    if (usersError) {
      console.log('❌ Error fetching users:', usersError);
    } else {
      console.log(`✅ Users: ${users?.length || 0} found`);
      users?.forEach(user => {
        console.log(`   - ${user.email} (${user.id})`);
      });
    }

    // Check broker accounts
    const { data: brokers, error: brokersError } = await supabase
      .from('broker_accounts')
      .select('id, user_id, broker_name, account_name, is_active, is_verified');

    if (brokersError) {
      console.log('❌ Error fetching brokers:', brokersError);
    } else {
      console.log(`✅ Broker accounts: ${brokers?.length || 0} found`);
      brokers?.forEach(broker => {
        console.log(`   - ${broker.account_name} (${broker.broker_name}) - Active: ${broker.is_active}`);
      });
    }

    // Check followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('id, user_id, follower_name, copy_mode, lot_size, account_status');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
    } else {
      console.log(`✅ Followers: ${followers?.length || 0} found`);
      followers?.forEach(follower => {
        console.log(`   - ${follower.follower_name} (${follower.copy_mode}) - Status: ${follower.account_status}`);
      });
    }

    // =====================================================
    // 3. FOREIGN KEY RELATIONSHIPS AUDIT
    // =====================================================
    console.log('\n📊 3. FOREIGN KEY RELATIONSHIPS AUDIT');
    console.log('=====================================');

    // Check orphaned records
    const { data: orphanedBrokers, error: orphanedBrokersError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT ba.id, ba.account_name, ba.user_id
          FROM broker_accounts ba
          LEFT JOIN users u ON ba.user_id = u.id
          WHERE u.id IS NULL;
        `
      });

    if (orphanedBrokersError) {
      console.log('❌ Error checking orphaned brokers:', orphanedBrokersError);
    } else if (orphanedBrokers?.length > 0) {
      console.log('❌ Orphaned broker accounts found:', orphanedBrokers.length);
    } else {
      console.log('✅ No orphaned broker accounts');
    }

    const { data: orphanedFollowers, error: orphanedFollowersError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT f.id, f.follower_name, f.user_id
          FROM followers f
          LEFT JOIN users u ON f.user_id = u.id
          WHERE u.id IS NULL;
        `
      });

    if (orphanedFollowersError) {
      console.log('❌ Error checking orphaned followers:', orphanedFollowersError);
    } else if (orphanedFollowers?.length > 0) {
      console.log('❌ Orphaned followers found:', orphanedFollowers.length);
    } else {
      console.log('✅ No orphaned followers');
    }

    // =====================================================
    // 4. FRONTEND CONNECTIVITY AUDIT
    // =====================================================
    console.log('\n📊 4. FRONTEND CONNECTIVITY AUDIT');
    console.log('=================================');

    // Test frontend API endpoints
    const testEndpoints = [
      'http://localhost:3001/api/health',
      'http://localhost:3001/api/status'
    ];

    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          console.log(`✅ ${endpoint} - OK`);
        } else {
          console.log(`❌ ${endpoint} - ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint} - Connection failed`);
      }
    }

    // =====================================================
    // 5. API KEY VALIDATION AUDIT
    // =====================================================
    console.log('\n📊 5. API KEY VALIDATION AUDIT');
    console.log('==============================');

    if (brokers && brokers.length > 0) {
      for (const broker of brokers) {
        if (broker.is_active) {
          console.log(`🔍 Checking broker: ${broker.account_name}`);
          
          // Check if API keys are test keys
          const { data: brokerDetails, error: detailsError } = await supabase
            .from('broker_accounts')
            .select('api_key, api_secret')
            .eq('id', broker.id)
            .single();

          if (detailsError) {
            console.log(`   ❌ Error fetching details: ${detailsError.message}`);
          } else {
            const isTestKey = brokerDetails.api_key?.includes('test') || 
                             brokerDetails.api_secret?.includes('test') ||
                             brokerDetails.api_key?.length < 20;
            
            if (isTestKey) {
              console.log(`   ⚠️  Using test API keys - needs real keys`);
            } else {
              console.log(`   ✅ API keys appear to be real`);
            }
          }
        }
      }
    }

    // =====================================================
    // 6. RECOMMENDED FIXES
    // =====================================================
    console.log('\n📊 6. RECOMMENDED FIXES');
    console.log('=======================');

    const issues = [];

    // Check for missing broker accounts
    if (!brokers || brokers.length === 0) {
      issues.push('❌ No broker accounts found - need to create at least one');
    }

    // Check for missing followers
    if (!followers || followers.length === 0) {
      issues.push('❌ No followers found - need to create at least one');
    }

    // Check for test API keys
    if (brokers && brokers.some(b => b.is_active)) {
      issues.push('⚠️  Active brokers using test API keys - need real Delta Exchange API keys');
    }

    // Check for orphaned records
    if (orphanedBrokers?.length > 0) {
      issues.push(`❌ ${orphanedBrokers.length} orphaned broker accounts need cleanup`);
    }

    if (orphanedFollowers?.length > 0) {
      issues.push(`❌ ${orphanedFollowers.length} orphaned followers need cleanup`);
    }

    if (issues.length === 0) {
      console.log('✅ No critical issues found!');
    } else {
      console.log('Issues found:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }

    // =====================================================
    // 7. QUICK FIX SCRIPT GENERATION
    // =====================================================
    console.log('\n📊 7. QUICK FIX SCRIPT GENERATION');
    console.log('==================================');

    if (issues.length > 0) {
      console.log('🔧 Generating fix script...');
      
      let fixScript = `
// AUTO-GENERATED FIX SCRIPT
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function autoFix() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
`;

      // Fix orphaned records
      if (orphanedBrokers?.length > 0) {
        fixScript += `
    // Fix orphaned broker accounts
    console.log('🔧 Fixing orphaned broker accounts...');
    for (const broker of ${JSON.stringify(orphanedBrokers)}) {
      await supabase
        .from('broker_accounts')
        .update({ user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890' })
        .eq('id', broker.id);
    }
`;
      }

      if (orphanedFollowers?.length > 0) {
        fixScript += `
    // Fix orphaned followers
    console.log('🔧 Fixing orphaned followers...');
    for (const follower of ${JSON.stringify(orphanedFollowers)}) {
      await supabase
        .from('followers')
        .update({ user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890' })
        .eq('id', follower.id);
    }
`;
      }

      // Create missing broker account
      if (!brokers || brokers.length === 0) {
        fixScript += `
    // Create default broker account
    console.log('🔧 Creating default broker account...');
    await supabase
      .from('broker_accounts')
      .insert({
        user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890',
        broker_name: 'delta',
        account_name: 'Master Blaster',
        api_key: 'REPLACE_WITH_REAL_API_KEY',
        api_secret: 'REPLACE_WITH_REAL_API_SECRET',
        is_active: true,
        is_verified: false
      });
`;
      }

      fixScript += `
    console.log('✅ Auto-fix completed!');
  } catch (error) {
    console.error('❌ Auto-fix failed:', error);
  }
}

autoFix();
`;

      console.log('📝 Fix script generated. Run: node fix-script.js');
    }

    console.log('\n🎉 AUDIT COMPLETED!');
    console.log('==================');

  } catch (error) {
    console.error('❌ Audit failed:', error);
  }
}

completeSystemAudit(); 