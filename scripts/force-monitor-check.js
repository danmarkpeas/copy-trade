const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function forceMonitorCheck() {
  console.log('🔍 Forcing Real-Time Monitor Check...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const brokerId = 'f1bff339-23e2-4763-9aad-a3a02d18cf22';

    console.log('🔍 Calling real-time monitor directly...');
    
    // Call the real-time monitor
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

    console.log('📊 Monitor response status:', monitorResponse.status);
    
    if (monitorResponse.ok) {
      const monitorData = await monitorResponse.json();
      console.log('✅ Monitor response:', JSON.stringify(monitorData, null, 2));
      
      if (monitorData.total_trades_found > 0) {
        console.log('\n🎉 SUCCESS! The system detected your trades!');
        console.log(`   Found ${monitorData.total_trades_found} trades`);
        console.log(`   Copied ${monitorData.trades_copied} trades`);
        
        if (monitorData.copy_results && monitorData.copy_results.length > 0) {
          console.log('\n📊 Copy results:');
          monitorData.copy_results.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.symbol} - ${result.side} - Size: ${result.size} - Status: ${result.status}`);
          });
        }
      } else {
        console.log('\n📋 No trades detected by the monitor');
        console.log('   This could mean:');
        console.log('   1. The position was opened in a different account');
        console.log('   2. The position is not yet visible to the API');
        console.log('   3. The API credentials are for a different account');
        
        // Check if there are any recent copy_trades in the database
        console.log('\n🔍 Checking recent copy trades in database...');
        const { data: recentTrades, error: tradesError } = await supabase
          .from('copy_trades')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (tradesError) {
          console.log('❌ Error checking copy trades:', tradesError.message);
        } else {
          console.log(`📊 Found ${recentTrades?.length || 0} recent copy trades:`);
          if (recentTrades && recentTrades.length > 0) {
            recentTrades.forEach((trade, index) => {
              console.log(`   ${index + 1}. ${trade.original_symbol} - ${trade.original_side} - Size: ${trade.original_size} - Status: ${trade.status} - Created: ${trade.created_at}`);
            });
          } else {
            console.log('   No copy trades found in database');
          }
        }
      }
    } else {
      const errorText = await monitorResponse.text();
      console.log('❌ Monitor failed:', errorText);
    }

    // Also check the broker account details
    console.log('\n🔍 Checking broker account details...');
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', brokerId)
      .single();

    if (brokerError) {
      console.log('❌ Error getting broker account:', brokerError.message);
    } else {
      console.log('✅ Broker account details:');
      console.log('   ID:', brokerAccount.id);
      console.log('   Name:', brokerAccount.account_name);
      console.log('   Broker:', brokerAccount.broker_name);
      console.log('   Active:', brokerAccount.is_active);
      console.log('   Verified:', brokerAccount.is_verified);
      console.log('   API Key:', brokerAccount.api_key ? 'Present' : 'Missing');
      console.log('   API Secret:', brokerAccount.api_secret ? 'Present' : 'Missing');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }

  console.log('\n📋 Next Steps:');
  console.log('1. If trades are detected: The system is working correctly');
  console.log('2. If no trades detected: Check if the position was opened in the correct Delta Exchange account');
  console.log('3. Make sure the API credentials match the account where you opened the position');
}

forceMonitorCheck().catch(console.error); 