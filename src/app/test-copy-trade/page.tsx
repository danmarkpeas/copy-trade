'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function TestCopyTrade() {
  const [brokerId, setBrokerId] = useState('')
  const [tradeData, setTradeData] = useState({
    symbol: 'BTC-PERP',
    side: 'buy',
    size: 0.1,
    price: 45000,
    order_type: 'market'
  })
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTestCopyTrade = async () => {
    if (!brokerId) {
      setError('Please enter a broker ID')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/copy-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          broker_id: brokerId,
          trade_data: tradeData
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Copy trading failed')
      }

      setResult(data)
      console.log('✅ Copy trading result:', data)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('❌ Copy trading error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickTest = async () => {
    if (!brokerId) {
      setError('Please enter a broker ID')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(`/api/copy-trade?broker_id=${brokerId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Test failed')
      }

      setResult(data)
      console.log('✅ Quick test result:', data)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('❌ Quick test error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🚀 Copy Trading Test
          </h1>

          <div className="space-y-6">
            {/* Broker ID Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Broker Account ID
              </label>
              <input
                type="text"
                value={brokerId}
                onChange={(e) => setBrokerId(e.target.value)}
                placeholder="Enter broker account ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Trade Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symbol
                </label>
                <input
                  type="text"
                  value={tradeData.symbol}
                  onChange={(e) => setTradeData({...tradeData, symbol: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Side
                </label>
                <select
                  value={tradeData.side}
                  onChange={(e) => setTradeData({...tradeData, side: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tradeData.size}
                  onChange={(e) => setTradeData({...tradeData, size: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tradeData.price}
                  onChange={(e) => setTradeData({...tradeData, price: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={handleQuickTest}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Testing...' : '🧪 Quick Test'}
              </button>

              <button
                onClick={handleTestCopyTrade}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : '📈 Test Copy Trade'}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Result Display */}
            {result && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Success</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-blue-800 mb-2">📋 Instructions</h3>
            <div className="text-sm text-blue-700 space-y-2">
              <p>1. <strong>Quick Test:</strong> Uses default test data to verify copy trading works</p>
              <p>2. <strong>Test Copy Trade:</strong> Uses your custom trade data</p>
              <p>3. <strong>Broker ID:</strong> Use the ID from your broker account (check the logs above)</p>
              <p>4. <strong>Followers:</strong> Make sure you have active followers subscribed to the broker</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 