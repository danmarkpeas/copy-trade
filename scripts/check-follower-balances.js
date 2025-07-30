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

async function checkFollowerBalances() {
  console.log('💰 CHECKING FOLLOWER BALANCES');
  console.log('==============================\n');

  try {
    // Get all active followers
    const { data: followers, error: followerError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followerError) {
      console.error('❌ Error fetching followers:', followerError);
      return;
    }

    console.log(`📊 Found ${followers.length} active followers\n`);

    for (const follower of followers) {
      console.log(`👥 Checking ${follower.follower_name}:`);
      console.log(`   API Key: ${follower.api_key ? follower.api_key.substring(0, 10) + '...' : 'NOT SET'}`);
      console.log(`   Multiplier: ${follower.multiplier}`);
      console.log(`   Lot Size: ${follower.lot_size}`);

      if (!follower.api_key || !follower.api_secret) {
        console.log('   ❌ Missing API credentials');
        continue;
      }

      try {
        // Check account balance
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const path = '/v2/wallet/balances';
        const signatureData = 'GET' + timestamp + path;
        const signature = generateSignature(follower.api_secret, signatureData);

        const headers = {
          'api-key': follower.api_key,
          'timestamp': timestamp,
          'signature': signature,
          'User-Agent': 'copy-trader-client',
          'Content-Type': 'application/json'
        };

        const url = `https://api.india.delta.exchange${path}`;
        const response = await axios.get(url, { headers, timeout: 10000 });

        if (response.data && response.data.result) {
          const balances = response.data.result;
          console.log('   ✅ Balance check successful');
          
          // Find USD balance
          const usdBalance = balances.find(b => b.currency === 'USD');
          if (usdBalance) {
            const balance = parseFloat(usdBalance.available_balance);
            console.log(`   💰 USD Balance: $${balance.toFixed(6)}`);
            
            if (balance > 10) {
              console.log('   ✅ Sufficient balance for trading');
            } else if (balance > 1) {
              console.log('   ⚠️ Low balance - may have issues with larger trades');
            } else {
              console.log('   ❌ Insufficient balance - needs funding');
            }
          } else {
            console.log('   ⚠️ No USD balance found');
          }

          // Show other currencies
          const otherBalances = balances.filter(b => b.currency !== 'USD' && parseFloat(b.available_balance) > 0);
          if (otherBalances.length > 0) {
            console.log('   💱 Other balances:');
            otherBalances.forEach(b => {
              console.log(`      ${b.currency}: ${parseFloat(b.available_balance).toFixed(6)}`);
            });
          }
        } else {
          console.log('   ❌ No balance data received');
        }

      } catch (error) {
        if (error.response) {
          const errorCode = error.response.data?.error?.code;
          const errorMessage = error.response.data?.error?.message;
          
          if (errorCode === 'invalid_api_key') {
            console.log('   ❌ Invalid API key');
          } else if (errorCode === 'insufficient_margin') {
            console.log('   ❌ Insufficient margin');
          } else {
            console.log(`   ❌ API Error: ${errorCode} - ${errorMessage}`);
          }
        } else {
          console.log(`   ❌ Network Error: ${error.message}`);
        }
      }

      console.log('');
    }

    // Summary
    console.log('📋 SUMMARY');
    console.log('==========');
    console.log('✅ Followers with sufficient balance can execute trades');
    console.log('❌ Followers with low balance will fail with insufficient margin');
    console.log('⚠️ Followers with invalid API keys need credential updates');
    console.log('');
    console.log('💡 Solutions:');
    console.log('1. Add funds to followers with low balance');
    console.log('2. Update API credentials for followers with invalid keys');
    console.log('3. Use only followers with sufficient balance for testing');

  } catch (error) {
    console.error('❌ Balance check failed:', error.message);
  }
}

checkFollowerBalances().catch(console.error); 