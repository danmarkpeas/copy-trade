const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateSignature(secret, message) {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

async function testFollowerOrderPlacement(apiKey, apiSecret, followerName) {
  console.log(`\n🧪 Testing order placement for follower: ${followerName}`);
  
  try {
    const method = 'POST';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = '/v2/orders';
         const orderData = {
       product_symbol: 'BBUSD',
       size: 1, // Use integer size
       side: 'buy',
       order_type: 'market_order',
       client_order_id: 'test_diagnosis_' + Date.now()
     };
    
    const payload = JSON.stringify(orderData);
    const signatureData = method + timestamp + path + payload;
    const signature = generateSignature(apiSecret, signatureData);
    
    const headers = {
      'api-key': apiKey,
      'timestamp': timestamp,
      'signature': signature,
      'User-Agent': 'test-client',
      'Content-Type': 'application/json'
    };

    console.log('   📝 Signature data:', signatureData);
    console.log('   🔐 Generated signature:', signature);

    const response = await axios.post('https://api.india.delta.exchange/v2/orders', orderData, {
      headers,
      timeout: 10000
    });

    console.log('   ✅ Order placement successful');
    console.log('   📄 Response:', JSON.stringify(response.data, null, 2));
    
    // Cancel the test order immediately
    if (response.data.result?.id) {
      console.log('   🔄 Cancelling test order...');
      const cancelMethod = 'DELETE';
      const cancelTimestamp = Math.floor(Date.now() / 1000).toString();
      const cancelPath = '/v2/orders';
      const cancelPayload = JSON.stringify({ id: response.data.result.id, product_id: response.data.result.product_id });
      const cancelSignatureData = cancelMethod + cancelTimestamp + cancelPath + cancelPayload;
      const cancelSignature = generateSignature(apiSecret, cancelSignatureData);
      
      const cancelHeaders = {
        'api-key': apiKey,
        'timestamp': cancelTimestamp,
        'signature': cancelSignature,
        'User-Agent': 'test-client',
        'Content-Type': 'application/json'
      };

      await axios.delete('https://api.india.delta.exchange/v2/orders', {
        headers: cancelHeaders,
        data: { id: response.data.result.id, product_id: response.data.result.product_id },
        timeout: 10000
      });
      
      console.log('   ✅ Test order cancelled');
    }

    return { success: true, message: 'Order placement successful' };

  } catch (error) {
    console.log('   ❌ Order placement failed');
    console.log('   📄 Error:', error.response?.data || error.message);
    
    if (error.response?.data?.error?.code === 'insufficient_margin') {
      console.log('   💡 This is expected - insufficient margin for test order');
      return { success: true, message: 'Authentication working, insufficient margin' };
    } else if (error.response?.data?.error?.code === 'Signature Mismatch') {
      console.log('   🔍 SIGNATURE MISMATCH DETAILS:');
      console.log('   📝 Expected signature data:', error.response?.data?.error?.context?.signature_data);
      console.log('   📝 Our signature data:', signatureData);
      console.log('   🔐 Our signature:', signature);
      return { success: false, message: 'Signature mismatch', details: error.response?.data?.error };
    } else {
      return { success: false, message: error.response?.data?.error?.code || error.message };
    }
  }
}

async function diagnoseFollowerExecution() {
  console.log('🔍 DIAGNOSING FOLLOWER TRADE EXECUTION ISSUES');
  console.log('=' .repeat(60));

  try {
    // 1. Check all followers
    console.log('1. Checking all followers...');
    
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log(`✅ Found ${followers.length} active followers`);

    // 2. Check each follower's status
    console.log('\n2. Analyzing each follower...');
    
    for (const follower of followers) {
      console.log(`\n🔍 Follower: ${follower.follower_name} (${follower.id})`);
      console.log(`   Status: ${follower.account_status}`);
      console.log(`   API Key: ${follower.api_key ? '✅ Present' : '❌ Missing'}`);
      console.log(`   API Secret: ${follower.api_secret ? '✅ Present' : '❌ Missing'}`);
      console.log(`   Broker Account: ${follower.master_broker_account_id || '❌ Not linked'}`);
      console.log(`   Copy Mode: ${follower.copy_mode || 'Not set'}`);
      console.log(`   Fixed Lot: ${follower.fixed_lot || 'Not set'}`);

      if (!follower.api_key || !follower.api_secret) {
        console.log('   ❌ Missing API credentials - cannot execute trades');
        continue;
      }

      if (!follower.master_broker_account_id) {
        console.log('   ❌ Not linked to broker account - cannot execute trades');
        continue;
      }

      // 3. Test API authentication
      console.log('   🔐 Testing API authentication...');
      const authResult = await testFollowerOrderPlacement(
        follower.api_key, 
        follower.api_secret, 
        follower.follower_name
      );

      if (authResult.success) {
        console.log('   ✅ API authentication working');
      } else {
        console.log('   ❌ API authentication failed:', authResult.message);
      }
    }

    // 4. Check broker accounts
    console.log('\n3. Checking broker accounts...');
    
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active broker accounts found');
    } else {
      console.log(`✅ Found ${brokerAccounts.length} active broker accounts`);
      for (const broker of brokerAccounts) {
        console.log(`   📊 Broker: ${broker.broker_name} (${broker.id})`);
        console.log(`      Status: ${broker.is_active ? 'Active' : 'Inactive'}`);
        console.log(`      API Key: ${broker.api_key ? '✅ Present' : '❌ Missing'}`);
      }
    }

    // 5. Check copy relationships
    console.log('\n4. Checking copy relationships...');
    
         const { data: copyRelationships, error: relationshipError } = await supabase
       .from('followers')
       .select(`
         id,
         follower_name,
         master_broker_account_id,
         broker_accounts!inner(broker_name, is_active)
       `)
       .eq('account_status', 'active')
       .eq('broker_accounts.is_active', true);

    if (relationshipError) {
      console.log('❌ Error checking relationships:', relationshipError);
    } else {
      console.log(`✅ Found ${copyRelationships?.length || 0} active copy relationships`);
      for (const rel of copyRelationships || []) {
        console.log(`   🔗 ${rel.follower_name} → ${rel.broker_accounts.broker_name}`);
      }
    }

    // 6. Check recent copy trades
    console.log('\n5. Checking recent copy trades...');
    
    const { data: recentCopyTrades, error: copyTradesError } = await supabase
      .from('copy_trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (copyTradesError) {
      console.log('❌ Error checking copy trades:', copyTradesError);
    } else {
      console.log(`✅ Found ${recentCopyTrades?.length || 0} recent copy trades`);
      for (const trade of recentCopyTrades || []) {
        console.log(`   📈 ${trade.symbol} ${trade.side} ${trade.size} - ${trade.status}`);
      }
    }

    // 7. Summary and recommendations
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('=' .repeat(40));
    
    const issues = [];
    const working = [];

         for (const follower of followers) {
       if (!follower.api_key || !follower.api_secret) {
         issues.push(`${follower.follower_name}: Missing API credentials`);
       } else if (!follower.master_broker_account_id) {
         issues.push(`${follower.follower_name}: Not linked to broker account`);
       } else {
         working.push(follower.follower_name);
       }
     }

    if (issues.length > 0) {
      console.log('❌ ISSUES FOUND:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }

    if (working.length > 0) {
      console.log('✅ WORKING FOLLOWERS:');
      working.forEach(name => console.log(`   - ${name}`));
    }

    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('1. Ensure all followers have valid API credentials');
    console.log('2. Link all followers to active broker accounts');
    console.log('3. Check the backend logs for real-time trade execution');
    console.log('4. Monitor the trade execution status page');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

diagnoseFollowerExecution(); 