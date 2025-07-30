const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugCloseOrderSchema() {
  console.log('🔍 DEBUGGING CLOSE ORDER SCHEMA\n');
  
  // Supabase setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Load follower
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (error || !followers || followers.length === 0) {
      throw new Error('No active followers found');
    }
    
    const follower = followers[0];
    console.log(`✅ Follower: ${follower.follower_name}`);
    
    // Get the position details
    const position = await getPositionByProductId(follower, 39943);
    
    if (position && position.size !== 0) {
      console.log(`\n📊 Position Details:`);
      console.log(`   Product ID: ${position.product_id}`);
      console.log(`   Symbol: ${position.product_symbol}`);
      console.log(`   Size: ${position.size}`);
      console.log(`   Side: ${position.size > 0 ? 'BUY' : 'SELL'}`);
      console.log(`   Entry Price: ${position.entry_price}`);
      
      // Test different order schemas
      console.log(`\n🧪 Testing different order schemas...`);
      
      // Schema 1: Basic order
      console.log(`\n📋 Schema 1: Basic order`);
      const schema1 = {
        product_id: position.product_id,
        size: Math.abs(position.size),
        side: position.size > 0 ? 'sell' : 'buy',
        order_type: 'market_order'
      };
      console.log(`   Order data:`, JSON.stringify(schema1, null, 2));
      const result1 = await testOrderSchema(follower, schema1);
      console.log(`   Result:`, result1.success ? '✅ Success' : `❌ ${result1.error}`);
      
      // Schema 2: With time_in_force
      console.log(`\n📋 Schema 2: With time_in_force`);
      const schema2 = {
        product_id: position.product_id,
        size: Math.abs(position.size),
        side: position.size > 0 ? 'sell' : 'buy',
        order_type: 'market_order',
        time_in_force: 'good_til_cancelled'
      };
      console.log(`   Order data:`, JSON.stringify(schema2, null, 2));
      const result2 = await testOrderSchema(follower, schema2);
      console.log(`   Result:`, result2.success ? '✅ Success' : `❌ ${result2.error}`);
      
      // Schema 3: With reduce_only flag
      console.log(`\n📋 Schema 3: With reduce_only flag`);
      const schema3 = {
        product_id: position.product_id,
        size: Math.abs(position.size),
        side: position.size > 0 ? 'sell' : 'buy',
        order_type: 'market_order',
        time_in_force: 'good_til_cancelled',
        reduce_only: true
      };
      console.log(`   Order data:`, JSON.stringify(schema3, null, 2));
      const result3 = await testOrderSchema(follower, schema3);
      console.log(`   Result:`, result3.success ? '✅ Success' : `❌ ${result3.error}`);
      
      // Schema 4: Integer size
      console.log(`\n📋 Schema 4: Integer size`);
      const schema4 = {
        product_id: position.product_id,
        size: parseInt(Math.abs(position.size)),
        side: position.size > 0 ? 'sell' : 'buy',
        order_type: 'market_order',
        time_in_force: 'good_til_cancelled'
      };
      console.log(`   Order data:`, JSON.stringify(schema4, null, 2));
      const result4 = await testOrderSchema(follower, schema4);
      console.log(`   Result:`, result4.success ? '✅ Success' : `❌ ${result4.error}`);
      
    } else {
      console.log(`❌ No open position found`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function getPositionByProductId(follower, productId) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = `/v2/positions?product_id=${productId}`;
    const message = `GET${timestamp}${path}`;
    const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

    const response = await fetch(`${DELTA_API_URL}${path}`, {
      method: 'GET',
      headers: {
        'api-key': follower.api_key,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success && data.result) {
      const positions = Array.isArray(data.result) ? data.result : [data.result];
      return positions.find(pos => pos.size !== 0) || null;
    } else {
      console.log(`❌ Failed to get position:`, data);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error getting position:`, error.message);
    return null;
  }
}

async function testOrderSchema(follower, orderData) {
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/v2/orders';
    
    const body = JSON.stringify(orderData);
    const message = `POST${timestamp}${path}${body}`;
    const signature = require('crypto').createHmac('sha256', follower.api_secret).update(message).digest('hex');

    const response = await fetch(`${DELTA_API_URL}${path}`, {
      method: 'POST',
      headers: {
        'api-key': follower.api_key,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'Content-Type': 'application/json'
      },
      body: body
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        order_id: data.result?.id,
        status: data.result?.state
      };
    } else {
      return {
        success: false,
        error: data.error?.message || data.error || 'Unknown error',
        details: data
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      type: 'network_error'
    };
  }
}

debugCloseOrderSchema().catch(console.error); 