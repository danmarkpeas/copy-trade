const WebSocket = require('ws');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DELTA_WS_URL = 'wss://socket.delta.exchange';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getActiveBrokerAccounts() {
  const { data, error } = await supabase
    .from('broker_accounts')
    .select('*')
    .eq('is_active', true)
    .eq('broker_name', 'Delta Exchange'); // Only Delta for now
  if (error) throw error;
  return data;
}

function getAuthPayload(apiKey, apiSecret) {
  const timestamp = Date.now();
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(timestamp + apiKey)
    .digest('hex');
  return {
    type: 'auth',
    payload: {
      api_key: apiKey,
      timestamp,
      signature,
    },
  };
}

function getAuthPayloadVariants(apiKey, apiSecret) {
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const variants = [];
  [nowMs, nowSec].forEach((timestamp) => {
    const sig1 = crypto.createHmac('sha256', apiSecret).update(String(timestamp) + apiKey).digest('hex');
    const sig2 = crypto.createHmac('sha256', apiSecret).update(apiKey + String(timestamp)).digest('hex');
    variants.push({
      type: 'auth',
      payload: { api_key: apiKey, timestamp, signature: sig1 },
    });
    variants.push({
      type: 'auth',
      payload: { api_key: apiKey, timestamp, signature: sig2 },
    });
  });
  return variants;
}

function subscribePositions() {
  return {
    type: 'subscribe',
    payload: {
      channels: [{ name: 'v2/user_positions' }],
    },
  };
}

function subscribeTicker() {
  return {
    type: 'subscribe',
    payload: {
      channels: [{ name: 'v2/ticker', symbols: ['BTCUSD'] }],
    },
  };
}

function upsertPosition(position) {
  const uniqueId = `${position.user_id}_${position.product_id}`;
  let action = 'buy';
  if (position.side && (position.side.toLowerCase() === 'buy' || position.side.toLowerCase() === 'sell')) {
    action = position.side.toLowerCase();
  }
  supabase.from('trades').select('id').eq('position_key', uniqueId).single().then(({ data: existing }) => {
    if (existing) {
      supabase.from('trades').update({
        quantity: position.size,
        price: position.entry_price,
        status: 'open',
        created_at: position.created_at || new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      supabase.from('trades').insert({
        position_key: uniqueId,
        trader_id: null,
        asset: position.product_symbol,
        action,
        quantity: position.size,
        price: position.entry_price,
        status: 'open',
        created_at: position.created_at || new Date().toISOString(),
      });
    }
  });
}

function closePosition(position) {
  const uniqueId = `${position.user_id}_${position.product_id}`;
  supabase.from('trades').update({ status: 'closed' }).eq('position_key', uniqueId);
}

async function runForBroker(broker) {
  let ws;
  function connect() {
    ws = new WebSocket(DELTA_WS_URL, {
      headers: { Origin: 'https://www.delta.exchange' },
    });
    ws.on('open', () => {
      console.log(`[${broker.account_name}] Delta WS connected`);
      const tickerSub = subscribeTicker();
      ws.send(JSON.stringify(tickerSub));
      const authVariants = getAuthPayloadVariants(broker.api_key, broker.api_secret);
      authVariants.forEach((authPayload, i) => {
        setTimeout(() => {
          ws.send(JSON.stringify(authPayload));
        }, (i + 1) * 500);
      });
    });
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'auth') {
          if (msg.success) {
            const subPayload = subscribePositions();
            ws.send(JSON.stringify(subPayload));
          } else {
            ws.close();
          }
        } else if (msg.type === 'v2/user_positions') {
          if (msg.data && Array.isArray(msg.data)) {
            msg.data.forEach(upsertPosition);
          } else if (msg.data) {
            upsertPosition(msg.data);
          }
        } else if (msg.type === 'v2/user_positions_closed') {
          if (msg.data && Array.isArray(msg.data)) {
            msg.data.forEach(closePosition);
          } else if (msg.data) {
            closePosition(msg.data);
          }
        }
      } catch (err) {
        // Not all messages are JSON
      }
    });
    ws.on('close', () => {
      setTimeout(connect, 5000);
    });
    ws.on('error', () => {
      ws.close();
    });
    ws.on('unexpected-response', () => {
      ws.close();
    });
  }
  connect();
}

async function main() {
  const brokers = await getActiveBrokerAccounts();
  for (const broker of brokers) {
    runForBroker(broker);
  }
}

main(); 