const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function updateCredentials() {
  console.log('🔑 UPDATING API CREDENTIALS IN DATABASE\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const brokerId = '332f4927-8f66-46a3-bb4f-252a8c5373e3';

    // New API credentials (you need to provide these)
    const newApiKey = 'FXjAYws3YtV8Ulonxp60tJhIhxPQxI'; // 30 characters
    const newApiSecret = 'GO1nTCVeglXnP0yJqtggz1cAHUlh4Lb8h4iC8zPT9Hv9Ng9SPtckENuHt0cM'; // 60 characters

    console.log('🔍 Updating broker account credentials...');
    console.log('   Broker ID:', brokerId);
    console.log('   New API Key Length:', newApiKey.length);
    console.log('   New API Secret Length:', newApiSecret.length);

    // Update the broker account
    const { data, error } = await supabase
      .from('broker_accounts')
      .update({
        api_key: newApiKey,
        api_secret: newApiSecret,
        is_verified: true,
        account_status: 'active'
      })
      .eq('id', brokerId)
      .select();

    if (error) {
      console.log('❌ Error updating credentials:', error);
      return;
    }

    console.log('✅ Credentials updated successfully!');
    console.log('   Updated record:', data[0].account_name);
    console.log('   Status:', data[0].account_status);
    console.log('   Verified:', data[0].is_verified);

    // Test the new credentials
    console.log('\n🧪 Testing new credentials...');
    
    const crypto = require('crypto');
    const method = 'GET';
    const endpoint = '/v2/fills';
    const timestamp = Math.floor(Date.now() / 1000) + 1;
    const message = method + endpoint + timestamp;
    const signature = crypto.createHmac('sha256', newApiSecret).update(message).digest('hex');

    console.log('   Timestamp:', timestamp);
    console.log('   Message:', message);
    console.log('   Signature:', signature.substring(0, 20) + '...');

    // Test API call
    const response = await fetch('https://api.delta.exchange/v2/fills', {
      method: 'GET',
      headers: {
        'api-key': newApiKey,
        'timestamp': timestamp.toString(),
        'signature': signature,
      }
    });

    if (response.ok) {
      console.log('✅ API credentials working!');
      const data = await response.json();
      console.log('   Response status:', response.status);
      console.log('   Fills found:', data.result?.length || 0);
    } else {
      const errorText = await response.text();
      console.log('❌ API credentials still failing:', errorText);
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

updateCredentials().catch(console.error); 