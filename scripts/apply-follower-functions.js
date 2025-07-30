const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyFollowerFunctions() {
  console.log('🔧 Applying follower edit functions...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-missing-functions.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon to get individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.log(`❌ Error executing statement ${i + 1}:`, error.message);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      }
    }

    console.log('\n🎉 All follower functions applied successfully!');

    // Test the functions
    console.log('\n🧪 Testing the new functions...');
    
    // Test get_all_followers
    const { data: followers, error: followersError } = await supabase.rpc('get_all_followers');
    if (followersError) {
      console.log('❌ get_all_followers error:', followersError.message);
    } else {
      console.log(`✅ get_all_followers working - Found ${followers?.length || 0} followers`);
    }

    // Test get_follower_account_complete_details_with_platform
    if (followers && followers.length > 0) {
      const testFollower = followers[0];
      const { data: details, error: detailsError } = await supabase.rpc(
        'get_follower_account_complete_details_with_platform',
        {
          user_uuid: testFollower.user_id,
          follower_name_input: testFollower.follower_name
        }
      );
      
      if (detailsError) {
        console.log('❌ get_follower_account_complete_details_with_platform error:', detailsError.message);
      } else {
        console.log(`✅ get_follower_account_complete_details_with_platform working - Found ${details?.length || 0} details`);
        if (details && details.length > 0) {
          console.log('📊 Sample data loaded:');
          console.log(`   Copy Mode: ${details[0].copy_mode}`);
          console.log(`   Lot Size: ${details[0].lot_size}`);
          console.log(`   Multiplier: ${details[0].multiplier}`);
          console.log(`   Percentage: ${details[0].percentage}`);
          console.log(`   Fixed Lot: ${details[0].fixed_lot}`);
        }
      }
    }

  } catch (error) {
    console.log('❌ Error applying functions:', error.message);
  }
}

// Run the function
applyFollowerFunctions().then(() => {
  console.log('\n🎉 FOLLOWER FUNCTIONS SETUP COMPLETE');
  process.exit(0);
}).catch(error => {
  console.log('❌ Setup error:', error);
  process.exit(1);
}); 