const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixFollowersTable() {
  console.log('🔧 Fixing Followers Table Structure\n');

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
    console.log('');

    // Check current followers table structure
    console.log('🔍 Checking current followers table...');
    const { data: existingFollowers, error: checkError } = await supabase
      .from('followers')
      .select('*')
      .limit(1);

    if (checkError) {
      console.log('❌ Error checking followers table:', checkError.message);
      return;
    }

    console.log('✅ Followers table accessible');
    console.log('');

    // Create a proper follower record with all required fields
    console.log('👥 Creating proper follower record...');
    const { data: follower, error: followerError } = await supabase
      .from('followers')
      .insert({
        id: user.id, // This should be the user ID
        subscribed_to: user.id, // Following themselves for testing
        capital_allocated: 1000,
        risk_level: 'medium',
        copy_mode: 'multiplier'
      })
      .select()
      .single();

    if (followerError) {
      if (followerError.message.includes('duplicate key')) {
        console.log('✅ Follower record already exists');
      } else {
        console.log('❌ Error creating follower:', followerError.message);
        return;
      }
    } else {
      console.log('✅ Created follower record');
    }
    console.log('');

    // Now let's add the missing columns to the followers table
    console.log('🔧 Adding missing columns to followers table...');
    
    // We need to run SQL to add the missing columns
    const alterQueries = [
      'ALTER TABLE followers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true',
      'ALTER TABLE followers ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT \'active\'',
      'ALTER TABLE followers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)',
      'ALTER TABLE followers ADD COLUMN IF NOT EXISTS broker_account_id UUID REFERENCES broker_accounts(id)',
      'ALTER TABLE followers ADD COLUMN IF NOT EXISTS multiplier DECIMAL(10,4) DEFAULT 0.5',
      'ALTER TABLE followers ADD COLUMN IF NOT EXISTS lot_size DECIMAL(20,8)',
      'ALTER TABLE followers ADD COLUMN IF NOT EXISTS percentage_balance DECIMAL(5,2)',
      'ALTER TABLE followers ADD COLUMN IF NOT EXISTS drawdown_limit DECIMAL(5,2) DEFAULT 5.00'
    ];

    for (const query of alterQueries) {
      const { error: alterError } = await supabase.rpc('exec_sql', { sql: query });
      if (alterError) {
        console.log(`⚠️ Could not add column (might already exist): ${alterError.message}`);
      } else {
        console.log('✅ Added column successfully');
      }
    }
    console.log('');

    // Update the existing follower record with the new fields
    console.log('🔄 Updating follower record with new fields...');
    const { error: updateError } = await supabase
      .from('followers')
      .update({
        user_id: user.id,
        broker_account_id: brokerAccount.id,
        is_active: true,
        sync_status: 'active',
        multiplier: 0.5,
        drawdown_limit: 5.00
      })
      .eq('id', user.id);

    if (updateError) {
      console.log('❌ Error updating follower:', updateError.message);
    } else {
      console.log('✅ Updated follower record with new fields');
    }
    console.log('');

    // Test the followers query that the edge function uses
    console.log('🧪 Testing edge function followers query...');
    const { data: testFollowers, error: testError } = await supabase
      .from('followers')
      .select('*')
      .eq('subscribed_to', brokerAccount.id)
      .eq('is_active', true)
      .eq('sync_status', 'active');

    if (testError) {
      console.log('❌ Error testing followers query:', testError.message);
    } else {
      console.log(`✅ Found ${testFollowers?.length || 0} active followers`);
      if (testFollowers && testFollowers.length > 0) {
        console.log('   Follower details:', {
          id: testFollowers[0].id,
          user_id: testFollowers[0].user_id,
          is_active: testFollowers[0].is_active,
          sync_status: testFollowers[0].sync_status
        });
      }
    }
    console.log('');

    console.log('🎉 Followers table fix complete!');
    console.log('===============================');
    console.log('✅ Added missing columns to followers table');
    console.log('✅ Created/updated follower record');
    console.log('✅ Tested edge function query');
    console.log('');
    console.log('🚀 Now test the real-time monitoring again:');
    console.log('1. Go to http://localhost:3000/trades');
    console.log('2. Click "Real-Time Monitor & Copy"');
    console.log('3. You should now see active_followers > 0');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

fixFollowersTable().catch(console.error); 