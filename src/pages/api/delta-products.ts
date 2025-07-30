import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const response = await fetch('https://api.india.delta.exchange/v2/products', {
    headers: { 'Accept': 'application/json' }
  })
  const contentType = response.headers.get('content-type')
  if (!response.ok || !contentType?.includes('application/json')) {
    const text = await response.text()
    console.error('Delta API error:', text)
    return res.status(502).json({ error: 'Delta API error', details: text })
  }
  const data = await response.json()
  res.status(200).json(data)
} 