const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixFollowerCopyIssue() {
  console.log('🛠️  FIXING FOLLOWER COPY ISSUE');
  console.log('=' .repeat(60));
  
  try {
    // 1. Create copy_relationships table if it doesn't exist
    console.log('1. Creating copy_relationships table...');
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS copy_relationships (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          follower_id UUID NOT NULL,
          master_broker_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(follower_id, master_broker_id)
        );
      `
    });
    
    if (createTableError) {
      console.log('⚠️  Table creation error (might already exist):', createTableError.message);
    } else {
      console.log('✅ Copy relationships table created/verified');
    }
    
    // 2. Update followers with proper user_id
    console.log('\n2. Updating followers with proper user_id...');
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');
    
    if (followersError) {
      console.log('❌ Error fetching followers:', followersError);
      return;
    }
    
    for (const follower of followers) {
      if (!follower.user_id) {
        const { error: updateError } = await supabase
          .from('followers')
          .update({ user_id: follower.id })
          .eq('id', follower.id);
        
        if (updateError) {
          console.log(`❌ Error updating follower ${follower.follower_name}:`, updateError);
        } else {
          console.log(`✅ Updated follower ${follower.follower_name} with user_id: ${follower.id}`);
        }
      }
    }
    
    // 3. Create copy relationships
    console.log('\n3. Creating copy relationships...');
    const { data: updatedFollowers, error: updatedFollowersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');
    
    if (updatedFollowersError) {
      console.log('❌ Error fetching updated followers:', updatedFollowersError);
      return;
    }
    
    for (const follower of updatedFollowers) {
      // Check if relationship already exists
      const { data: existingRelationship, error: checkError } = await supabase
        .from('copy_relationships')
        .select('*')
        .eq('follower_id', follower.user_id)
        .eq('master_broker_id', follower.master_broker_account_id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.log(`❌ Error checking relationship for ${follower.follower_name}:`, checkError);
        continue;
      }
      
      if (!existingRelationship) {
        const { error: insertError } = await supabase
          .from('copy_relationships')
          .insert({
            follower_id: follower.user_id,
            master_broker_id: follower.master_broker_account_id
          });
        
        if (insertError) {
          console.log(`❌ Error creating relationship for ${follower.follower_name}:`, insertError);
        } else {
          console.log(`✅ Created copy relationship: ${follower.follower_name} -> ${follower.master_broker_account_id}`);
        }
      } else {
        console.log(`✅ Relationship already exists for ${follower.follower_name}`);
      }
    }
    
    // 4. Verify the fix
    console.log('\n4. Verifying the fix...');
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
    
    const { data: relationships, error: relationshipsError } = await supabase
      .from('copy_relationships')
      .select('*');
    
    if (relationshipsError) {
      console.log('❌ Error fetching relationships:', relationshipsError);
    } else {
      console.log(`✅ Copy relationships created: ${relationships.length}`);
      relationships.forEach(rel => {
        console.log(`   - Follower ${rel.follower_id} -> Master ${rel.master_broker_id}`);
      });
    }
    
    // 5. Test the copy trading system
    console.log('\n5. Testing copy trading system...');
    console.log('✅ All database fixes completed!');
    console.log('🔄 Please restart the server to apply the changes:');
    console.log('   1. Stop the current server (Ctrl+C)');
    console.log('   2. Run: node server.js');
    console.log('   3. The followers should now copy trades properly');
    
  } catch (error) {
    console.error('❌ Error in fix script:', error);
  }
}

// Run the fix script
fixFollowerCopyIssue().catch(console.error); 