const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkFollowersStructure() {
  console.log('🔍 CHECKING FOLLOWERS TABLE STRUCTURE\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Try to get all followers without any filters
    console.log('📋 Loading all followers...');
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*');

    if (error) {
      console.error('❌ Error loading followers:', error.message);
      return;
    }

    console.log(`✅ Found ${followers?.length || 0} follower(s)`);
    
    if (followers && followers.length > 0) {
      console.log('\n📊 Follower Details:');
      followers.forEach((follower, index) => {
        console.log(`\n   👤 Follower ${index + 1}:`);
        console.log(`      Name: ${follower.follower_name || 'N/A'}`);
        console.log(`      ID: ${follower.id || 'N/A'}`);
        console.log(`      User ID: ${follower.user_id || 'N/A'}`);
        console.log(`      API Key: ${follower.api_key ? '✅ Set' : '❌ Missing'}`);
        console.log(`      API Secret: ${follower.api_secret ? '✅ Set' : '❌ Missing'}`);
        
        // Show all available columns
        console.log(`      All columns:`, Object.keys(follower));
      });
    }

    // Now test the position execution with the correct follower data
    console.log('\n🎯 TESTING POSITION EXECUTION WITH CORRECT FOLLOWER DATA');
    
    // Get current positions
    const response = await fetch('http://localhost:3001/api/real-time-monitor');
    if (response.ok) {
      const data = await response.json();
      
      if (data.positions && data.positions.length > 0) {
        const position = data.positions[0];
        console.log(`\n📊 Current Position:`);
        console.log(`   Symbol: ${position.product_symbol}`);
        console.log(`   Size: ${position.size}`);
        console.log(`   Side: ${position.size > 0 ? 'BUY' : 'SELL'}`);
        
        // Test with first follower
        if (followers && followers.length > 0) {
          const follower = followers[0];
          console.log(`\n🚀 Testing copy trade for: ${follower.follower_name}`);
          
          if (follower.api_key && follower.api_secret) {
            console.log(`   ✅ API credentials available`);
            
            // Create master trade object
            const masterTrade = {
              symbol: position.product_symbol,
              side: position.size > 0 ? 'buy' : 'sell',
              size: Math.abs(position.size),
              price: position.entry_price,
              timestamp: position.created_at
            };
            
            console.log(`   📊 Would copy: ${masterTrade.symbol} ${masterTrade.side} ${masterTrade.size}`);
            console.log(`   💰 Ready to execute copy trade!`);
            
          } else {
            console.log(`   ❌ Missing API credentials`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkFollowersStructure().catch(console.error); 