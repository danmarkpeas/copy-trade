const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestBroker() {
  console.log('🔧 CREATING TEST BROKER ACCOUNT');
  console.log('===============================\n');

  try {
    // First, get the current user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('❌ No users found in database');
      return;
    }

    const user = users[0];
    console.log(`👤 Using user: ${user.email} (${user.id})`);

    // Create a test broker account
    const testBroker = {
      user_id: user.id,
      broker_name: 'delta',
      account_name: 'Test Broker Account',
      api_key: 'test_api_key_for_delta_exchange',
      api_secret: 'test_api_secret_for_delta_exchange',
      account_status: 'active',
      is_verified: true,
      created_at: new Date().toISOString()
    };

    console.log('📝 Creating test broker account...');
    console.log(`   Name: ${testBroker.account_name}`);
    console.log(`   Broker: ${testBroker.broker_name}`);
    console.log(`   Status: ${testBroker.account_status}`);

    const { data: newBroker, error: createError } = await supabase
      .from('broker_accounts')
      .insert([testBroker])
      .select();

    if (createError) {
      console.error('❌ Error creating broker account:', createError);
      return;
    }

    console.log('✅ Test broker account created successfully!');
    console.log(`   ID: ${newBroker[0].id}`);

    // Now let's also create a test follower if none exist
    const { data: followers, error: followerError } = await supabase
      .from('followers')
      .select('id')
      .eq('user_id', user.id);

    if (followerError) {
      console.error('❌ Error checking followers:', followerError);
      return;
    }

    if (!followers || followers.length === 0) {
      console.log('\n👥 Creating test follower account...');
      
      const testFollower = {
        user_id: user.id,
        master_broker_account_id: newBroker[0].id,
        follower_name: 'Test Follower',
        copy_mode: 'fixed_lot',
        fixed_lot: 0.001,
        min_lot_size: 0.001,
        max_lot_size: 0.01,
        account_status: 'active',
        is_verified: true,
        created_at: new Date().toISOString()
      };

      const { data: newFollower, error: followerCreateError } = await supabase
        .from('followers')
        .insert([testFollower])
        .select();

      if (followerCreateError) {
        console.error('❌ Error creating follower:', followerCreateError);
      } else {
        console.log('✅ Test follower account created successfully!');
        console.log(`   Name: ${newFollower[0].follower_name}`);
        console.log(`   Copy Mode: ${newFollower[0].copy_mode}`);
        console.log(`   Fixed Lot: ${newFollower[0].fixed_lot}`);
      }
    } else {
      console.log(`\n👥 Found ${followers.length} existing followers`);
    }

    console.log('\n🎉 SETUP COMPLETE!');
    console.log('==================');
    console.log('✅ Test broker account created');
    console.log('✅ Test follower account created (if needed)');
    console.log('✅ System ready for testing');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Restart the copy trading system');
    console.log('2. Open a position on your Delta Exchange account');
    console.log('3. Watch the test follower copy your trade');
    
    console.log('\n⚠️  NOTE:');
    console.log('   This uses test API credentials');
    console.log('   For real trading, update with actual Delta Exchange API keys');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestBroker(); 