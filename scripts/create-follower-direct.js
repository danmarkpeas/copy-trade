const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createFollowerDirect() {
  console.log('🔧 Creating Follower Account Directly\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing required environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get the first user
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.log('❌ No users found');
      return;
    }

    const user = users[0];
    console.log('✅ Using user:', user.email);
    console.log('   User ID:', user.id);

    // Get broker account
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    const brokerAccount = brokerAccounts[0];
    console.log('✅ Using broker account:', brokerAccount.account_name);
    console.log('   Broker ID:', brokerAccount.id);
    console.log('');

    // Create follower directly using service role
    console.log('🔧 Creating follower account directly...');
    
    const followerData = {
      id: crypto.randomUUID(),
      subscribed_to: user.id,
      capital_allocated: 1000,
      risk_level: 'medium',
      copy_mode: 'multiplier',
      follower_name: 'Test Follower Direct',
      lot_size: 0.01,
      master_broker_account_id: brokerAccount.id,
      profile_id: null,
      api_key: 'test_api_key_direct',
      api_secret: 'test_api_secret_direct',
      account_status: 'active',
      is_verified: true,
      created_at: new Date().toISOString()
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('followers')
      .insert(followerData)
      .select();

    if (insertError) {
      console.log('❌ Error creating follower:', insertError.message);
      return;
    }

    console.log('✅ Follower created successfully!');
    console.log('   Follower ID:', insertResult[0].id);
    console.log('   Follower Name:', insertResult[0].follower_name);
    console.log('   Copy Mode:', insertResult[0].copy_mode);
    console.log('   Account Status:', insertResult[0].account_status);
    console.log('');

    // Test the display function
    console.log('🧪 Testing display function...');
    const { data: displayResult, error: displayError } = await supabase
      .rpc('get_user_follower_accounts_with_trader_info', {
        user_uuid: user.id
      });

    if (displayError) {
      console.log('❌ Display function error:', displayError.message);
    } else {
      console.log(`✅ Display function returned ${displayResult?.length || 0} followers`);
      if (displayResult && displayResult.length > 0) {
        displayResult.forEach((follower, index) => {
          console.log(`   ${index + 1}. ${follower.follower_name} (${follower.copy_mode})`);
        });
      }
    }

    // Test real-time monitoring
    console.log('');
    console.log('🧪 Testing real-time monitoring...');
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/real-time-trade-monitor`;
    
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ broker_id: brokerAccount.id })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Real-time monitoring result:');
        console.log('   Success:', result.success);
        console.log('   Active Followers:', result.active_followers);
        console.log('   Total Trades Found:', result.total_trades_found);
        
        if (result.active_followers > 0) {
          console.log('🎉 SUCCESS! The follower is now showing in real-time monitoring!');
          console.log('   active_followers is now:', result.active_followers);
        } else {
          console.log('⚠️  Still showing 0 active followers');
        }
      } else {
        const errorText = await response.text();
        console.log('❌ Real-time monitoring failed:', response.status, errorText);
      }
    } catch (error) {
      console.log('❌ Error calling real-time monitoring:', error.message);
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

createFollowerDirect().catch(console.error); 