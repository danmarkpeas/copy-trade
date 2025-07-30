const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixWorkingBroker() {
  console.log('🔧 FIXING WORKING BROKER CONFIGURATION');
  console.log('======================================\n');

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

    // Find the working "Master" account
    const workingBroker = brokers?.find(b => b.account_name === 'Master');
    const brokenBroker = brokers?.find(b => b.account_name === 'Master Blaster');

    if (!workingBroker) {
      console.log('❌ Working "Master" broker not found');
      return;
    }

    console.log(`\n🔧 Fixing broker configuration...`);

    // Disable the broken "Master Blaster" account
    if (brokenBroker) {
      console.log(`   Disabling broken broker: ${brokenBroker.account_name}`);
      const { error: disableError } = await supabase
        .from('broker_accounts')
        .update({ is_active: false })
        .eq('id', brokenBroker.id);

      if (disableError) {
        console.log(`   ❌ Error disabling broker: ${disableError.message}`);
      } else {
        console.log(`   ✅ Disabled broker: ${brokenBroker.account_name}`);
      }
    }

    // Ensure the working "Master" account is active
    if (!workingBroker.is_active) {
      console.log(`   Activating working broker: ${workingBroker.account_name}`);
      const { error: activateError } = await supabase
        .from('broker_accounts')
        .update({ is_active: true })
        .eq('id', workingBroker.id);

      if (activateError) {
        console.log(`   ❌ Error activating broker: ${activateError.message}`);
      } else {
        console.log(`   ✅ Activated broker: ${workingBroker.account_name}`);
      }
    } else {
      console.log(`   ✅ Working broker already active: ${workingBroker.account_name}`);
    }

    // Update followers to use the working broker
    console.log(`\n🔧 Updating followers to use working broker...`);
    
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('id, follower_name, master_broker_account_id')
      .eq('user_id', users.id);

    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }

    for (const follower of followers || []) {
      if (follower.master_broker_account_id !== workingBroker.id) {
        console.log(`   Updating ${follower.follower_name} to use ${workingBroker.account_name}`);
        const { error: updateError } = await supabase
          .from('followers')
          .update({ master_broker_account_id: workingBroker.id })
          .eq('id', follower.id);

        if (updateError) {
          console.log(`   ❌ Error updating follower: ${updateError.message}`);
        } else {
          console.log(`   ✅ Updated follower: ${follower.follower_name}`);
        }
      } else {
        console.log(`   ✅ Follower already using working broker: ${follower.follower_name}`);
      }
    }

    // Final status check
    console.log(`\n📊 FINAL STATUS:`);
    
    const { data: finalBrokers, error: finalBrokersError } = await supabase
      .from('broker_accounts')
      .select('id, account_name, is_active')
      .eq('user_id', users.id);

    if (!finalBrokersError && finalBrokers) {
      console.log(`   Active brokers: ${finalBrokers.filter(b => b.is_active).length}`);
      finalBrokers.forEach(broker => {
        console.log(`   - ${broker.account_name}: ${broker.is_active ? 'Active' : 'Inactive'}`);
      });
    }

    console.log(`\n🎉 BROKER CONFIGURATION FIXED!`);
    console.log(`================================`);
    console.log(`✅ Working "Master" broker is now active`);
    console.log(`✅ Broken "Master Blaster" broker is disabled`);
    console.log(`✅ All followers updated to use working broker`);
    console.log(`\n📋 NEXT STEPS:`);
    console.log(`   1. Restart the copy trading system`);
    console.log(`   2. Test with a small trade`);
    console.log(`   3. Monitor copy trading execution`);

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixWorkingBroker(); 