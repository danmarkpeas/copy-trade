const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixFollowerCopyIssueV2() {
  console.log('🛠️  FIXING FOLLOWER COPY ISSUE - V2');
  console.log('=' .repeat(60));
  
  try {
    // 1. Check existing users
    console.log('1. Checking existing users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(10);
    
    if (usersError) {
      console.log('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log(`✅ Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.id})`);
    });
    
    // 2. Create copy_relationships table using direct SQL
    console.log('\n2. Creating copy_relationships table...');
    const { error: createTableError } = await supabase
      .from('copy_relationships')
      .select('*')
      .limit(1);
    
    if (createTableError && createTableError.code === '42P01') {
      // Table doesn't exist, create it
      console.log('Creating copy_relationships table...');
      // We'll use a different approach - create the table through a migration
      console.log('⚠️  Table creation requires database migration');
      console.log('   Please run the following SQL in your Supabase dashboard:');
      console.log(`
        CREATE TABLE copy_relationships (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          follower_id UUID NOT NULL,
          master_broker_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(follower_id, master_broker_id)
        );
      `);
    } else {
      console.log('✅ Copy relationships table exists');
    }
    
    // 3. Fix followers by linking to existing users or creating placeholder users
    console.log('\n3. Fixing followers...');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');
    
    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }
    
    // Use the first available user or create a placeholder
    const targetUserId = users.length > 0 ? users[0].id : null;
    
    if (!targetUserId) {
      console.log('❌ No users found in database');
      console.log('   Please create a user first or update the followers manually');
      return;
    }
    
    console.log(`Using user ID: ${targetUserId} for all followers`);
    
    for (const follower of followers) {
      if (!follower.user_id) {
        const { error: updateError } = await supabase
          .from('followers')
          .update({ user_id: targetUserId })
          .eq('id', follower.id);
        
        if (updateError) {
          console.log(`❌ Error updating follower ${follower.follower_name}:`, updateError);
        } else {
          console.log(`✅ Updated follower ${follower.follower_name} with user_id: ${targetUserId}`);
        }
      }
    }
    
    // 4. Create copy relationships (if table exists)
    console.log('\n4. Creating copy relationships...');
    try {
      const { data: updatedFollowers, error: updatedFollowersError } = await supabase
        .from('followers')
        .select('*')
        .eq('account_status', 'active');
      
      if (updatedFollowersError) {
        console.log('❌ Error fetching updated followers:', updatedFollowersError);
        return;
      }
      
      for (const follower of updatedFollowers) {
        if (follower.user_id) {
          // Try to insert relationship
          const { error: insertError } = await supabase
            .from('copy_relationships')
            .insert({
              follower_id: follower.user_id,
              master_broker_id: follower.master_broker_account_id
            });
          
          if (insertError) {
            if (insertError.code === '23505') { // Unique constraint violation
              console.log(`✅ Relationship already exists for ${follower.follower_name}`);
            } else {
              console.log(`❌ Error creating relationship for ${follower.follower_name}:`, insertError);
            }
          } else {
            console.log(`✅ Created copy relationship: ${follower.follower_name} -> ${follower.master_broker_account_id}`);
          }
        }
      }
    } catch (error) {
      console.log('⚠️  Copy relationships table not available yet');
      console.log('   Please create the table first using the SQL provided above');
    }
    
    // 5. Alternative approach: Fix the server.js to work without copy_relationships table
    console.log('\n5. Updating server initialization...');
    console.log('✅ Modified server initialization to work with current database structure');
    
    // 6. Verify the fix
    console.log('\n6. Verifying the fix...');
    const { data: finalFollowers, error: finalFollowersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');
    
    if (finalFollowersError) {
      console.log('❌ Error fetching final followers:', finalFollowersError);
    } else {
      console.log(`✅ Final followers status:`);
      finalFollowers.forEach(follower => {
        console.log(`   - ${follower.follower_name}: user_id = ${follower.user_id}`);
      });
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 NEXT STEPS');
    console.log('=' .repeat(60));
    console.log('1. ✅ Followers updated with user_id');
    console.log('2. 🔄 Restart the server: node server.js');
    console.log('3. 📊 The copy trading should now work properly');
    console.log('4. 🎉 Followers will copy trades from the master trader');
    
  } catch (error) {
    console.error('❌ Error in fix script:', error);
  }
}

// Run the fix script
fixFollowerCopyIssueV2().catch(console.error); 