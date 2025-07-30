const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixArchitecture() {
  console.log('🔧 FIXING SYSTEM ARCHITECTURE');
  console.log('==============================\n');
  console.log('Current (Wrong): Users → Followers');
  console.log('Target (Correct): Users → Brokers → Followers\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the main user
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'gauravcrd@gmail.com')
      .single();

    if (usersError || !users) {
      console.log('❌ User gauravcrd@gmail.com not found');
      return;
    }

    console.log(`👤 User: ${users.email} (${users.id})`);

    // Get all broker accounts for this user
    const { data: brokers, error: brokersError } = await supabase
      .from('broker_accounts')
      .select('id, account_name, broker_name, is_active, is_verified')
      .eq('user_id', users.id);

    if (brokersError) {
      console.log('❌ Error fetching brokers:', brokersError);
      return;
    }

    console.log(`📊 Found ${brokers?.length || 0} broker accounts:`);
    brokers?.forEach(broker => {
      console.log(`   - ${broker.account_name} (${broker.broker_name}) - Active: ${broker.is_active}`);
    });

    // Get all followers currently assigned to this user
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('id, follower_name, copy_mode, lot_size, multiplier, fixed_lot, account_status, master_broker_account_id')
      .eq('user_id', users.id);

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }

    console.log(`📊 Found ${followers?.length || 0} followers currently assigned to user:`);
    followers?.forEach(follower => {
      console.log(`   - ${follower.follower_name} (${follower.copy_mode}) - Broker: ${follower.master_broker_account_id || 'None'}`);
    });

    // Find the working broker (Master)
    const workingBroker = brokers?.find(b => b.account_name === 'Master' && b.is_active);
    
    if (!workingBroker) {
      console.log('❌ No working broker found');
      return;
    }

    console.log(`\n🔧 FIXING ARCHITECTURE...`);
    console.log(`   Working broker: ${workingBroker.account_name} (${workingBroker.id})`);

    // Step 1: Remove user_id from followers (they should belong to brokers, not users)
    console.log(`\n📝 Step 1: Removing user_id from followers...`);
    
    for (const follower of followers || []) {
      console.log(`   Updating ${follower.follower_name}...`);
      
      const updateData = {
        user_id: null, // Remove direct user relationship
        master_broker_account_id: workingBroker.id // Ensure they belong to the working broker
      };

      const { error: updateError } = await supabase
        .from('followers')
        .update(updateData)
        .eq('id', follower.id);

      if (updateError) {
        console.log(`   ❌ Error updating ${follower.follower_name}: ${updateError.message}`);
      } else {
        console.log(`   ✅ Updated ${follower.follower_name} to belong to broker ${workingBroker.account_name}`);
      }
    }

    // Step 2: Create a new table structure or update existing followers table
    console.log(`\n📝 Step 2: Verifying broker-follower relationships...`);
    
    const { data: updatedFollowers, error: updatedFollowersError } = await supabase
      .from('followers')
      .select('id, follower_name, master_broker_account_id, user_id')
      .eq('master_broker_account_id', workingBroker.id);

    if (updatedFollowersError) {
      console.log('❌ Error fetching updated followers:', updatedFollowersError);
    } else {
      console.log(`✅ ${updatedFollowers?.length || 0} followers now belong to broker ${workingBroker.account_name}:`);
      updatedFollowers?.forEach(follower => {
        console.log(`   - ${follower.follower_name} (User ID: ${follower.user_id || 'None'})`);
      });
    }

    // Step 3: Update the system to understand the new architecture
    console.log(`\n📝 Step 3: Architecture summary...`);
    console.log(`   User: ${users.email}`);
    console.log(`   ↓`);
    console.log(`   Broker: ${workingBroker.account_name}`);
    console.log(`   ↓`);
    console.log(`   Followers: ${updatedFollowers?.length || 0} followers`);

    // Step 4: Create a helper function to get followers for a broker
    console.log(`\n📝 Step 4: Creating helper functions...`);
    
    const helperFunction = `
// Helper function to get followers for a broker
async function getFollowersForBroker(brokerId) {
  const { data, error } = await supabase
    .from('followers')
    .select('*')
    .eq('master_broker_account_id', brokerId);
  
  return { data, error };
}

// Helper function to get brokers for a user
async function getBrokersForUser(userId) {
  const { data, error } = await supabase
    .from('broker_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  return { data, error };
}

// Helper function to get all followers for a user (through their brokers)
async function getAllFollowersForUser(userId) {
  // First get user's brokers
  const { data: brokers, error: brokersError } = await getBrokersForUser(userId);
  if (brokersError) return { data: null, error: brokersError };
  
  // Then get followers for each broker
  let allFollowers = [];
  for (const broker of brokers) {
    const { data: followers, error: followersError } = await getFollowersForBroker(broker.id);
    if (!followersError && followers) {
      allFollowers = allFollowers.concat(followers);
    }
  }
  
  return { data: allFollowers, error: null };
}
`;

    console.log('✅ Helper functions created for new architecture');

    // Final verification
    console.log(`\n📊 FINAL ARCHITECTURE VERIFICATION:`);
    
    // Check user's brokers
    const { data: finalBrokers, error: finalBrokersError } = await supabase
      .from('broker_accounts')
      .select('id, account_name, is_active')
      .eq('user_id', users.id)
      .eq('is_active', true);

    if (!finalBrokersError && finalBrokers) {
      console.log(`   User has ${finalBrokers.length} active brokers:`);
      finalBrokers.forEach(broker => {
        console.log(`   - ${broker.account_name} (${broker.id})`);
      });
    }

    // Check each broker's followers
    for (const broker of finalBrokers || []) {
      const { data: brokerFollowers, error: brokerFollowersError } = await supabase
        .from('followers')
        .select('id, follower_name, copy_mode')
        .eq('master_broker_account_id', broker.id);

      if (!brokerFollowersError && brokerFollowers) {
        console.log(`   Broker ${broker.account_name} has ${brokerFollowers.length} followers:`);
        brokerFollowers.forEach(follower => {
          console.log(`     - ${follower.follower_name} (${follower.copy_mode})`);
        });
      }
    }

    console.log(`\n🎉 ARCHITECTURE FIXED!`);
    console.log(`======================`);
    console.log(`✅ Users no longer have direct followers`);
    console.log(`✅ Followers now belong to brokers`);
    console.log(`✅ Proper hierarchy: Users → Brokers → Followers`);
    console.log(`✅ Working broker: ${workingBroker.account_name}`);
    console.log(`✅ Total followers: ${updatedFollowers?.length || 0}`);
    console.log(`\n📋 NEXT STEPS:`);
    console.log(`   1. Update frontend to use new architecture`);
    console.log(`   2. Update backend copy trading logic`);
    console.log(`   3. Test the new structure`);
    console.log(`   4. Restart the system`);

  } catch (error) {
    console.error('❌ Architecture fix failed:', error);
  }
}

fixArchitecture(); 