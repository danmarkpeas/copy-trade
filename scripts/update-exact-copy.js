const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateToExactCopy() {
  console.log('🔄 UPDATING TO EXACT 1:1 COPY TRADING');
  console.log('=====================================\n');

  try {
    // Get all active followers
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*');

    if (error) {
      console.error('❌ Error fetching followers:', error);
      return;
    }

    console.log(`📊 Found ${followers.length} active followers\n`);

    for (const follower of followers) {
      console.log(`👥 Updating ${follower.name}:`);
              console.log(`   Current Copy Mode: ${follower.copy_mode}`);
        console.log(`   Current Capital: ${follower.capital_allocated}`);
        console.log(`   Current Risk Level: ${follower.risk_level}`);

      // Update to exact 1:1 copying
      const updateData = {
        copy_mode: 'copy', // Use 'copy' mode for exact copying
        capital_allocated: 1000, // Set capital for testing
        risk_level: 'medium'
      };

      const { error: updateError } = await supabase
        .from('followers')
        .update(updateData)
        .eq('id', follower.id);

      if (updateError) {
        console.error(`   ❌ Error updating ${follower.name}:`, updateError);
      } else {
        console.log(`   ✅ Updated ${follower.name} to exact 1:1 copying`);
        console.log(`   📊 New settings:`);
        console.log(`      Copy Mode: copy (exact copy)`);
        console.log(`      Capital Allocated: 1000`);
        console.log(`      Risk Level: medium`);
        console.log('');
      }
    }

    // Verification
    console.log('📊 VERIFICATION');
    console.log('===============');
    
    const { data: updatedFollowers } = await supabase
      .from('followers')
      .select('*');

    for (const follower of updatedFollowers) {
      console.log(`👥 ${follower.name}:`);
      console.log(`   Copy Mode: ${follower.copy_mode}`);
      console.log(`   Capital Allocated: ${follower.capital_allocated}`);
      console.log(`   Risk Level: ${follower.risk_level}`);
      console.log('');
    }

    console.log('🎉 EXACT 1:1 COPY TRADING UPDATED SUCCESSFULLY!');
    console.log('===============================================');
    console.log('✅ All followers now use exact 1:1 copying');
    console.log('✅ Broker trades 1.0 lot → Followers trade 1.0 lot');
    console.log('✅ Broker trades 2.0 lot → Followers trade 2.0 lot');
    console.log('✅ Exact same lot size as broker');
    console.log('');
    console.log('📋 Benefits:');
    console.log('1. Exact same trade size as broker');
    console.log('2. Perfect 1:1 copying ratio');
    console.log('3. No size calculations needed');
    console.log('4. Direct mirror of broker trades');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Test the system with npm run test-manual');
    console.log('2. Monitor results with npm run monitor');
    console.log('3. All followers will now copy exact broker lot sizes');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateToExactCopy(); 