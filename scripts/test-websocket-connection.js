const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testWebSocketConnection() {
  console.log('🧪 TESTING WEBSOCKET CONNECTION (INDIA DELTA EXCHANGE)\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const DELTA_WS_URL = 'wss://api.india.delta.exchange/ws';

  try {
    console.log('📋 STEP 1: Loading Master Account Credentials');
    
    // Get master broker account
    const { data: brokerAccounts, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (brokerError || !brokerAccounts || brokerAccounts.length === 0) {
      console.log('❌ No active master broker account found');
      return;
    }

    const masterAccount = brokerAccounts[0];
    console.log(`✅ Master account: ${masterAccount.account_name}`);
    console.log(`   API Key: ${masterAccount.api_key ? '✅ Set' : '❌ Missing'}`);
    console.log(`   API Secret: ${masterAccount.api_secret ? '✅ Set' : '❌ Missing'}`);

    if (!masterAccount.api_key || !masterAccount.api_secret) {
      console.log('❌ Master account missing API credentials');
      return;
    }

    console.log('\n📋 STEP 2: Testing WebSocket Connection');
    console.log(`🔌 Connecting to: ${DELTA_WS_URL}`);
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(DELTA_WS_URL);
      
      ws.on('open', () => {
        console.log('✅ WebSocket connection established successfully!');
        
        console.log('\n📋 STEP 3: Testing WebSocket Authentication');
        testWebSocketAuthentication(ws, masterAccount);
        
        // Close connection after testing
        setTimeout(() => {
          ws.close();
          console.log('\n✅ WebSocket connection test completed');
          resolve();
        }, 10000);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log('📥 Received message:', message);
          
          if (message.type === 'error') {
            console.log('❌ WebSocket error:', message.message);
          } else if (message.type === 'subscribed') {
            console.log('✅ Successfully subscribed to channel:', message.channel);
          }
        } catch (error) {
          console.log('📥 Received raw message:', data.toString());
        }
      });
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        reject(error);
      });
      
      ws.on('close', (code, reason) => {
        console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
      });
      
      // Timeout after 15 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('❌ WebSocket connection timeout');
          ws.close();
          reject(new Error('Connection timeout'));
        }
      }, 15000);
    });

  } catch (error) {
    console.error('❌ Error testing WebSocket connection:', error.message);
  }
}

function testWebSocketAuthentication(ws, masterAccount) {
  console.log('🔐 Testing authentication...');
  
  // Generate signature for fills subscription
  const timestamp = Math.floor(Date.now() / 1000);
  const channel = 'fills';
  const message = `subscribe${timestamp}${channel}`;
  const signature = require('crypto').createHmac('sha256', masterAccount.api_secret).update(message).digest('hex');
  
  const subscribeMessage = {
    type: 'subscribe',
    channel: channel,
    api_key: masterAccount.api_key,
    timestamp: timestamp,
    signature: signature
  };
  
  console.log('📤 Sending subscription message:', JSON.stringify(subscribeMessage, null, 2));
  ws.send(JSON.stringify(subscribeMessage));
  
  // Test ping/pong
  setTimeout(() => {
    console.log('🏓 Testing ping/pong...');
    ws.ping();
  }, 2000);
}

// Run the test
testWebSocketConnection().catch(console.error); 