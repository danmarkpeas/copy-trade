const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateFollowerCredentials() {
  console.log('🔧 FOLLOWER API CREDENTIALS UPDATE TOOL');
  console.log('=======================================\n');

  try {
    // Get all active followers
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (error) {
      console.error('❌ Error fetching followers:', error);
      return;
    }

    if (!followers || followers.length === 0) {
      console.error('❌ No active followers found');
      return;
    }

    console.log(`📊 Found ${followers.length} active followers:\n`);

    followers.forEach((follower, index) => {
      console.log(`${index + 1}. ${follower.follower_name}`);
      console.log(`   Current API Key: ${follower.api_key ? `${follower.api_key.substring(0, 8)}...${follower.api_key.substring(follower.api_key.length - 4)}` : 'NOT SET'}`);
      console.log(`   Current API Secret: ${follower.api_secret ? '***SET***' : 'NOT SET'}`);
      console.log('');
    });

    console.log('💡 INSTRUCTIONS:');
    console.log('================');
    console.log('1. Generate new API keys from Delta Exchange for each follower');
    console.log('2. Ensure the API keys have trading permissions enabled');
    console.log('3. Add your IP address (106.222.225.84) to the API key whitelist');
    console.log('4. Use the update functions below to set the new credentials');
    console.log('');
    console.log('🔗 Generate API Keys: https://www.delta.exchange/app/account/manageapikeys');
    console.log('');

    // Example update functions
    console.log('📝 EXAMPLE UPDATE FUNCTIONS:');
    console.log('============================');
    console.log('');
    console.log('// Update Anneshan credentials');
    console.log('await updateAnneshanCredentials("NEW_API_KEY", "NEW_API_SECRET");');
    console.log('');
    console.log('// Update Gau credentials');
    console.log('await updateGauCredentials("NEW_API_KEY", "NEW_API_SECRET");');
    console.log('');
    console.log('// Update Anne credentials');
    console.log('await updateAnneCredentials("NEW_API_KEY", "NEW_API_SECRET");');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function updateAnneshanCredentials(apiKey, apiSecret) {
  console.log('🔄 Updating Anneshan API credentials...');
  
  try {
    const { data, error } = await supabase
      .from('followers')
      .update({
        api_key: apiKey,
        api_secret: apiSecret,
        updated_at: new Date().toISOString()
      })
      .eq('follower_name', 'Anneshan')
      .select();

    if (error) {
      console.error('❌ Error updating Anneshan:', error);
      return false;
    }

    console.log('✅ Anneshan credentials updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating Anneshan:', error.message);
    return false;
  }
}

async function updateGauCredentials(apiKey, apiSecret) {
  console.log('🔄 Updating Gau API credentials...');
  
  try {
    const { data, error } = await supabase
      .from('followers')
      .update({
        api_key: apiKey,
        api_secret: apiSecret,
        updated_at: new Date().toISOString()
      })
      .eq('follower_name', 'Gau')
      .select();

    if (error) {
      console.error('❌ Error updating Gau:', error);
      return false;
    }

    console.log('✅ Gau credentials updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating Gau:', error.message);
    return false;
  }
}

async function updateAnneCredentials(apiKey, apiSecret) {
  console.log('🔄 Updating Anne API credentials...');
  
  try {
    const { data, error } = await supabase
      .from('followers')
      .update({
        api_key: apiKey,
        api_secret: apiSecret,
        updated_at: new Date().toISOString()
      })
      .eq('follower_name', 'Anne')
      .select();

    if (error) {
      console.error('❌ Error updating Anne:', error);
      return false;
    }

    console.log('✅ Anne credentials updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating Anne:', error.message);
    return false;
  }
}

async function updateAllCredentials(credentials) {
  console.log('🔄 Updating all follower credentials...');
  
  const results = {};
  
  if (credentials.anneshan) {
    results.anneshan = await updateAnneshanCredentials(
      credentials.anneshan.apiKey,
      credentials.anneshan.apiSecret
    );
  }
  
  if (credentials.gau) {
    results.gau = await updateGauCredentials(
      credentials.gau.apiKey,
      credentials.gau.apiSecret
    );
  }
  
  if (credentials.anne) {
    results.anne = await updateAnneCredentials(
      credentials.anne.apiKey,
      credentials.anne.apiSecret
    );
  }
  
  console.log('\n📊 UPDATE SUMMARY:');
  console.log('==================');
  
  Object.entries(results).forEach(([name, success]) => {
    console.log(`${name}: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
  });
  
  return results;
}

// Export functions for use
module.exports = {
  updateAnneshanCredentials,
  updateGauCredentials,
  updateAnneCredentials,
  updateAllCredentials
};

// Run the tool if called directly
if (require.main === module) {
  updateFollowerCredentials();
} 