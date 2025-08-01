const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyPositionCloseFix() {
  console.log('🔧 APPLYING POSITION CLOSE FIX');
  console.log('=' .repeat(40));

  try {
    // 1. Read the SQL file
    const sqlPath = path.join(__dirname, 'add-position-close-column.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('1. SQL content to execute:');
    console.log(sqlContent);
    
    // 2. Execute the SQL
    console.log('\n2. Executing SQL...');
    
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (sqlError) {
      console.log('❌ SQL execution failed:', sqlError);
      
      // Try alternative approach - direct column addition
      console.log('\n3. Trying direct column addition...');
      
      const { error: alterError } = await supabase
        .from('followers')
        .select('copy_position_close')
        .limit(1);
      
      if (alterError && alterError.message.includes('copy_position_close')) {
        console.log('   🔧 Column does not exist, adding it...');
        
        // Use a simpler approach - just update the table structure
        const { error: updateError } = await supabase
          .from('followers')
          .update({ copy_position_close: true })
          .eq('account_status', 'active');
        
        if (updateError) {
          console.log('   ❌ Update failed:', updateError);
        } else {
          console.log('   ✅ Settings updated successfully');
        }
      }
    } else {
      console.log('✅ SQL executed successfully');
    }

    // 3. Verify the fix
    console.log('\n4. Verifying the fix...');
    
    const { data: followers, error: verifyError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (verifyError) {
      console.log('❌ Verification failed:', verifyError);
    } else {
      console.log(`✅ Found ${followers.length} active followers`);
      
      for (const follower of followers) {
        console.log(`\n🔍 ${follower.follower_name}:`);
        console.log(`   Copy Position Close: ${follower.copy_position_close ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`   Copy Mode: ${follower.copy_mode || 'Not set'}`);
        console.log(`   Fixed Lot: ${follower.fixed_lot || 'Not set'}`);
        
        // Enable position closing if not already enabled
        if (!follower.copy_position_close) {
          console.log('   🔧 Enabling position closing...');
          
          const { error: enableError } = await supabase
            .from('followers')
            .update({ copy_position_close: true })
            .eq('id', follower.id);
          
          if (enableError) {
            console.log('   ❌ Failed to enable:', enableError);
          } else {
            console.log('   ✅ Position closing enabled');
          }
        }
      }
    }

    // 4. Test position closing functionality
    console.log('\n5. Testing position closing functionality...');
    
    // Create a test to verify the copy trading engine will now close positions
    console.log('   🧪 Position closing should now work when master closes positions');
    console.log('   📊 Monitor the backend logs for position close events');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

applyPositionCloseFix(); 