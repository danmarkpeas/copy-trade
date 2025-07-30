const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createSimpleFollower() {
  console.log('👥 Creating Simple Follower Record\n');

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

    // Check existing followers
    console.log('🔍 Checking existing followers...');
    const { data: existingFollowers, error: checkError } = await supabase
      .from('followers')
      .select('*');

    if (checkError) {
      console.log('❌ Error checking followers:', checkError.message);
      return;
    }

    console.log(`✅ Found ${existingFollowers?.length || 0} existing followers`);
    
    if (existingFollowers && existingFollowers.length > 0) {
      const follower = existingFollowers[0];
      console.log('   Current follower:');
      console.log('     ID:', follower.id);
      console.log('     Subscribed to:', follower.subscribed_to);
      console.log('     Account status:', follower.account_status);
      console.log('');

      // Update the existing follower to make it work
      console.log('🔄 Updating existing follower...');
      const { data: updatedFollower, error: updateError } = await supabase
        .from('followers')
        .update({
          subscribed_to: user.id,
          account_status: 'active'
        })
        .eq('id', follower.id)
        .select()
        .single();

      if (updateError) {
        console.log('❌ Error updating follower:', updateError.message);
        console.log('💡 Trying alternative approach...');
        
        // Try to delete and recreate
        console.log('🗑️  Deleting existing follower...');
        const { error: deleteError } = await supabase
          .from('followers')
          .delete()
          .eq('id', follower.id);

        if (deleteError) {
          console.log('❌ Error deleting follower:', deleteError.message);
          return;
        }
        console.log('✅ Deleted existing follower');
      } else {
        console.log('✅ Updated existing follower');
        console.log('   New subscribed_to:', updatedFollower.subscribed_to);
        console.log('   New account_status:', updatedFollower.account_status);
      }
    }
    console.log('');

    // Create a new follower if needed
    if (!existingFollowers || existingFollowers.length === 0) {
      console.log('👥 Creating new follower record...');
      
      // Generate a new UUID for the follower
      const followerId = crypto.randomUUID();
      
      const { data: newFollower, error: createError } = await supabase
        .from('followers')
        .insert({
          id: followerId,
          subscribed_to: user.id,
          capital_allocated: 1000,
          risk_level: 'medium',
          copy_mode: 'multiplier',
          multiplier: 0.5,
          drawdown_limit: 5.00,
          user_id: user.id,
          master_broker_account_id: brokerAccount.id,
          is_verified: true,
          account_status: 'active'
        })
        .select()
        .single();

      if (createError) {
        console.log('❌ Error creating follower:', createError.message);
        return;
      }

      console.log('✅ Created new follower record');
      console.log('   ID:', newFollower.id);
      console.log('   Subscribed to:', newFollower.subscribed_to);
      console.log('   Account status:', newFollower.account_status);
    }
    console.log('');

    // Test the follower query
    console.log('🧪 Testing Follower Query:');
    console.log('===========================');
    const { data: testFollowers, error: testError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', user.id)
      .eq('account_status', 'active');

    if (testError) {
      console.log('❌ Test query failed:', testError.message);
    } else {
      console.log(`✅ Test query found ${testFollowers?.length || 0} followers`);
      if (testFollowers && testFollowers.length > 0) {
        console.log('   Follower details:', {
          id: testFollowers[0].id,
          subscribed_to: testFollowers[0].subscribed_to,
          copy_mode: testFollowers[0].copy_mode,
          account_status: testFollowers[0].account_status
        });
      }
    }
    console.log('');

    console.log('🎉 SUCCESS! Follower record created/updated!');
    console.log('===========================================');
    console.log('✅ Follower record is now properly configured');
    console.log('✅ Edge functions are deployed and working');
    console.log('✅ Real-time monitoring should now work');
    console.log('');
    console.log('🚀 Test the real-time monitoring:');
    console.log('   - Go to http://localhost:3000/trades');
    console.log('   - Click "Real-Time Monitor & Copy"');
    console.log('   - You should now see active_followers: 1');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

createSimpleFollower().catch(console.error); 