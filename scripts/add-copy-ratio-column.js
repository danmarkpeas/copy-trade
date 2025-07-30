const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function addCopyRatioColumn() {
  console.log('🔧 ADDING COPY_RATIO COLUMN TO FOLLOWERS TABLE\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // First, let's check the current table structure
    console.log('📋 Checking current followers table structure...');
    const { data: followers, error: checkError } = await supabase
      .from('followers')
      .select('*')
      .limit(1);

    if (checkError) {
      console.log('❌ Error checking table:', checkError);
      return;
    }

    console.log('✅ Table structure check passed');

    // Try to add the copy_ratio column using raw SQL
    console.log('\n🔧 Adding copy_ratio column...');
    const { data: alterResult, error: alterError } = await supabase
      .rpc('exec_sql', {
        sql: `
          ALTER TABLE followers 
          ADD COLUMN IF NOT EXISTS copy_ratio DECIMAL(5,4) DEFAULT 0.1;
        `
      });

    if (alterError) {
      console.log('❌ Error adding column:', alterError);
      console.log('🔧 Trying alternative approach...');
      
      // Try to update existing followers with copy_ratio field
      const { data: updateResult, error: updateError } = await supabase
        .from('followers')
        .update({ copy_ratio: 0.1 })
        .eq('follower_name', 'Anneshan')
        .select();

      if (updateError) {
        console.log('❌ Error updating follower:', updateError);
        console.log('💡 The copy_ratio column may not exist yet');
        return;
      }

      console.log('✅ Updated follower with copy_ratio');
    } else {
      console.log('✅ Column added successfully');
    }

    // Update followers with appropriate copy ratios
    console.log('\n🔧 Updating followers with copy ratios...');
    const { data: updateResult, error: updateError } = await supabase
      .from('followers')
      .update({ copy_ratio: 0.1 })
      .eq('copy_mode', 'multiplier')
      .select();

    if (updateError) {
      console.log('❌ Error updating followers:', updateError);
    } else {
      console.log('✅ Updated followers with copy ratios');
    }

    // Verify the changes
    console.log('\n🔍 Verifying changes...');
    const { data: verifyFollowers, error: verifyError } = await supabase
      .from('followers')
      .select('follower_name, copy_mode, copy_ratio, account_status')
      .eq('follower_name', 'Anneshan');

    if (verifyError) {
      console.log('❌ Error verifying changes:', verifyError);
    } else {
      console.log('✅ Verification successful:');
      verifyFollowers.forEach(follower => {
        console.log(`   ${follower.follower_name}:`);
        console.log(`     Copy Mode: ${follower.copy_mode}`);
        console.log(`     Copy Ratio: ${follower.copy_ratio}`);
        console.log(`     Status: ${follower.account_status}`);
      });
    }

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. ✅ Copy ratio column added/updated');
    console.log('2. 🔄 Restart the copy trading engine');
    console.log('3. 📊 Place a new trade on the master account');
    console.log('4. 👀 Watch for copy trades to be executed');

  } catch (error) {
    console.log('❌ Error adding copy ratio column:', error.message);
  }
}

addCopyRatioColumn().catch(console.error); 