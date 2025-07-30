const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkTableStructure() {
  console.log('🔍 CHECKING TABLE STRUCTURE\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Check broker_accounts table structure
    console.log('🏦 BROKER_ACCOUNTS TABLE STRUCTURE:');
    const { data: brokerSample, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .limit(1);

    if (brokerError) {
      console.log(`❌ Error accessing broker_accounts: ${brokerError.message}`);
    } else if (brokerSample && brokerSample.length > 0) {
      console.log('✅ broker_accounts table accessible');
      console.log('📊 Sample record columns:', Object.keys(brokerSample[0]));
      console.log('📋 Sample record:', brokerSample[0]);
    } else {
      console.log('⚠️ broker_accounts table exists but is empty');
    }

    // 2. Check followers table structure
    console.log('\n👥 FOLLOWERS TABLE STRUCTURE:');
    const { data: followerSample, error: followerError } = await supabase
      .from('followers')
      .select('*')
      .limit(1);

    if (followerError) {
      console.log(`❌ Error accessing followers: ${followerError.message}`);
    } else if (followerSample && followerSample.length > 0) {
      console.log('✅ followers table accessible');
      console.log('📊 Sample record columns:', Object.keys(followerSample[0]));
      console.log('📋 Sample record:', followerSample[0]);
    } else {
      console.log('⚠️ followers table exists but is empty');
    }

    // 3. Get all broker accounts
    console.log('\n🏦 ALL BROKER ACCOUNTS:');
    const { data: allBrokers, error: allBrokersError } = await supabase
      .from('broker_accounts')
      .select('*');

    if (allBrokersError) {
      console.log(`❌ Error fetching all brokers: ${allBrokersError.message}`);
    } else if (allBrokers) {
      console.log(`✅ Found ${allBrokers.length} broker accounts:`);
      allBrokers.forEach((broker, index) => {
        console.log(`   ${index + 1}. ID: ${broker.id}`);
        console.log(`      User ID: ${broker.user_id}`);
        console.log(`      Platform: ${broker.platform}`);
        console.log(`      Is Active: ${broker.is_active}`);
        console.log(`      Created: ${new Date(broker.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // 4. Get all followers
    console.log('\n👥 ALL FOLLOWERS:');
    const { data: allFollowers, error: allFollowersError } = await supabase
      .from('followers')
      .select('*');

    if (allFollowersError) {
      console.log(`❌ Error fetching all followers: ${allFollowersError.message}`);
    } else if (allFollowers) {
      console.log(`✅ Found ${allFollowers.length} followers:`);
      allFollowers.forEach((follower, index) => {
        console.log(`   ${index + 1}. ID: ${follower.id}`);
        console.log(`      User ID: ${follower.user_id}`);
        console.log(`      Account Status: ${follower.account_status}`);
        console.log(`      Platform: ${follower.platform}`);
        console.log(`      Created: ${new Date(follower.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // 5. Check if there are any name-like fields
    console.log('\n🔍 SEARCHING FOR NAME FIELDS:');
    
    if (brokerSample && brokerSample.length > 0) {
      const brokerFields = Object.keys(brokerSample[0]);
      const nameFields = brokerFields.filter(field => 
        field.toLowerCase().includes('name') || 
        field.toLowerCase().includes('title') ||
        field.toLowerCase().includes('label')
      );
      console.log(`🏦 Broker name-like fields: ${nameFields.length > 0 ? nameFields.join(', ') : 'None found'}`);
    }

    if (followerSample && followerSample.length > 0) {
      const followerFields = Object.keys(followerSample[0]);
      const nameFields = followerFields.filter(field => 
        field.toLowerCase().includes('name') || 
        field.toLowerCase().includes('title') ||
        field.toLowerCase().includes('label')
      );
      console.log(`👥 Follower name-like fields: ${nameFields.length > 0 ? nameFields.join(', ') : 'None found'}`);
    }

    // 6. Alternative display options
    console.log('\n💡 ALTERNATIVE DISPLAY OPTIONS:');
    console.log('Since there are no name columns, we can display:');
    console.log('   - Platform names (e.g., "Delta Exchange")');
    console.log('   - User IDs (shortened)');
    console.log('   - Custom labels based on ID patterns');
    console.log('   - "Master Broker" and "Follower" as generic labels');

    console.log('\n🎯 RECOMMENDED SOLUTION:');
    console.log('Update the frontend to show:');
    console.log('   - "Master Broker" (or platform name if available)');
    console.log('   - "Follower" (or user ID shortened)');
    console.log('   - Or use the platform field if it exists');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTableStructure().catch(console.error); 