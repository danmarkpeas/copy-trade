const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseSchema() {
  console.log('🔍 CHECKING DATABASE SCHEMA');
  console.log('==========================\n');

  try {
    // Check followers table structure
    console.log('📊 Followers Table Structure:');
    console.log('=============================');
    
    const { data: followers, error: followerError } = await supabase
      .from('followers')
      .select('*')
      .limit(1);

    if (followerError) {
      console.error('❌ Error accessing followers table:', followerError);
    } else if (followers && followers.length > 0) {
      const follower = followers[0];
      console.log('✅ Followers table columns:');
      Object.keys(follower).forEach(column => {
        console.log(`   - ${column}: ${typeof follower[column]} (${follower[column]})`);
      });
    }

    console.log('\n📊 Copy Trades Table Structure:');
    console.log('================================');
    
    const { data: copyTrades, error: copyError } = await supabase
      .from('copy_trades')
      .select('*')
      .limit(1);

    if (copyError) {
      console.error('❌ Error accessing copy_trades table:', copyError);
    } else if (copyTrades && copyTrades.length > 0) {
      const copyTrade = copyTrades[0];
      console.log('✅ Copy trades table columns:');
      Object.keys(copyTrade).forEach(column => {
        console.log(`   - ${column}: ${typeof copyTrade[column]} (${copyTrade[column]})`);
      });
    }

    console.log('\n📊 Broker Accounts Table Structure:');
    console.log('====================================');
    
    const { data: brokers, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .limit(1);

    if (brokerError) {
      console.error('❌ Error accessing broker_accounts table:', brokerError);
    } else if (brokers && brokers.length > 0) {
      const broker = brokers[0];
      console.log('✅ Broker accounts table columns:');
      Object.keys(broker).forEach(column => {
        console.log(`   - ${column}: ${typeof broker[column]} (${broker[column]})`);
      });
    }

    // Check for missing columns
    console.log('\n🔍 MISSING COLUMNS ANALYSIS');
    console.log('===========================');
    
    if (followers && followers.length > 0) {
      const follower = followers[0];
      const expectedColumns = [
        'master_broker_id',
        'fixed_amount',
        'copy_mode'
      ];
      
      expectedColumns.forEach(column => {
        if (!(column in follower)) {
          console.log(`❌ Missing column in followers table: ${column}`);
        } else {
          console.log(`✅ Column exists in followers table: ${column}`);
        }
      });
    }

    if (copyTrades && copyTrades.length > 0) {
      const copyTrade = copyTrades[0];
      const expectedColumns = [
        'follower_name',
        'master_trade_id',
        'master_broker_id',
        'follower_id',
        'follower_order_id'
      ];
      
      expectedColumns.forEach(column => {
        if (!(column in copyTrade)) {
          console.log(`❌ Missing column in copy_trades table: ${column}`);
        } else {
          console.log(`✅ Column exists in copy_trades table: ${column}`);
        }
      });
    }

    console.log('\n📋 RECOMMENDATIONS');
    console.log('==================');
    console.log('1. The database schema needs to be updated');
    console.log('2. Missing columns need to be added');
    console.log('3. For now, we can work with existing columns');
    console.log('4. The system will use available columns for functionality');

  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  }
}

checkDatabaseSchema().catch(console.error); 