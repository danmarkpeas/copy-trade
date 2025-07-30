console.log('🎯 COPY TRADING MODES EXPLAINED');
console.log('================================\n');

console.log('📊 1. MULTIPLIER-BASED COPYING');
console.log('===============================\n');

console.log('💡 Concept:');
console.log('   The follower copies the trade in proportion to the broker\'s position');
console.log('   multiplied by a specific factor.\n');

console.log('🔧 Formula:');
console.log('   Follower Size = Broker Size × Multiplier\n');

console.log('✅ Use Cases:');
console.log('   • Follower wants to mirror the broker\'s strategy but scale up or down');
console.log('   • Ideal when both broker and follower have similar margin and risk tolerance');
console.log('   • Perfect for proportional risk management');
console.log('   • Allows followers to control their exposure relative to broker\n');

console.log('🔢 Examples:');
console.log('   ┌─────────────────┬────────────┬─────────────────┐');
console.log('   │ Broker Trade    │ Multiplier │ Follower Trade  │');
console.log('   ├─────────────────┼────────────┼─────────────────┤');
console.log('   │ 1 BTC           │ 1×         │ 1 BTC           │');
console.log('   │ 1 BTC           │ 2×         │ 2 BTC           │');
console.log('   │ 1 BTC           │ 0.5×       │ 0.5 BTC         │');
console.log('   │ 10 ETH          │ 0.25×      │ 2.5 ETH         │');
console.log('   │ 100 SOL         │ 0.1×       │ 10 SOL          │');
console.log('   └─────────────────┴────────────┴─────────────────┘\n');

console.log('💰 2. FIXED AMOUNT-BASED COPYING');
console.log('=================================\n');

console.log('💡 Concept:');
console.log('   The follower copies the trade using a fixed amount of capital (in USD),');
console.log('   regardless of the broker\'s position size.\n');

console.log('🔧 Formula:');
console.log('   Follower Size = Fixed Capital ÷ Current Price of Asset\n');

console.log('✅ Use Cases:');
console.log('   • Follower has limited funds or wants strict risk control');
console.log('   • Follower doesn\'t care how much the broker trades');
console.log('   • They only want to risk a fixed amount per trade');
console.log('   • Perfect for consistent dollar-cost averaging');
console.log('   • Ideal for followers with small account balances\n');

console.log('🔢 Examples:');
console.log('   ┌─────────────────┬────────────┬─────────────────┐');
console.log('   │ Fixed Capital   │ BTC Price  │ Follower Size   │');
console.log('   ├─────────────────┼────────────┼─────────────────┤');
console.log('   │ $100            │ $50,000    │ 0.002 BTC       │');
console.log('   │ $500            │ $25,000    │ 0.02 BTC        │');
console.log('   │ $1000           │ $20,000    │ 0.05 BTC        │');
console.log('   │ $50             │ $30,000    │ 0.00167 BTC     │');
console.log('   │ $200            │ $40,000    │ 0.005 BTC       │');
console.log('   └─────────────────┴────────────┴─────────────────┘\n');

console.log('🎯 3. FIXED LOT-BASED COPYING');
console.log('==============================\n');

console.log('💡 Concept:');
console.log('   The follower always trades the same lot size regardless of the broker\'s');
console.log('   position size or market conditions.\n');

console.log('🔧 Formula:');
console.log('   Follower Size = Fixed Lot Size (constant)\n');

console.log('✅ Use Cases:');
console.log('   • Follower wants consistent position sizes');
console.log('   • Simple and predictable risk management');
console.log('   • No complex calculations needed');
console.log('   • Perfect for beginners or automated systems');
console.log('   • Ideal when follower has limited understanding of market dynamics\n');

console.log('🔢 Examples:');
console.log('   ┌─────────────────┬────────────┬─────────────────┐');
console.log('   │ Fixed Lot Size  │ Any Broker │ Follower Size   │');
console.log('   │                 │ Trade      │                 │');
console.log('   ├─────────────────┼────────────┼─────────────────┤');
console.log('   │ 0.01 BTC        │ 1 BTC      │ 0.01 BTC        │');
console.log('   │ 0.01 BTC        │ 0.1 BTC    │ 0.01 BTC        │');
console.log('   │ 0.01 BTC        │ 5 BTC      │ 0.01 BTC        │');
console.log('   │ 1 ETH           │ 10 ETH     │ 1 ETH           │');
console.log('   │ 1 ETH           │ 0.5 ETH    │ 1 ETH           │');
console.log('   └─────────────────┴────────────┴─────────────────┘\n');

console.log('📊 COMPARISON TABLE');
console.log('===================\n');

console.log('┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐');
console.log('│ Feature         │ Multiplier      │ Fixed Amount    │ Fixed Lot       │');
console.log('├─────────────────┼─────────────────┼─────────────────┼─────────────────┤');
console.log('│ Risk Scaling    │ Proportional    │ Fixed $ Risk    │ Fixed Size      │');
console.log('│ Complexity      │ Medium          │ High            │ Low             │');
console.log('│ Best For        │ Experienced     │ Risk-Averse     │ Beginners       │');
console.log('│ Account Size    │ Any Size        │ Small-Medium    │ Any Size        │');
console.log('│ Market Impact   │ Variable        │ Variable        │ Consistent      │');
console.log('│ Setup Required  │ Multiplier      │ Fixed Amount    │ Lot Size        │');
console.log('└─────────────────┴─────────────────┴─────────────────┴─────────────────┘\n');

console.log('🎯 RECOMMENDATIONS BY ACCOUNT SIZE');
console.log('==================================\n');

console.log('💰 Small Accounts (< $1,000):');
console.log('   • Fixed Lot: 0.001 - 0.01 BTC');
console.log('   • Fixed Amount: $10 - $50');
console.log('   • Multiplier: 0.01x - 0.1x\n');

console.log('💰 Medium Accounts ($1,000 - $10,000):');
console.log('   • Fixed Lot: 0.01 - 0.1 BTC');
console.log('   • Fixed Amount: $50 - $500');
console.log('   • Multiplier: 0.1x - 0.5x\n');

console.log('💰 Large Accounts (> $10,000):');
console.log('   • Fixed Lot: 0.1 - 1 BTC');
console.log('   • Fixed Amount: $500 - $5,000');
console.log('   • Multiplier: 0.5x - 2x\n');

console.log('⚠️  RISK MANAGEMENT TIPS');
console.log('========================\n');

console.log('🔒 Always set minimum and maximum lot sizes:');
console.log('   • Min Lot: Prevents dust trades');
console.log('   • Max Lot: Prevents oversized positions\n');

console.log('💡 Best Practices:');
console.log('   • Start with smaller sizes and scale up');
console.log('   • Monitor performance regularly');
console.log('   • Adjust settings based on results');
console.log('   • Consider market volatility');
console.log('   • Test with small amounts first\n');

console.log('🚀 GETTING STARTED');
console.log('==================\n');

console.log('1. Choose your copy mode based on your goals and account size');
console.log('2. Set appropriate parameters (multiplier, fixed amount, or lot size)');
console.log('3. Configure min/max lot sizes for risk management');
console.log('4. Test with small amounts first');
console.log('5. Monitor performance and adjust as needed\n');

console.log('📞 Need Help?');
console.log('=============\n');
console.log('• Check follower balances: npm run check-balances');
console.log('• View current config: npm run config');
console.log('• Test the system: npm run test-manual');
console.log('• Monitor results: npm run monitor'); 