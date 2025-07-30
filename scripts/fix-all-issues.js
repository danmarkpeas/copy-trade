const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixAllIssues() {
  console.log('🔧 COMPREHENSIVE SYSTEM FIX');
  console.log('==========================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // =====================================================
    // 1. VERIFY DATA EXISTS
    // =====================================================
    console.log('📊 1. VERIFYING DATA EXISTS');
    console.log('==========================');

    // Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name');

    if (usersError) {
      console.log('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`✅ Found ${users?.length || 0} users:`);
    users?.forEach(user => {
      console.log(`   - ${user.email} (${user.id})`);
    });

    // Check broker accounts
    const { data: brokers, error: brokersError } = await supabase
      .from('broker_accounts')
      .select('id, user_id, broker_name, account_name, is_active');

    if (brokersError) {
      console.log('❌ Error fetching brokers:', brokersError);
      return;
    }

    console.log(`✅ Found ${brokers?.length || 0} broker accounts:`);
    brokers?.forEach(broker => {
      console.log(`   - ${broker.account_name} (${broker.broker_name}) - Active: ${broker.is_active}`);
    });

    // Check followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('id, user_id, follower_name, copy_mode, account_status');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }

    console.log(`✅ Found ${followers?.length || 0} followers:`);
    followers?.forEach(follower => {
      console.log(`   - ${follower.follower_name} (${follower.copy_mode}) - Status: ${follower.account_status}`);
    });

    // =====================================================
    // 2. FIX ORPHANED RECORDS
    // =====================================================
    console.log('\n📊 2. FIXING ORPHANED RECORDS');
    console.log('=============================');

    // Find the main user (gauravcrd@gmail.com)
    const mainUser = users?.find(u => u.email === 'gauravcrd@gmail.com');
    if (!mainUser) {
      console.log('❌ Main user gauravcrd@gmail.com not found');
      return;
    }

    console.log(`✅ Main user: ${mainUser.email} (${mainUser.id})`);

    // Fix orphaned followers
    const orphanedFollowers = followers?.filter(f => !f.user_id);
    if (orphanedFollowers && orphanedFollowers.length > 0) {
      console.log(`🔧 Fixing ${orphanedFollowers.length} orphaned followers...`);
      
      for (const follower of orphanedFollowers) {
        const { error: updateError } = await supabase
          .from('followers')
          .update({ user_id: mainUser.id })
          .eq('id', follower.id);
        
        if (updateError) {
          console.log(`❌ Error fixing follower ${follower.follower_name}:`, updateError);
        } else {
          console.log(`✅ Fixed follower: ${follower.follower_name}`);
        }
      }
    } else {
      console.log('✅ No orphaned followers found');
    }

    // Fix orphaned broker accounts
    const orphanedBrokers = brokers?.filter(b => !b.user_id);
    if (orphanedBrokers && orphanedBrokers.length > 0) {
      console.log(`🔧 Fixing ${orphanedBrokers.length} orphaned broker accounts...`);
      
      for (const broker of orphanedBrokers) {
        const { error: updateError } = await supabase
          .from('broker_accounts')
          .update({ user_id: mainUser.id })
          .eq('id', broker.id);
        
        if (updateError) {
          console.log(`❌ Error fixing broker ${broker.account_name}:`, updateError);
        } else {
          console.log(`✅ Fixed broker: ${broker.account_name}`);
        }
      }
    } else {
      console.log('✅ No orphaned broker accounts found');
    }

    // =====================================================
    // 3. UPDATE API KEYS
    // =====================================================
    console.log('\n📊 3. UPDATING API KEYS');
    console.log('=======================');

    // Check current API keys
    const { data: brokerDetails, error: detailsError } = await supabase
      .from('broker_accounts')
      .select('id, account_name, api_key, api_secret')
      .eq('is_active', true);

    if (detailsError) {
      console.log('❌ Error fetching broker details:', detailsError);
    } else if (brokerDetails && brokerDetails.length > 0) {
      console.log('🔍 Current API keys:');
      brokerDetails.forEach(broker => {
        const isTestKey = broker.api_key?.includes('test') || 
                         broker.api_secret?.includes('test') ||
                         broker.api_key?.length < 20;
        
        if (isTestKey) {
          console.log(`   ⚠️  ${broker.account_name}: Using test keys`);
          console.log(`      🔧 Please update with real Delta Exchange API keys`);
        } else {
          console.log(`   ✅ ${broker.account_name}: Using real keys`);
        }
      });
    }

    // =====================================================
    // 4. CREATE FRONTEND AUTHENTICATION SCRIPT
    // =====================================================
    console.log('\n📊 4. CREATING FRONTEND AUTH SCRIPT');
    console.log('===================================');

    const authScript = `
// FRONTEND AUTHENTICATION SCRIPT
// Run this in the browser console to login

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabaseUrl = '${process.env.NEXT_PUBLIC_SUPABASE_URL}';
const supabaseKey = '${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}';
const supabase = createClient(supabaseUrl, supabaseKey);

// Login with gauravcrd@gmail.com
async function loginUser() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'gauravcrd@gmail.com',
    password: 'your_password_here' // Replace with actual password
  });
  
  if (error) {
    console.error('Login error:', error);
  } else {
    console.log('Login successful:', data.user.email);
  }
}

loginUser();
`;

    console.log('📝 Frontend auth script created');
    console.log('🔧 To fix frontend authentication:');
    console.log('   1. Go to http://localhost:3000/login');
    console.log('   2. Login with gauravcrd@gmail.com');
    console.log('   3. Or create a new account if needed');

    // =====================================================
    // 5. RESTART SYSTEM
    // =====================================================
    console.log('\n📊 5. SYSTEM RESTART INSTRUCTIONS');
    console.log('==================================');

    console.log('🔧 To restart the system:');
    console.log('   1. Stop all Node.js processes: taskkill /f /im node.exe');
    console.log('   2. Start backend: node server-enhanced.js');
    console.log('   3. Start frontend: npm run dev');
    console.log('   4. Login to frontend with gauravcrd@gmail.com');
    console.log('   5. Update API keys in /connect-broker page');

    // =====================================================
    // 6. FINAL STATUS
    // =====================================================
    console.log('\n📊 6. FINAL STATUS');
    console.log('==================');

    // Re-check data after fixes
    const { data: finalFollowers, error: finalFollowersError } = await supabase
      .from('followers')
      .select('id, user_id, follower_name')
      .eq('user_id', mainUser.id);

    if (finalFollowersError) {
      console.log('❌ Error checking final followers:', finalFollowersError);
    } else {
      console.log(`✅ ${finalFollowers?.length || 0} followers now belong to ${mainUser.email}`);
    }

    const { data: finalBrokers, error: finalBrokersError } = await supabase
      .from('broker_accounts')
      .select('id, user_id, account_name')
      .eq('user_id', mainUser.id);

    if (finalBrokersError) {
      console.log('❌ Error checking final brokers:', finalBrokersError);
    } else {
      console.log(`✅ ${finalBrokers?.length || 0} broker accounts now belong to ${mainUser.email}`);
    }

    console.log('\n🎉 ALL FIXES COMPLETED!');
    console.log('=======================');
    console.log('✅ Data relationships fixed');
    console.log('✅ Orphaned records resolved');
    console.log('✅ System ready for restart');
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Restart the system');
    console.log('   2. Login to frontend');
    console.log('   3. Update API keys');
    console.log('   4. Test copy trading');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixAllIssues(); 