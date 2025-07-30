const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkFollowerAllBalances() {
  console.log('💰 CHECKING FOLLOWER ALL BALANCES\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get active followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.error('❌ No active followers found');
      return;
    }

    const follower = followers[0];
    console.log(`👤 Checking balances for: ${follower.follower_name}`);

    // Get all balances
    const DELTA_API_URL = 'https://api.india.delta.exchange';
    
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/wallet/balances';
    const message = `GET${timestamp}${path}`;
    const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

    const response = await fetch(`${DELTA_API_URL}${path}`, {
      method: 'GET',
      headers: {
        'api-key': follower.api_key,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    console.log('\n📊 RAW API RESPONSE:');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.ok && data.success && data.result) {
      console.log('\n📊 ALL BALANCES:');
      console.log('Currency | Available | Total | Reserved');
      console.log('---------|-----------|-------|---------');
      
      let totalUSD = 0;
      let hasAnyBalance = false;
      
      if (Array.isArray(data.result)) {
        data.result.forEach(balance => {
          if (balance && balance.currency) {
            const available = parseFloat(balance.available_balance || 0);
            const total = parseFloat(balance.total_balance || 0);
            const reserved = parseFloat(balance.reserved_balance || 0);
            
            if (available > 0 || total > 0) {
              hasAnyBalance = true;
              const currency = balance.currency || 'UNKNOWN';
              console.log(`${currency.padEnd(8)} | ${available.toFixed(8).padStart(9)} | ${total.toFixed(8).padStart(5)} | ${reserved.toFixed(8).padStart(8)}`);
              
              if (currency === 'USD') {
                totalUSD = available;
              }
            }
          }
        });
      } else {
        console.log('❌ Unexpected data format - result is not an array');
      }
      
      if (!hasAnyBalance) {
        console.log('❌ No balances found - Account is empty');
      }
      
      console.log(`\n💰 USD BALANCE: $${totalUSD.toFixed(8)}`);
      
      if (totalUSD < 0.05) {
        console.log('\n❌ ISSUE IDENTIFIED:');
        console.log('   The follower account has insufficient USD balance for trading.');
        console.log('   Minimum required: $0.05 USD');
        console.log('   Current balance: $' + totalUSD.toFixed(8) + ' USD');
        console.log('\n💡 SOLUTIONS:');
        console.log('   1. Deposit USD into the follower Delta Exchange account');
        console.log('   2. Transfer funds from another account');
        console.log('   3. Use a different follower account with sufficient balance');
        console.log('   4. Wait for the account to be funded');
        
        console.log('\n🔧 IMMEDIATE FIX:');
        console.log('   The copy trading system will continue to detect master positions');
        console.log('   but will fail to execute copy trades until the account is funded.');
        console.log('   This is expected behavior for security reasons.');
      } else {
        console.log('\n✅ SUFFICIENT BALANCE:');
        console.log('   The follower account has enough USD for trading.');
        console.log('   Copy trades should execute successfully.');
      }
      
    } else {
      console.error('❌ Failed to fetch balances:', data.message || 'Unknown error');
      console.error('Response status:', response.status);
      console.error('Full response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkFollowerAllBalances().catch(console.error); 