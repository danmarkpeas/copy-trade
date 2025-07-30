const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugCredentialMismatch() {
  console.log('🔍 Debugging Credential Mismatch...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the broker account from database
    const brokerId = 'f1bff339-23e2-4763-9aad-a3a02d18cf22';
    
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', brokerId)
      .single();

    if (brokerError) {
      console.log('❌ Error getting broker account:', brokerError.message);
      return;
    }

    console.log('✅ Database credentials:');
    console.log('   ID:', brokerAccount.id);
    console.log('   Name:', brokerAccount.account_name);
    console.log('   API Key Length:', brokerAccount.api_key ? brokerAccount.api_key.length : 0);
    console.log('   API Secret Length:', brokerAccount.api_secret ? brokerAccount.api_secret.length : 0);
    
    if (brokerAccount.api_key) {
      console.log('   API Key Preview:', brokerAccount.api_key.substring(0, 10) + '...' + brokerAccount.api_key.substring(brokerAccount.api_key.length - 10));
    }
    
    if (brokerAccount.api_secret) {
      console.log('   API Secret Preview:', brokerAccount.api_secret.substring(0, 10) + '...' + brokerAccount.api_secret.substring(brokerAccount.api_secret.length - 10));
    }

    // Test the verification API with the same credentials
    console.log('\n🔍 Testing verification API with database credentials...');
    
    const verifyResponse = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/delta-api-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        broker_name: 'delta',
        api_key: brokerAccount.api_key,
        api_secret: brokerAccount.api_secret
      })
    });

    console.log('   Verification API status:', verifyResponse.status);
    
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('   ✅ Verification successful:', verifyData);
    } else {
      const errorText = await verifyResponse.text();
      console.log('   ❌ Verification failed:', errorText);
    }

    // Test the real-time monitor with the same credentials
    console.log('\n🔍 Testing real-time monitor with database credentials...');
    
    const monitorResponse = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/real-time-trade-monitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        broker_id: brokerId
      })
    });

    console.log('   Real-time monitor status:', monitorResponse.status);
    
    if (monitorResponse.ok) {
      const monitorData = await monitorResponse.json();
      console.log('   ✅ Monitor response:', monitorData);
    } else {
      const errorText = await monitorResponse.text();
      console.log('   ❌ Monitor failed:', errorText);
    }

    // Check if there are any recent API calls in the logs
    console.log('\n🔍 Analysis:');
    console.log('   From the logs, we can see:');
    console.log('   - Verification API works: "API credentials verified successfully"');
    console.log('   - But direct API calls fail: "invalid_api_key"');
    console.log('   - This suggests the verification uses different credentials');
    
    console.log('\n💡 Possible causes:');
    console.log('   1. The verification API uses cached/old credentials');
    console.log('   2. The database has different credentials than expected');
    console.log('   3. There are multiple broker accounts with different credentials');
    console.log('   4. The verification API is not using the database credentials');

    console.log('\n🔧 Next steps:');
    console.log('   1. Check if the verification API is using the correct credentials');
    console.log('   2. Verify the database credentials are correct');
    console.log('   3. Test with a fresh API call using the exact same credentials');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

debugCredentialMismatch().catch(console.error); 