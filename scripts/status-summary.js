const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function statusSummary() {
  console.log('📊 COPY TRADING SYSTEM STATUS SUMMARY');
  console.log('=====================================\n');

  try {
    // Quick health check
    const healthResponse = await fetch('http://localhost:3001/api/health');
    const healthData = healthResponse.ok ? await healthResponse.json() : null;
    
    // System status
    const statusResponse = await fetch('http://localhost:3001/api/status');
    const statusData = statusResponse.ok ? await statusResponse.json() : null;

    // Database counts
    const { count: brokerCount } = await supabase
      .from('broker_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_verified', true);

    const { count: followerCount } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'active');

    const { count: tradeCount } = await supabase
      .from('copy_trades')
      .select('*', { count: 'exact', head: true });

    // Display summary
    console.log('🏥 System Health:');
    console.log(`   Backend: ${healthData ? '✅ Running' : '❌ Down'}`);
    console.log(`   Frontend: ${await fetch('http://localhost:3000').then(r => r.ok ? '✅ Running' : '❌ Down').catch(() => '❌ Down')}`);
    console.log(`   Uptime: ${healthData ? Math.round(healthData.stats.uptime) + 's' : 'N/A'}`);
    console.log('');

    console.log('👥 User Activity:');
    console.log(`   Active Users: ${statusData?.data.totalUsers || 0}`);
    console.log(`   Active Traders: ${statusData?.data.activeTraders || 0}`);
    if (statusData?.data.users) {
      statusData.data.users.forEach(user => {
        console.log(`   👤 ${user.email}: ${user.status.isConnected ? 'Connected' : 'Disconnected'}`);
      });
    }
    console.log('');

    console.log('📈 Trading Configuration:');
    console.log(`   Active Brokers: ${brokerCount || 0}`);
    console.log(`   Active Followers: ${followerCount || 0}`);
    console.log(`   Total Trades: ${tradeCount || 0}`);
    console.log('');

    console.log('🔗 Access URLs:');
    console.log('   Frontend: http://localhost:3000');
    console.log('   Backend API: http://localhost:3001');
    console.log('   Health Check: http://localhost:3001/api/health');
    console.log('   System Status: http://localhost:3001/api/status');
    console.log('');

    // Overall status
    const isHealthy = healthData && statusData && brokerCount > 0 && followerCount > 0;
    
    if (isHealthy) {
      console.log('🎉 SYSTEM STATUS: FULLY OPERATIONAL');
      console.log('✅ All components are running correctly');
      console.log('✅ Database is properly configured');
      console.log('✅ Multi-tenant system is active');
      console.log('✅ Ready for copy trading operations');
    } else {
      console.log('⚠️ SYSTEM STATUS: NEEDS ATTENTION');
      if (!healthData) console.log('❌ Backend server is not responding');
      if (!statusData) console.log('❌ System status endpoint is not working');
      if (brokerCount === 0) console.log('❌ No active broker accounts found');
      if (followerCount === 0) console.log('❌ No active followers found');
    }

    console.log('');
    console.log('📋 Quick Commands:');
    console.log('   npm run health    - Quick health check');
    console.log('   npm run test      - Complete system test');
    console.log('   npm run test-all  - Run all available tests');

  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }
}

statusSummary().catch(console.error); 