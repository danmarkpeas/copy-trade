const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function quickApiTest() {
  console.log('🔑 QUICK API KEY TEST\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the most recent broker account
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
      return;
    }

    const brokerAccount = brokerAccounts[0];
    console.log('📋 Testing API Key:', brokerAccount.api_key);
    console.log('📋 Profile ID:', brokerAccount.account_uid);

    // Test API connection
    const crypto = require('crypto');
    const serverTime = Math.floor(Date.now() / 1000) + 1;
    const message = `${serverTime}GET/v2/fills`;
    const signature = crypto.createHmac('sha256', brokerAccount.api_secret).update(message).digest('hex');

    console.log('\n🧪 Testing API connection...');
    
    const response = await fetch('https://api.delta.exchange/v2/fills', {
      method: 'GET',
      headers: {
        'api-key': brokerAccount.api_key,
        'timestamp': serverTime.toString(),
        'signature': signature,
      }
    });

    console.log('📊 Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS! API key is working!');
      console.log(`   Total fills: ${data.result?.length || 0}`);
      
      if (data.result && data.result.length > 0) {
        console.log('\n📊 Recent trades:');
        data.result.slice(0, 3).forEach((fill, index) => {
          console.log(`   ${index + 1}. ${fill.product_symbol} - ${fill.side} - ${fill.size} - ${fill.created_at}`);
        });
      }
      
      console.log('\n🎉 Your API key is now active and working!');
      console.log('🚀 Copy trading system is ready to use!');
    } else {
      const errorText = await response.text();
      console.log('❌ Still getting error:', errorText);
      console.log('\n⚠️  API key may still need activation:');
      console.log('   1. Go to Delta Exchange → Settings → API Keys');
      console.log('   2. Find your API key and click "Activate"');
      console.log('   3. Wait 5-10 minutes for activation');
      console.log('   4. Run this test again');
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

quickApiTest().catch(console.error); 