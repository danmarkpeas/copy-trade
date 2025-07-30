const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupCompleteSystem() {
  console.log('🚀 SETTING UP COMPLETE COPY TRADING SYSTEM');
  console.log('==========================================\n');

  try {
    // Step 1: Create a user
    console.log('👤 Step 1: Creating user...');
    const testUser = {
      id: '29a36e2e-84e4-4998-8588-6ffb02a77890', // Use the same ID from logs
      email: 'gauravcrd@gmail.com',
      name: 'Gaurav',
      created_at: new Date().toISOString()
    };

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .upsert([testUser], { onConflict: 'id' })
      .select();

    if (userError) {
      console.error('❌ Error creating user:', userError);
      return;
    }

    console.log('✅ User created/updated:', newUser[0].email);

    // Step 2: Create a broker account
    console.log('\n🏦 Step 2: Creating broker account...');
    const testBroker = {
      user_id: testUser.id,
      broker_name: 'delta',
      account_name: 'Master Blaster',
      api_key: 'test_api_key_for_delta_exchange',
      api_secret: 'test_api_secret_for_delta_exchange',
      account_status: 'active',
      is_verified: true,
      created_at: new Date().toISOString()
    };

    const { data: newBroker, error: brokerError } = await supabase
      .from('broker_accounts')
      .upsert([testBroker], { onConflict: 'user_id,account_name' })
      .select();

    if (brokerError) {
      console.error('❌ Error creating broker account:', brokerError);
      return;
    }

    console.log('✅ Broker account created:', newBroker[0].account_name);

    // Step 3: Create follower accounts
    console.log('\n👥 Step 3: Creating follower accounts...');
    
    const followers = [
      {
        user_id: testUser.id,
        master_broker_account_id: newBroker[0].id,
        follower_name: 'Anneshan',
        copy_mode: 'multiplier',
        multiplier: 0.001,
        min_lot_size: 0.001,
        max_lot_size: 0.01,
        account_status: 'active',
        is_verified: true,
        created_at: new Date().toISOString()
      },
      {
        user_id: testUser.id,
        master_broker_account_id: newBroker[0].id,
        follower_name: 'Gau',
        copy_mode: 'multiplier',
        multiplier: 0.001,
        min_lot_size: 0.001,
        max_lot_size: 0.01,
        account_status: 'active',
        is_verified: true,
        created_at: new Date().toISOString()
      },
      {
        user_id: testUser.id,
        master_broker_account_id: newBroker[0].id,
        follower_name: 'Test User 2 Follower',
        copy_mode: 'fixed_lot',
        fixed_lot: 0.001,
        min_lot_size: 0.001,
        max_lot_size: 0.01,
        account_status: 'active',
        is_verified: true,
        created_at: new Date().toISOString()
      }
    ];

    const { data: newFollowers, error: followerError } = await supabase
      .from('followers')
      .upsert(followers, { onConflict: 'user_id,follower_name' })
      .select();

    if (followerError) {
      console.error('❌ Error creating followers:', followerError);
      return;
    }

    console.log(`✅ Created ${newFollowers.length} follower accounts:`);
    newFollowers.forEach(follower => {
      console.log(`   - ${follower.follower_name} (${follower.copy_mode})`);
    });

    // Step 4: Verify setup
    console.log('\n🔍 Step 4: Verifying setup...');
    
    const { data: verifyUsers } = await supabase
      .from('users')
      .select('id, email');
    
    const { data: verifyBrokers } = await supabase
      .from('broker_accounts')
      .select('id, account_name, account_status');
    
    const { data: verifyFollowers } = await supabase
      .from('followers')
      .select('id, follower_name, account_status');

    console.log(`✅ Users: ${verifyUsers?.length || 0}`);
    console.log(`✅ Brokers: ${verifyBrokers?.length || 0} (${verifyBrokers?.filter(b => b.account_status === 'active').length || 0} active)`);
    console.log(`✅ Followers: ${verifyFollowers?.length || 0} (${verifyFollowers?.filter(f => f.account_status === 'active').length || 0} active)`);

    console.log('\n🎉 SETUP COMPLETE!');
    console.log('==================');
    console.log('✅ User account created');
    console.log('✅ Broker account created and active');
    console.log('✅ Follower accounts created and active');
    console.log('✅ System ready for copy trading');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Restart the copy trading system: npm run server');
    console.log('2. Open http://localhost:3000 and login');
    console.log('3. Go to Trades page and click "Real-Time Monitor & Copy"');
    console.log('4. Open a position on your Delta Exchange account');
    console.log('5. Watch followers automatically copy your trade');
    
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('   - This uses test API credentials');
    console.log('   - For real trading, update broker API keys with actual Delta Exchange credentials');
    console.log('   - Followers are set to very small lot sizes (0.001) for testing');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

setupCompleteSystem(); 