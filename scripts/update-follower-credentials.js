const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function updateFollowerCredentials() {
  console.log('🔑 UPDATING FOLLOWER API CREDENTIALS\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Get active followers
    console.log('📋 STEP 1: Getting Active Followers');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log(`✅ Found ${followers.length} active followers:`);
    followers.forEach((follower, index) => {
      console.log(`   ${index + 1}. ${follower.follower_name} (${follower.copy_mode})`);
      console.log(`      Current API Key: ${follower.api_key ? '✅ Set' : '❌ Missing'}`);
      console.log(`      Current API Secret: ${follower.api_secret ? '✅ Set' : '❌ Missing'}`);
      console.log('');
    });

    // 2. Instructions for getting API credentials
    console.log('📋 STEP 2: How to Get Delta Exchange API Credentials');
    console.log('\n🔧 TO GET DELTA EXCHANGE API CREDENTIALS:');
    console.log('1. Go to https://www.delta.exchange/');
    console.log('2. Log in to your Delta Exchange account');
    console.log('3. Go to Settings → API Keys');
    console.log('4. Click "Create New API Key"');
    console.log('5. Set the following permissions:');
    console.log('   ✅ Read (for account info and balances)');
    console.log('   ✅ Trade (for placing orders)');
    console.log('   ✅ Position (for managing positions)');
    console.log('6. Click "Create"');
    console.log('7. Copy the API Key and API Secret');
    console.log('8. Keep them safe - you won\'t see the secret again!');

    // 3. Manual update instructions
    console.log('\n📋 STEP 3: Manual Update Instructions');
    console.log('\n💻 TO UPDATE CREDENTIALS MANUALLY:');
    console.log('1. Open your Supabase dashboard');
    console.log('2. Go to Table Editor → followers');
    console.log('3. Find the follower account (Anneshan)');
    console.log('4. Click "Edit" on that row');
    console.log('5. Update the api_key and api_secret fields');
    console.log('6. Click "Save"');

    // 4. SQL update command
    console.log('\n📋 STEP 4: SQL Update Command');
    console.log('\n🗄️  TO UPDATE VIA SQL:');
    console.log('Run this SQL command in your Supabase SQL editor:');
    console.log(`
UPDATE followers 
SET 
  api_key = 'YOUR_DELTA_API_KEY_HERE',
  api_secret = 'YOUR_DELTA_API_SECRET_HERE'
WHERE follower_name = 'Anneshan';
    `);

    // 5. Test after update
    console.log('\n📋 STEP 5: Test After Update');
    console.log('\n🧪 AFTER UPDATING CREDENTIALS:');
    console.log('1. Run: node scripts/test-follower-credentials.js');
    console.log('2. If successful, run: node scripts/execute-real-orders.js');
    console.log('3. Check your Delta Exchange account for executed orders');

    // 6. Alternative: Create new follower
    console.log('\n📋 STEP 6: Alternative - Create New Follower');
    console.log('\n🆕 IF YOU WANT TO CREATE A NEW FOLLOWER:');
    console.log('Run this SQL command:');
    console.log(`
INSERT INTO followers (
  user_id,
  follower_name,
  master_broker_account_id,
  account_status,
  copy_mode,
  copy_ratio,
  api_key,
  api_secret,
  is_active
) VALUES (
  '29a36e2e-84e4-4998-8588-6ffb02a77890',
  'New Follower',
  'f9593e9d-b50d-447c-80e3-a79464be7dff',
  'active',
  'multiplier',
  0.1,
  'YOUR_DELTA_API_KEY_HERE',
  'YOUR_DELTA_API_SECRET_HERE',
  true
);
    `);

    console.log('\n💡 IMPORTANT NOTES:');
    console.log('• Replace YOUR_DELTA_API_KEY_HERE with your actual API key');
    console.log('• Replace YOUR_DELTA_API_SECRET_HERE with your actual API secret');
    console.log('• Each follower needs their own Delta Exchange account');
    console.log('• API credentials must have trading permissions');
    console.log('• Never share API credentials publicly');

    console.log('\n🔧 SYSTEM STATUS:');
    console.log('✅ Follower credential update guide completed');
    console.log('✅ Ready to configure real order execution');
    console.log('✅ Copy trading system will work once credentials are set');

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Get your Delta Exchange API credentials');
    console.log('2. Update the follower account with the credentials');
    console.log('3. Test the credentials using the test script');
    console.log('4. Run the real order execution script');
    console.log('5. Check your Delta Exchange account for executed orders');

  } catch (error) {
    console.log('❌ Error updating follower credentials:', error.message);
  }
}

updateFollowerCredentials().catch(console.error); 