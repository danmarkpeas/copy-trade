const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFollowersStatus() {
  console.log('🔍 CHECKING FOLLOWERS STATUS');
  console.log('=' .repeat(60));

  try {
    // 1. Check all followers in database
    console.log('1. Checking all followers in database...');
    
    const { data: allFollowers, error: allFollowersError } = await supabase
      .from('followers')
      .select('*');

    if (allFollowersError) {
      console.log('❌ Error fetching all followers:', allFollowersError);
      return;
    }

    console.log(`✅ Found ${allFollowers.length} total followers in database:`);
    
    allFollowers.forEach((follower, index) => {
      console.log(`   ${index + 1}. ${follower.follower_name}`);
      console.log(`      ID: ${follower.id}`);
      console.log(`      Status: ${follower.account_status}`);
      console.log(`      User ID: ${follower.user_id}`);
      console.log(`      Broker ID: ${follower.master_broker_account_id}`);
      console.log(`      Created: ${follower.created_at}`);
      console.log('');
    });

    // 2. Check active followers only
    console.log('2. Checking active followers only...');
    
    const { data: activeFollowers, error: activeFollowersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (activeFollowersError) {
      console.log('❌ Error fetching active followers:', activeFollowersError);
      return;
    }

    console.log(`✅ Found ${activeFollowers.length} active followers:`);
    
    activeFollowers.forEach((follower, index) => {
      console.log(`   ${index + 1}. ${follower.follower_name} (${follower.id})`);
    });

    // 3. Check if Anne exists
    console.log('\n3. Checking if Anne exists...');
    
    const { data: anneFollowers, error: anneError } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_name', 'Anne');

    if (anneError) {
      console.log('❌ Error checking for Anne:', anneError);
      return;
    }

    if (anneFollowers.length === 0) {
      console.log('✅ Anne has been successfully deleted from database');
    } else {
      console.log(`❌ Anne still exists in database (${anneFollowers.length} records):`);
      anneFollowers.forEach(follower => {
        console.log(`   - ID: ${follower.id}, Status: ${follower.account_status}`);
      });
    }

    // 4. Check backend status
    console.log('\n4. Checking backend status...');
    
    try {
      const axios = require('axios');
      const response = await axios.get('http://localhost:3001/api/status', { timeout: 5000 });
      const status = response.data.data;
      
      console.log(`✅ Backend reports:`);
      console.log(`   - Master Traders: ${status.masterTraders}`);
      console.log(`   - Followers: ${status.followers}`);
      console.log(`   - Copy Relationships: ${status.copyRelationships}`);
      
      if (status.followers !== activeFollowers.length) {
        console.log(`⚠️  MISMATCH: Backend shows ${status.followers} followers, but database has ${activeFollowers.length} active followers`);
      } else {
        console.log(`✅ Backend and database are in sync`);
      }
    } catch (error) {
      console.log('❌ Error checking backend status:', error.message);
    }

    // 5. Summary
    console.log('\n5. SUMMARY');
    console.log('=' .repeat(60));
    console.log(`📊 Database Status:`);
    console.log(`   - Total followers: ${allFollowers.length}`);
    console.log(`   - Active followers: ${activeFollowers.length}`);
    console.log(`   - Anne exists: ${anneFollowers.length > 0 ? 'YES' : 'NO'}`);
    
    if (anneFollowers.length === 0 && activeFollowers.length === 2) {
      console.log('✅ SUCCESS: Anne has been properly deleted and system is in sync');
    } else {
      console.log('❌ ISSUE: System is not properly synced');
    }

  } catch (error) {
    console.error('❌ Error in check script:', error);
  }
}

// Run the check script
checkFollowersStatus().catch(console.error); 