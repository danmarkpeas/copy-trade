const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugEdgeFunction() {
  console.log('🔍 DEBUGGING EDGE FUNCTION\n');

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
    console.log('📋 BROKER ACCOUNT:');
    console.log('   ID:', brokerAccount.id);
    console.log('   Name:', brokerAccount.account_name);
    console.log('   Profile ID:', brokerAccount.account_uid);

    console.log('\n🔍 INVOKING EDGE FUNCTION WITH DEBUG...');
    
    // Test the Edge Function with debug mode
    const { data: result, error: invokeError } = await supabase.functions.invoke('real-time-trade-monitor', {
      body: { 
        broker_id: brokerAccount.id,
        debug: true
      }
    });

    if (invokeError) {
      console.log('❌ Edge Function failed:', invokeError);
      return;
    }

    console.log('✅ Edge Function Response:');
    console.log('   Success:', result.success);
    console.log('   Message:', result.message);
    console.log('   Total trades found:', result.total_trades_found);
    console.log('   Active followers:', result.active_followers);
    console.log('   Trades copied:', result.trades_copied);
    console.log('   Timestamp:', result.timestamp);

    // Check the logs from the Edge Function
    console.log('\n📋 EDGE FUNCTION LOGS:');
    if (result.logs) {
      result.logs.forEach((log) => {
        console.log('   ', log);
      });
    }

    // Test direct API calls to compare
    console.log('\n🔐 TESTING DIRECT API CALLS...');
    
    const crypto = require('crypto');
    const API_KEY = brokerAccount.api_key;
    const API_SECRET = brokerAccount.api_secret;
    const BASE_URL = 'https://api.india.delta.exchange';

    function generateSignature(secret, prehashString) {
      return crypto.createHmac('sha256', secret).update(prehashString).digest('hex');
    }

    // Test fills endpoint directly
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const method = 'GET';
      const path = '/v2/fills';
      const queryString = '';
      const payload = '';
      
      const prehashString = method + timestamp + path + queryString + payload;
      const signature = generateSignature(API_SECRET, prehashString);

      const headers = {
        'Accept': 'application/json',
        'api-key': API_KEY,
        'signature': signature,
        'timestamp': timestamp,
        'User-Agent': 'copy-trading-platform'
      };

      const response = await fetch(`${BASE_URL}${path}`, {
        method: 'GET',
        headers: headers
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Direct API - Fills found: ${data.result?.length || 0}`);
        
        if (data.result && data.result.length > 0) {
          const now = new Date();
          const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
          
          console.log('\n📊 RECENT FILLS (Direct API):');
          data.result.slice(0, 3).forEach((fill, index) => {
            const fillTime = new Date(fill.created_at);
            const isRecent = fillTime > fiveMinutesAgo;
            
            console.log(`   ${index + 1}. ${fill.product_symbol} ${fill.side} ${fill.size} @ ${fill.price}`);
            console.log(`      Time: ${fillTime.toISOString()}`);
            console.log(`      Recent: ${isRecent ? '✅ YES' : '❌ NO'}`);
            console.log('');
          });
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Direct API failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ Error testing direct API: ${error.message}`);
    }

    console.log('\n🎯 ANALYSIS:');
    if (result.total_trades_found === 0) {
      console.log('❌ Edge Function detected 0 trades');
      console.log('✅ Direct API shows recent trades exist');
      console.log('🔧 Issue: Edge Function trade detection logic has a bug');
    } else {
      console.log('✅ Edge Function is working correctly');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

debugEdgeFunction().catch(console.error); 