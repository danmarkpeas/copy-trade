const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFollowerSettings() {
  console.log('🔍 CHECKING FOLLOWER SETTINGS');
  console.log('=' .repeat(40));

  try {
    // 1. Check current follower settings
    console.log('1. Current follower settings...');
    
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError || !followers || followers.length === 0) {
      console.log('❌ No active followers found');
      return;
    }

    console.log(`✅ Found ${followers.length} active followers`);

    for (const follower of followers) {
      console.log(`\n🔍 Follower: ${follower.follower_name}`);
      console.log(`   ID: ${follower.id}`);
      console.log(`   Copy Mode: ${follower.copy_mode || 'Not set'}`);
      console.log(`   Fixed Lot: ${follower.fixed_lot || 'Not set'}`);
      console.log(`   Copy Ratio: ${follower.copy_ratio || 'Not set'}`);
      console.log(`   Copy Position Close: ${follower.copy_position_close || 'Not set'}`);
      
      // 2. Update follower settings to enable position closing
      console.log('   🔧 Updating settings to enable position closing...');
      
      const { error: updateError } = await supabase
        .from('followers')
        .update({
          copy_position_close: true,
          copy_mode: follower.copy_mode || 'fixed_lot',
          fixed_lot: follower.fixed_lot || 1
        })
        .eq('id', follower.id);

      if (updateError) {
        console.log('   ❌ Error updating settings:', updateError);
      } else {
        console.log('   ✅ Settings updated successfully');
      }
    }

    // 3. Check if copy_position_close column exists
    console.log('\n2. Checking database schema...');
    
    const { data: columns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'followers')
      .eq('column_name', 'copy_position_close');

    if (schemaError) {
      console.log('❌ Error checking schema:', schemaError);
    } else if (!columns || columns.length === 0) {
      console.log('❌ copy_position_close column does not exist');
      console.log('   🔧 Adding copy_position_close column...');
      
      // Add the column
      const { error: addColumnError } = await supabase.rpc('add_copy_position_close_column');
      
      if (addColumnError) {
        console.log('   ❌ Error adding column:', addColumnError);
      } else {
        console.log('   ✅ Column added successfully');
      }
    } else {
      console.log('✅ copy_position_close column exists');
    }

    // 4. Verify updated settings
    console.log('\n3. Verifying updated settings...');
    
    const { data: updatedFollowers, error: verifyError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (verifyError) {
      console.log('❌ Error verifying settings:', verifyError);
    } else {
      for (const follower of updatedFollowers) {
        console.log(`\n✅ ${follower.follower_name}:`);
        console.log(`   Copy Position Close: ${follower.copy_position_close ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`   Copy Mode: ${follower.copy_mode || 'Not set'}`);
        console.log(`   Fixed Lot: ${follower.fixed_lot || 'Not set'}`);
      }
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkFollowerSettings(); 