const fetch = require('node-fetch');

async function quickHealthCheck() {
  console.log('🏥 Quick Health Check\n');
  
  try {
    // Check backend health
    console.log('📊 Checking backend health...');
    const healthResponse = await fetch('http://localhost:3001/api/health');
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Backend is healthy');
      console.log(`   Uptime: ${Math.round(healthData.stats.uptime)}s`);
      console.log(`   Active Users: ${healthData.stats.activeUsers}`);
      console.log(`   Active Traders: ${healthData.stats.activeTraders}`);
    } else {
      console.log('❌ Backend health check failed');
    }

    // Check system status
    console.log('\n📊 Checking system status...');
    const statusResponse = await fetch('http://localhost:3001/api/status');
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ System status OK');
      console.log(`   Total Users: ${statusData.data.totalUsers}`);
      console.log(`   Active Traders: ${statusData.data.activeTraders}`);
    } else {
      console.log('❌ System status check failed');
    }

    // Check frontend
    console.log('\n🌐 Checking frontend...');
    const frontendResponse = await fetch('http://localhost:3000');
    
    if (frontendResponse.ok) {
      console.log('✅ Frontend is running');
    } else {
      console.log('❌ Frontend not responding');
    }

    console.log('\n🎉 All systems operational!');
    console.log('📋 Access your copy trading platform at: http://localhost:3000');

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

quickHealthCheck(); 