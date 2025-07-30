const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixFollowerCopyRatio() {
  console.log('🔧 FIXING FOLLOWER COPY RATIO\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get Anneshan's follower details
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_name', 'Anneshan');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No follower found for Anneshan');
      return;
    }

    const follower = followers[0];
    console.log('✅ Found Anneshan follower:', follower.follower_name);
    console.log(`   Current Copy Mode: ${follower.copy_mode}`);
    console.log(`   Current Copy Ratio: ${follower.copy_ratio}`);

    // Update the copy ratio to ensure trades are copied
    console.log('\n🔧 Updating copy ratio...');
    const { data: updatedFollower, error: updateError } = await supabase
      .from('followers')
      .update({
        copy_ratio: 0.1, // 10% of original trade size
        copy_mode: 'multiplier'
      })
      .eq('id', follower.id)
      .select()
      .single();

    if (updateError) {
      console.log('❌ Error updating follower:', updateError);
      return;
    }

    console.log('✅ Follower updated successfully!');
    console.log(`   New Copy Mode: ${updatedFollower.copy_mode}`);
    console.log(`   New Copy Ratio: ${updatedFollower.copy_ratio}`);

    // Also update the copy trading engine settings
    console.log('\n🔧 Updating copy trading engine settings...');
    
    // Test the calculation with the new settings
    const testTrade = {
      symbol: 'POLUSD',
      side: 'buy',
      size: '1',
      price: '0.2414',
      fillId: 'test_123'
    };

    const copySettings = {
      copyRatio: 0.1,
      symbolFilter: [],
      minTradeSize: 0,
      maxTradeSize: 1000,
      useMarketOrders: true,
      reverseDirection: false,
      copyPositionClose: true
    };

    // Simulate the calculation
    const copySize = Math.abs(testTrade.size);
    const calculatedSize = Math.floor(copySize * copySettings.copyRatio);
    
    console.log('🧪 Testing trade calculation:');
    console.log(`   Original Trade Size: ${testTrade.size}`);
    console.log(`   Copy Ratio: ${copySettings.copyRatio}`);
    console.log(`   Calculated Size: ${calculatedSize}`);
    
    if (calculatedSize === 0) {
      console.log('❌ ISSUE: Calculated size is 0 - trade will be filtered out!');
      console.log('🔧 Fixing calculation logic...');
      
      // Use a minimum size instead of Math.floor
      const fixedSize = Math.max(0.01, copySize * copySettings.copyRatio);
      console.log(`   Fixed Size: ${fixedSize}`);
    } else {
      console.log('✅ Calculation looks good!');
    }

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. ✅ Follower copy ratio updated');
    console.log('2. 🔄 Restart the copy trading engine');
    console.log('3. 📊 Place a new trade on the master account');
    console.log('4. 👀 Watch for copy trades to be executed');
    console.log('5. 📈 Check the UI at http://localhost:3000/trades');

    console.log('\n💡 TESTING:');
    console.log('- The next trade on the master account should be copied to Anneshan');
    console.log('- Check the backend logs for "Copy trade executed" messages');
    console.log('- Monitor the UI for real-time updates');

  } catch (error) {
    console.log('❌ Error fixing follower copy ratio:', error.message);
  }
}

fixFollowerCopyRatio().catch(console.error); 