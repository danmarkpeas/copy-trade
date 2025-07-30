const fetch = require('node-fetch');

async function fetchAllSymbols() {
  console.log('🔍 FETCHING ALL SYMBOLS FROM INDIA DELTA EXCHANGE API\n');
  
  try {
    // Fetch all products from India Delta Exchange API
    const response = await fetch('https://api.india.delta.exchange/v2/products');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`API error: ${data.message || 'Unknown error'}`);
    }
    
    const products = data.result; // This is an array, not an object
    console.log(`✅ Successfully fetched ${products.length} products from India Delta Exchange`);
    
    // Filter for perpetual futures (most common for copy trading)
    const perpetualFutures = products.filter(product => 
      product.contract_type === 'perpetual_futures' && 
      product.state === 'live'
    );
    
    console.log(`📈 Found ${perpetualFutures.length} live perpetual futures contracts`);
    
    // Create a mapping of symbol to product_id
    const symbolMapping = {};
    const popularSymbols = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'POLUSD', 'ALGOUSD', 'ADAUSD', 'DOTUSD', 'MATICUSD', 'LINKUSD', 'UNIUSD'];
    
    perpetualFutures.forEach(product => {
      symbolMapping[product.symbol] = product.id;
      
      // Highlight popular symbols
      if (popularSymbols.includes(product.symbol)) {
        console.log(`   ⭐ ${product.symbol}: Product ID ${product.id} (${product.underlying_asset?.symbol}/${product.quoting_asset?.symbol})`);
      }
    });
    
    // Show all available symbols
    console.log('\n📊 ALL AVAILABLE PERPETUAL FUTURES:');
    perpetualFutures.slice(0, 20).forEach(product => {
      console.log(`   ${product.symbol}: ID ${product.id} (${product.underlying_asset?.symbol}/${product.quoting_asset?.symbol})`);
    });
    
    if (perpetualFutures.length > 20) {
      console.log(`   ... and ${perpetualFutures.length - 20} more symbols`);
    }
    
    // Generate the productIds object for the ultra-fast system
    console.log('\n🔧 GENERATED PRODUCT IDS MAPPING:');
    console.log('// Add this to the ultra-fast system constructor:');
    console.log('this.productIds = {');
    
    // Show popular symbols first
    popularSymbols.forEach(symbol => {
      if (symbolMapping[symbol]) {
        console.log(`  '${symbol}': ${symbolMapping[symbol]},`);
      }
    });
    
    // Show some additional symbols
    const additionalSymbols = perpetualFutures
      .filter(product => !popularSymbols.includes(product.symbol))
      .slice(0, 10);
    
    additionalSymbols.forEach(product => {
      console.log(`  '${product.symbol}': ${product.id},`);
    });
    
    console.log('};');
    
    // Save to a file for easy import
    const fs = require('fs');
    const productIdsData = {
      timestamp: new Date().toISOString(),
      totalProducts: products.length,
      perpetualFutures: perpetualFutures.length,
      symbolMapping: symbolMapping,
      popularSymbols: popularSymbols.reduce((acc, symbol) => {
        if (symbolMapping[symbol]) {
          acc[symbol] = symbolMapping[symbol];
        }
        return acc;
      }, {})
    };
    
    fs.writeFileSync('product-ids.json', JSON.stringify(productIdsData, null, 2));
    console.log('\n💾 Product IDs saved to product-ids.json');
    
    // Test some specific symbols
    console.log('\n🧪 TESTING SPECIFIC SYMBOLS:');
    const testSymbols = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'POLUSD', 'ALGOUSD'];
    testSymbols.forEach(symbol => {
      if (symbolMapping[symbol]) {
        console.log(`   ✅ ${symbol}: Product ID ${symbolMapping[symbol]}`);
      } else {
        console.log(`   ❌ ${symbol}: Not found`);
      }
    });
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('   1. Update the ultra-fast system to use dynamic symbol fetching');
    console.log('   2. Replace hardcoded productIds with API-fetched data');
    console.log('   3. Implement periodic symbol refresh (daily/weekly)');
    console.log('   4. Add error handling for API failures');
    
    return symbolMapping;
    
  } catch (error) {
    console.error('❌ Error fetching symbols:', error.message);
    return null;
  }
}

// Run the symbol fetcher
fetchAllSymbols().catch(console.error); 