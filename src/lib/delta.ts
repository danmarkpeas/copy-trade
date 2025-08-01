import crypto from 'crypto'

const DELTA_API_URL = 'https://api.india.delta.exchange';
const DELTA_API_KEY = process.env.NEXT_PUBLIC_DELTA_API_KEY!;
const DELTA_API_SECRET = process.env.NEXT_PUBLIC_DELTA_API_SECRET!;

function getDeltaSignature(path: string, body: string, nonce: string) {
  const message = path + nonce + body;
  return crypto.createHmac('sha256', DELTA_API_SECRET).update(message).digest('hex');
}

export async function fetchDeltaProducts() {
  const res = await fetch(`${DELTA_API_URL}/products`);
  return res.json();
}

export async function placeDeltaOrder({
  product_id,
  size,
  side,
  price,
  order_type = 'limit',
}: {
  product_id: number;
  size: number;
  side: 'buy' | 'sell';
  price: number;
  order_type?: 'limit' | 'market';
}) {
  const path = '/v2/orders';
  const url = DELTA_API_URL + path;
  const nonce = Date.now().toString();
  const body = JSON.stringify({
    product_id,
    size,
    side,
    price,
    order_type,
  });
  const signature = getDeltaSignature(path, body, nonce);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': DELTA_API_KEY,
      'timestamp': nonce,
      'signature': signature,
      'Content-Type': 'application/json',
    },
    body,
  });
  return res.json();
} 