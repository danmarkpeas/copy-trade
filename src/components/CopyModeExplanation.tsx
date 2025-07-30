'use client';

import React, { useState } from 'react';

interface CopyModeExplanationProps {
  selectedMode?: string;
  onModeSelect?: (mode: string) => void;
}

export default function CopyModeExplanation({ selectedMode, onModeSelect }: CopyModeExplanationProps) {
  const [activeTab, setActiveTab] = useState(selectedMode || 'multiplier');

  const modes = [
    {
      id: 'multiplier',
      name: 'Multiplier-Based',
      icon: '📊',
      description: 'Copy trades proportionally to broker size',
      formula: 'Follower Size = Broker Size × Multiplier',
      examples: [
        { broker: '1 BTC', multiplier: '1×', follower: '1 BTC' },
        { broker: '1 BTC', multiplier: '2×', follower: '2 BTC' },
        { broker: '1 BTC', multiplier: '0.5×', follower: '0.5 BTC' },
        { broker: '10 ETH', multiplier: '0.25×', follower: '2.5 ETH' },
      ],
      useCases: [
        'Mirror broker strategy with scaling',
        'Proportional risk management',
        'Control exposure relative to broker',
        'Ideal for similar risk tolerance'
      ],
      bestFor: 'Experienced traders with any account size'
    },
    {
      id: 'fixed_amount',
      name: 'Fixed Amount-Based',
      icon: '💰',
      description: 'Always invest a fixed dollar amount',
      formula: 'Follower Size = Fixed Capital ÷ Current Price',
      examples: [
        { broker: 'Any Size', fixedAmount: '$100', btcPrice: '$50,000', follower: '0.002 BTC' },
        { broker: 'Any Size', fixedAmount: '$500', btcPrice: '$25,000', follower: '0.02 BTC' },
        { broker: 'Any Size', fixedAmount: '$1000', btcPrice: '$20,000', follower: '0.05 BTC' },
        { broker: 'Any Size', fixedAmount: '$50', btcPrice: '$30,000', follower: '0.00167 BTC' },
      ],
      useCases: [
        'Strict risk control',
        'Consistent dollar-cost averaging',
        'Limited funds management',
        'Fixed capital per trade'
      ],
      bestFor: 'Risk-averse traders with small-medium accounts'
    },
    {
      id: 'fixed_lot',
      name: 'Fixed Lot-Based',
      icon: '🎯',
      description: 'Always trade the same lot size',
      formula: 'Follower Size = Fixed Lot Size (constant)',
      examples: [
        { broker: '1 BTC', fixedLot: '0.01 BTC', follower: '0.01 BTC' },
        { broker: '0.1 BTC', fixedLot: '0.01 BTC', follower: '0.01 BTC' },
        { broker: '5 BTC', fixedLot: '0.01 BTC', follower: '0.01 BTC' },
        { broker: '10 ETH', fixedLot: '1 ETH', follower: '1 ETH' },
      ],
      useCases: [
        'Consistent position sizes',
        'Simple risk management',
        'No complex calculations',
        'Predictable trading'
      ],
      bestFor: 'Beginners or automated systems'
    }
  ];

  const currentMode = modes.find(mode => mode.id === activeTab) || modes[0];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800">
        📚 Copy Trading Modes Explained
      </h3>
      
      {/* Mode Selection Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => {
              setActiveTab(mode.id);
              onModeSelect?.(mode.id);
            }}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === mode.id
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
            }`}
          >
            {mode.icon} {mode.name}
          </button>
        ))}
      </div>

      {/* Selected Mode Details */}
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-3xl mb-2">{currentMode.icon}</div>
          <h4 className="text-lg font-semibold text-gray-800 mb-2">
            {currentMode.name} Copying
          </h4>
          <p className="text-gray-600 mb-4">{currentMode.description}</p>
        </div>

        {/* Formula */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-semibold text-blue-800 mb-2">🔧 Formula</h5>
          <div className="bg-white border border-blue-300 rounded p-3 font-mono text-blue-900">
            {currentMode.formula}
          </div>
        </div>

        {/* Examples */}
        <div>
          <h5 className="font-semibold text-gray-800 mb-3">🔢 Examples</h5>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  {currentMode.id === 'multiplier' && (
                    <>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Broker Trade</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Multiplier</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Follower Trade</th>
                    </>
                  )}
                  {currentMode.id === 'fixed_amount' && (
                    <>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fixed Amount</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">BTC Price</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Follower Size</th>
                    </>
                  )}
                  {currentMode.id === 'fixed_lot' && (
                    <>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Broker Trade</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fixed Lot</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Follower Trade</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                                 {currentMode.examples.map((example, index) => (
                   <tr key={index} className="border-t border-gray-200">
                     {currentMode.id === 'multiplier' && (
                       <>
                         <td className="px-4 py-2 text-sm">{(example as any).broker}</td>
                         <td className="px-4 py-2 text-sm font-medium text-blue-600">{(example as any).multiplier}</td>
                         <td className="px-4 py-2 text-sm font-medium text-green-600">{(example as any).follower}</td>
                       </>
                     )}
                     {currentMode.id === 'fixed_amount' && (
                       <>
                         <td className="px-4 py-2 text-sm font-medium text-blue-600">{(example as any).fixedAmount}</td>
                         <td className="px-4 py-2 text-sm">{(example as any).btcPrice}</td>
                         <td className="px-4 py-2 text-sm font-medium text-green-600">{(example as any).follower}</td>
                       </>
                     )}
                     {currentMode.id === 'fixed_lot' && (
                       <>
                         <td className="px-4 py-2 text-sm">{(example as any).broker}</td>
                         <td className="px-4 py-2 text-sm font-medium text-blue-600">{(example as any).fixedLot}</td>
                         <td className="px-4 py-2 text-sm font-medium text-green-600">{(example as any).follower}</td>
                       </>
                     )}
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Use Cases */}
        <div>
          <h5 className="font-semibold text-gray-800 mb-3">✅ Use Cases</h5>
          <ul className="space-y-2">
            {currentMode.useCases.map((useCase, index) => (
              <li key={index} className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span className="text-gray-700">{useCase}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Best For */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h5 className="font-semibold text-green-800 mb-2">🎯 Best For</h5>
          <p className="text-green-700">{currentMode.bestFor}</p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h5 className="font-semibold text-gray-800 mb-3">💡 Recommendations by Account Size</h5>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h6 className="font-medium text-yellow-800 mb-2">💰 Small Accounts (&lt; $1,000)</h6>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Fixed Lot: 0.001 - 0.01 BTC</li>
              <li>• Fixed Amount: $10 - $50</li>
              <li>• Multiplier: 0.01x - 0.1x</li>
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h6 className="font-medium text-blue-800 mb-2">💰 Medium Accounts ($1,000 - $10,000)</h6>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Fixed Lot: 0.01 - 0.1 BTC</li>
              <li>• Fixed Amount: $50 - $500</li>
              <li>• Multiplier: 0.1x - 0.5x</li>
            </ul>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h6 className="font-medium text-green-800 mb-2">💰 Large Accounts (&gt; $10,000)</h6>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Fixed Lot: 0.1 - 1 BTC</li>
              <li>• Fixed Amount: $500 - $5,000</li>
              <li>• Multiplier: 0.5x - 2x</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 