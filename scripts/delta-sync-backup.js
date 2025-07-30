// scripts/delta-sync.js
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DELTA_API_URL = 'https://api.india.delta.exchange';

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

function getDeltaSignature(method, path, body, nonce, apiSecret) {
  const crypto = require('crypto');
  const message = method + nonce + path + body;
  return crypto.createHmac('sha256', apiSecret).update(message).digest('hex');
}

async function fetchDeltaPositions(broker) {
  const method = 'GET';
  const path = '/v2/positions/margined';
  const url = DELTA_API_URL + path;
  const nonce = Math.floor(Date.now() / 1000).toString();
  const body = '';
  const signature = getDeltaSignature(method, path, body, nonce, broker.api_secret);
  const res = await fetch(url, {
    method,
    headers: {
      'api-key': broker.api_key,
      'timestamp': nonce,
      'signature': signature,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('Delta API error: ' + (await res.text()));
  const data = await res.json();
  return data.result || [];
}

async function fetchDeltaClosedOrders(user_id, product_id) {
  // Fetch closed orders for a user and product from Delta Exchange
  const method = 'GET';
  const path = `/v2/orders/history?user_id=${user_id}&product_id=${product_id}&state=closed`;
  const url = DELTA_API_URL + `/v2/orders/history?user_id=${user_id}&product_id=${product_id}&state=closed`;
  const nonce = Math.floor(Date.now() / 1000).toString();
  const body = '';
  const signature = getDeltaSignature(method, `/v2/orders/history`, body, nonce);
  const res = await fetch(url, {
    method,
    headers: {
      'api-key': DELTA_API_KEY,
      'timestamp': nonce,
      'signature': signature,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    console.error('Delta API error (closed orders):', await res.text());
    return [];
  }
  const data = await res.json();
  return data.result || [];
}

async function fetchDeltaFills(broker) {
  const method = 'GET';
  const path = `/v2/fills?user_id=${broker.account_uid}`;
  const url = DELTA_API_URL + path;
  const nonce = Math.floor(Date.now() / 1000).toString();
  const body = '';
  const signature = getDeltaSignature(method, path, body, nonce, broker.api_secret);
  const res = await fetch(url, {
    method,
    headers: {
      'api-key': broker.api_key,
      'timestamp': nonce,
      'signature': signature,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    console.error('Delta API error (fills):', await res.text());
    return [];
  }
  const data = await res.json();
  return data.result || [];
}

// Specify the Delta user IDs you want to sync history for
const USER_IDS = [54678948]; // <-- Replace with your actual Delta user ID(s)

async function main() {
  const brokers = await getActiveBrokerAccounts();
  for (const broker of brokers) {
    // 1. Fetch open positions from Delta India for this broker
    const positions = await fetchDeltaPositions(broker);
    console.log(`[${broker.account_name}] Fetched open positions:`, positions);
    // Upsert only open positions in 'trades' table
    for (const position of positions) {
      const uniqueId = `${position.user_id}_${position.product_id}`;
      if (!position.product_id || !position.user_id) {
        console.log('No product_id or user_id, skipping:', position);
        continue;
      }
      // Check if position already exists in Supabase (by position_key)
      const { data: existing } = await supabase.from('trades').select('id').eq('position_key', uniqueId).single();
      if (existing) {
        await supabase.from('trades').update({
          quantity: position.size,
          price: position.entry_price,
          status: 'open',
          created_at: position.created_at || new Date().toISOString(),
        }).eq('id', existing.id);
        continue;
      }
      let action = 'buy';
      if (position.side && (position.side.toLowerCase() === 'buy' || position.side.toLowerCase() === 'sell')) {
        action = position.side.toLowerCase();
      }
      const trade = {
        position_key: uniqueId,
        trader_id: null,
        asset: position.product_symbol,
        action,
        quantity: position.size,
        price: position.entry_price,
        status: 'open',
        created_at: position.created_at || new Date().toISOString(),
      };
      const { error } = await supabase.from('trades').insert(trade);
      if (error) {
        console.error('Insert error:', error.message, trade);
      }
    }
    // 2. Always sync trade history (fills) for this broker
    const fills = await fetchDeltaFills(broker);
    for (const fill of fills) {
      const { data: existing } = await supabase
        .from('trade_history')
        .select('id')
        .eq('order_id', String(fill.order_id))
        .eq('created_at', fill.created_at)
        .single();
      if (existing) continue;
      const historyRow = {
        user_id: null,
        delta_user_id: broker.account_uid,
        product_id: fill.product_id,
        product_symbol: fill.product_symbol,
        side: fill.side,
        size: fill.size,
        price: fill.price,
        order_type: fill.order_type || null,
        state: fill.state || null,
        avg_fill_price: fill.avg_fill_price || null,
        order_id: String(fill.order_id),
        created_at: fill.created_at || new Date().toISOString(),
      };
      const { error } = await supabase.from('trade_history').upsert(historyRow, { onConflict: 'order_id' });
      if (error) {
        console.error('Upsert error (trade_history):', error, historyRow);
      }
    }
    // 3. Mark trades as closed if they are no longer open on Delta for this broker
    const { data: openTrades, error: openTradesError } = await supabase
      .from('trades')
      .select('id, position_key, status')
      .eq('status', 'open');
    if (!openTradesError) {
      const openPositionKeys = new Set(positions.map(p => `${p.user_id}_${p.product_id}`));
      for (const trade of openTrades) {
        if (!openPositionKeys.has(trade.position_key)) {
          await supabase.from('trades').update({ status: 'closed' }).eq('id', trade.id);
        }
      }
    }
    console.log(`[${broker.account_name}] Open position sync complete.`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 