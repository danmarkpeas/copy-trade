const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugBalanceAPI() {
  console.log('🔍 DEBUGGING BALANCE API CALL\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Load follower
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (error || !followers || followers.length === 0) {
      throw new Error('No active followers found');
    }
    
    const follower = followers[0];
    console.log(`✅ Follower: ${follower.follower_name}`);
    console.log(`   API Key: ${follower.api_key ? 'Set' : 'Missing'}`);
    console.log(`   API Secret: ${follower.api_secret ? 'Set' : 'Missing'}`);
    
    // Test balance API call
    console.log('\n📋 Testing balance API call...');
    const DELTA_API_URL = 'https://api.india.delta.exchange';
    
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/wallet/balances';
    const prehashString = `GET${timestamp}${path}`;
    const signature = generateSignature(follower.api_secret, prehashString);
    
    console.log(`   URL: ${DELTA_API_URL}${path}`);
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Prehash: ${prehashString}`);
    console.log(`   Signature: ${signature.substring(0, 20)}...`);
    
    const response = await fetch(`${DELTA_API_URL}${path}`, {
      method: 'GET',
      headers: {
        'api-key': follower.api_key,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log(`   Response Data:`, JSON.stringify(data, null, 2));
    
    if (response.ok) {
      const availableBalance = parseFloat(data.result?.[0]?.available_balance || 0);
      console.log(`\n✅ Balance retrieved successfully: $${availableBalance}`);
    } else {
      console.log(`\n❌ API call failed: ${data.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

function generateSignature(secret, prehashString) {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(prehashString).digest('hex');
}

debugBalanceAPI().catch(console.error); 