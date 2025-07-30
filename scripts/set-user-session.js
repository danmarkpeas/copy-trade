const fetch = require('node-fetch');

async function setUserSession() {
  console.log('👤 SETTING USER SESSION');
  console.log('========================\n');

  try {
    // Set the user session
    const response = await fetch('http://localhost:3001/api/set-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'gauravcrd@gmail.com',
        user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ User session set successfully');
    console.log('📊 Response:', data);

    // Start the copy trading system
    console.log('\n🚀 STARTING COPY TRADING SYSTEM');
    console.log('================================\n');

    const startResponse = await fetch('http://localhost:3001/api/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: '29a36e2e-84e4-4998-8588-6ffb02a77890'
      })
    });

    if (!startResponse.ok) {
      throw new Error(`HTTP error! status: ${startResponse.status}`);
    }

    const startData = await startResponse.json();
    console.log('✅ Copy trading system started successfully');
    console.log('📊 Response:', startData);

    // Check the status after starting
    console.log('\n📊 CHECKING SYSTEM STATUS');
    console.log('=========================\n');

    const statusResponse = await fetch('http://localhost:3001/api/status');
    const statusData = await statusResponse.json();
    
    console.log('📈 System Status:', statusData.status);
    console.log('👥 Active Users:', statusData.activeUsers);
    console.log('📊 Active Traders:', statusData.activeTraders);
    console.log('🔗 WebSocket Status:', statusData.websocketStatus);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n🎉 User session setup completed!');
}

setUserSession().catch(console.error); 