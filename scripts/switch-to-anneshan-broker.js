const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function switchToAnneshanBroker() {
  console.log('🔄 Switching Anneshan to Broker Role...\n');
  
  try {
    // First, let's check if Anneshan exists as a follower
    const { data: anneshanFollower, error: followerError } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_name', 'Anneshan')
      .eq('account_status', 'active')
      .single();

    if (followerError || !anneshanFollower) {
      console.log('❌ Anneshan not found as active follower');
      return;
    }

    console.log('📋 Found Anneshan as follower:');
    console.log(`   Name: ${anneshanFollower.follower_name}`);
    console.log(`   API Key: ${anneshanFollower.api_key ? anneshanFollower.api_key.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log(`   User ID: ${anneshanFollower.user_id}`);
    console.log('');

    // Check if Anneshan already exists as a broker
    const { data: existingBroker, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('account_name', 'Anneshan')
      .single();

    if (existingBroker) {
      console.log('✅ Anneshan already exists as broker account');
      console.log(`   ID: ${existingBroker.id}`);
      console.log(`   Status: ${existingBroker.is_active ? 'Active' : 'Inactive'}`);
      console.log(`   Verified: ${existingBroker.is_verified ? 'Yes' : 'No'}`);
      
      // Update to make Anneshan the active broker
      const { error: updateError } = await supabase
        .from('broker_accounts')
        .update({ 
          is_active: true, 
          is_verified: true,
          api_key: anneshanFollower.api_key,
          api_secret: anneshanFollower.api_secret,
          user_id: anneshanFollower.user_id
        })
        .eq('id', existingBroker.id);

      if (updateError) {
        console.error('❌ Error updating broker:', updateError);
        return;
      }

      console.log('✅ Updated Anneshan broker account');
    } else {
      console.log('📝 Creating new broker account for Anneshan...');
      
      // Create new broker account for Anneshan
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
        console.error('❌ Error creating broker account:', createError);
        return;
      }

      console.log('✅ Created new broker account for Anneshan');
      console.log(`   ID: ${newBroker.id}`);
    }

    // Deactivate the current "Master" broker
    const { error: deactivateError } = await supabase
      .from('broker_accounts')
      .update({ is_active: false })
      .eq('account_name', 'Master');

    if (deactivateError) {
      console.error('❌ Error deactivating Master broker:', deactivateError);
    } else {
      console.log('✅ Deactivated Master broker');
    }

    // Get the Anneshan broker ID
    const { data: anneshanBroker } = await supabase
      .from('broker_accounts')
      .select('id')
      .eq('account_name', 'Anneshan')
      .single();

    if (anneshanBroker) {
      // Update followers to follow Anneshan instead of Master
      const { error: updateFollowersError } = await supabase
        .from('followers')
        .update({ 
          master_broker_account_id: anneshanBroker.id
        })
        .eq('master_broker_account_id', 'f9593e9d-b50d-447c-80e3-a79464be7dff'); // Master's ID

      if (updateFollowersError) {
        console.error('❌ Error updating followers:', updateFollowersError);
      } else {
        console.log('✅ Updated followers to follow Anneshan');
      }
    }



    // Remove Anneshan from followers list since she's now the broker
    const { error: removeFollowerError } = await supabase
      .from('followers')
      .update({ account_status: 'inactive' })
      .eq('follower_name', 'Anneshan');

    if (removeFollowerError) {
      console.error('❌ Error removing Anneshan from followers:', removeFollowerError);
    } else {
      console.log('✅ Removed Anneshan from followers list');
    }

    console.log('\n🎉 Successfully switched Anneshan to broker role!');
    console.log('📋 Next steps:');
    console.log('1. Restart the server: npm run server');
    console.log('2. The system will now monitor Anneshan\'s trades');
    console.log('3. Other followers will copy Anneshan\'s trades');
    console.log('4. Test by opening a position on Anneshan\'s account');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

switchToAnneshanBroker().catch(console.error); 