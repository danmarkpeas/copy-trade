const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixBrokerSetup() {
  console.log('🔧 Fixing Broker Setup...\n');
  
  try {
    // Check all broker accounts (active and inactive)
    const { data: allBrokers, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*');

    if (brokerError) {
      console.error('❌ Error fetching broker accounts:', brokerError);
      return;
    }

    console.log(`📊 Found ${allBrokers.length} total broker account(s):\n`);

    allBrokers.forEach((broker, index) => {
      console.log(`${index + 1}. ${broker.account_name} (ID: ${broker.id})`);
      console.log(`   Active: ${broker.is_active ? 'Yes' : 'No'}`);
      console.log(`   Verified: ${broker.is_verified ? 'Yes' : 'No'}`);
      console.log(`   API Key: ${broker.api_key ? broker.api_key.substring(0, 10) + '...' : 'NOT SET'}`);
      console.log('');
    });

    // Find Anneshan broker account
    const anneshanBroker = allBrokers.find(b => b.account_name === 'Anneshan');
    const masterBroker = allBrokers.find(b => b.account_name === 'Master');

    if (anneshanBroker) {
      console.log('✅ Found Anneshan broker account');
      console.log(`   ID: ${anneshanBroker.id}`);
      console.log(`   Currently Active: ${anneshanBroker.is_active ? 'Yes' : 'No'}`);
      
      // Activate Anneshan as the broker
      const { error: activateError } = await supabase
        .from('broker_accounts')
        .update({ 
          is_active: true, 
          is_verified: true 
        })
        .eq('id', anneshanBroker.id);

      if (activateError) {
        console.error('❌ Error activating Anneshan:', activateError);
      } else {
        console.log('✅ Activated Anneshan as broker');
      }
    } else {
      console.log('❌ Anneshan broker account not found');
      console.log('💡 Creating Anneshan broker account from follower data...');
      
      // Get Anneshan follower data
      const { data: anneshanFollower, error: followerError } = await supabase
        .from('followers')
        .select('*')
        .eq('follower_name', 'Anneshan')
        .single();

      if (followerError || !anneshanFollower) {
        console.error('❌ Anneshan follower not found');
        return;
      }

      // Create broker account for Anneshan
      const { data: newBroker, error: createError } = await supabase
        .from('broker_accounts')
        .insert({
          account_name: 'Anneshan',
          api_key: anneshanFollower.api_key,
          api_secret: anneshanFollower.api_secret,
          user_id: anneshanFollower.user_id,
          is_active: true,
          is_verified: true,
          broker_name: 'delta'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating Anneshan broker:', createError);
        return;
      }

      console.log('✅ Created Anneshan broker account');
      console.log(`   ID: ${newBroker.id}`);
    }

    // Deactivate Master broker if it exists
    if (masterBroker) {
      const { error: deactivateError } = await supabase
        .from('broker_accounts')
        .update({ is_active: false })
        .eq('id', masterBroker.id);

      if (deactivateError) {
        console.error('❌ Error deactivating Master:', deactivateError);
      } else {
        console.log('✅ Deactivated Master broker');
      }
    }

    // Get Anneshan broker ID for updating followers
    const { data: activeAnneshan } = await supabase
      .from('broker_accounts')
      .select('id')
      .eq('account_name', 'Anneshan')
      .eq('is_active', true)
      .single();

    if (activeAnneshan) {
      // Update followers to follow Anneshan
      const { error: updateFollowersError } = await supabase
        .from('followers')
        .update({ 
          master_broker_account_id: activeAnneshan.id 
        })
        .neq('follower_name', 'Anneshan'); // Don't update Anneshan herself

      if (updateFollowersError) {
        console.error('❌ Error updating followers:', updateFollowersError);
      } else {
        console.log('✅ Updated followers to follow Anneshan');
      }

      // Remove Anneshan from followers list
      const { error: removeFollowerError } = await supabase
        .from('followers')
        .update({ account_status: 'inactive' })
        .eq('follower_name', 'Anneshan');

      if (removeFollowerError) {
        console.error('❌ Error removing Anneshan from followers:', removeFollowerError);
      } else {
        console.log('✅ Removed Anneshan from followers list');
      }
    }

    console.log('\n🎉 Broker setup fixed!');
    console.log('📋 Next steps:');
    console.log('1. Restart the server: npm run server');
    console.log('2. The system will now monitor Anneshan\'s trades');
    console.log('3. Other followers will copy Anneshan\'s trades');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixBrokerSetup().catch(console.error); 