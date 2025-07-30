const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixBrokerStatus() {
  console.log('🔧 FIXING BROKER ACCOUNT STATUS\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the Master broker account
    console.log('📋 UPDATING MASTER BROKER ACCOUNT...');
    
    const { data: brokerAccount, error: fetchError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('account_name', 'Master')
      .eq('is_active', true)
      .single();

    if (fetchError) {
      console.log('❌ Error fetching broker account:', fetchError);
      return;
    }

    console.log('✅ Found broker account:');
    console.log('   ID:', brokerAccount.id);
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Current Status:', brokerAccount.account_status);
    console.log('   Is Active:', brokerAccount.is_active);

    // Update the broker account status to active
    const { data: updatedBroker, error: updateError } = await supabase
      .from('broker_accounts')
      .update({ 
        account_status: 'active',
        is_verified: true
      })
      .eq('id', brokerAccount.id)
      .select()
      .single();

    if (updateError) {
      console.log('❌ Error updating broker account:', updateError);
      return;
    }

    console.log('✅ Broker account updated successfully:');
    console.log('   New Status:', updatedBroker.account_status);
    console.log('   Is Verified:', updatedBroker.is_verified);

    // Verify the follower is still active
    console.log('\n📋 VERIFYING FOLLOWER STATUS...');
    
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('master_broker_account_id', brokerAccount.id)
      .eq('account_status', 'active');

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }

    console.log(`✅ Active followers found: ${followers?.length || 0}`);
    
    if (followers && followers.length > 0) {
      followers.forEach((follower, index) => {
        console.log(`   ${index + 1}. ${follower.follower_name} (${follower.copy_mode})`);
      });
    }

    console.log('\n🎯 STATUS FIXED!');
    console.log('✅ Broker account is now active');
    console.log('✅ Follower is active and linked');
    console.log('✅ Monitoring should now detect the follower');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

fixBrokerStatus().catch(console.error); 