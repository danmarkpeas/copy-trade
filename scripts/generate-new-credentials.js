const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function generateNewCredentials() {
  console.log('🔑 GENERATING NEW API CREDENTIALS\n');

  console.log('📋 STEPS TO GET NEW API CREDENTIALS:');
  console.log('1. Go to Delta Exchange: https://www.delta.exchange/');
  console.log('2. Log in to your account');
  console.log('3. Go to Settings > API Keys');
  console.log('4. Click "Create New API Key"');
  console.log('5. Set permissions:');
  console.log('   ✅ Read positions');
  console.log('   ✅ Read fills');
  console.log('   ✅ Read orders');
  console.log('   ✅ Trading (if you want to copy trades)');
  console.log('6. Copy the API Key and API Secret');

  console.log('\n🔧 MANUAL UPDATE INSTRUCTIONS:');
  console.log('1. Go to: https://supabase.com/dashboard/project/urjgxetnqogwryhpafma/table-editor');
  console.log('2. Navigate to broker_accounts table');
  console.log('3. Find the record with ID: 332f4927-8f66-46a3-bb4f-252a8c5373e3');
  console.log('4. Update these fields:');
  console.log('   - api_key: Your new 30-character API key');
  console.log('   - api_secret: Your new 60-character API secret');
  console.log('   - is_verified: true');
  console.log('   - account_status: active');
  console.log('5. Save the changes');

  console.log('\n🌐 EASIER METHOD:');
  console.log('1. Go to: http://localhost:3000/connect-broker');
  console.log('2. Delete the current broker account');
  console.log('3. Add a new broker account with valid credentials');
  console.log('4. This will automatically update the database');

  console.log('\n💡 API CREDENTIALS REQUIREMENTS:');
  console.log('- API Key: Should be exactly 30 characters long');
  console.log('- API Secret: Should be exactly 60 characters long');
  console.log('- Both should be alphanumeric strings');
  console.log('- Must have the required permissions');

  console.log('\n🧪 TEST YOUR CREDENTIALS:');
  console.log('Once you have new credentials, run:');
  console.log('node scripts/test-new-credentials.js');

  console.log('\n❓ NEED HELP?');
  console.log('If you need help with the update process, please:');
  console.log('1. Generate new API credentials from Delta Exchange');
  console.log('2. Use the connect-broker page to reconnect');
  console.log('3. Or provide the new credentials for manual update');
}

generateNewCredentials().catch(console.error); 