const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createBrokerForUser() {
  console.log('🔧 CREATING BROKER ACCOUNT FOR USER');
  console.log('===================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the user gauravcrd@gmail.com
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'gauravcrd@gmail.com')
      .single();

    if (userError || !users) {
      console.error('❌ User gauravcrd@gmail.com not found');
      return;
    }

    console.log(`👤 Found user: ${users.email} (${users.id})`);

    // Check if user already has a broker account
    const { data: existingBrokers, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('id, account_name, is_active')
      .eq('user_id', users.id);

    if (brokerError) {
      console.error('❌ Error checking existing brokers:', brokerError);
      return;
    }

    if (existingBrokers && existingBrokers.length > 0) {
      console.log('✅ User already has broker accounts:');
      existingBrokers.forEach(broker => {
        console.log(`   - ${broker.account_name} (${broker.is_active ? 'active' : 'inactive'})`);
      });
      return;
    }

    // Create a broker account for the user
    console.log('📝 Creating broker account...');
    
    const newBroker = {
      user_id: users.id,
      broker_name: 'delta',
      account_name: 'Master Blaster',
      api_key: 'test_api_key_for_delta_exchange',
      api_secret: 'test_api_secret_for_delta_exchange',
      is_active: true,
      is_verified: false,
      account_status: 'active'
    };

    const { data: createdBroker, error: createError } = await supabase
      .from('broker_accounts')
      .insert([newBroker])
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating broker account:', createError);
      return;
    }

    console.log('✅ Broker account created successfully!');
    console.log(`   ID: ${createdBroker.id}`);
    console.log(`   Name: ${createdBroker.account_name}`);
    console.log(`   Broker: ${createdBroker.broker_name}`);
    console.log(`   Status: ${createdBroker.account_status}`);
    console.log(`   Is Active: ${createdBroker.is_active}`);

    console.log('\n🎉 Now the copy trading system should work!');
    console.log('📝 Note: You need to update the API keys with real ones in the frontend.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createBrokerForUser(); 