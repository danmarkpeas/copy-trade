require('dotenv').config();
const fetch = require('node-fetch');

async function testDynamicSymbols() {
  console.log('🧪 TESTING DYNAMIC SYMBOL LOADING\n');
  
  const DELTA_API_URL = 'https://api.india.delta.exchange';
  
  try {
    // 1. Load all products
    console.log('📡 Loading products from Delta Exchange API...');
    const response = await fetch(`${DELTA_API_URL}/v2/products`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.result || !Array.isArray(data.result)) {
      throw new Error('Invalid API response format');
    }
    
    // 2. Filter for perpetual futures
    const perpetualFutures = data.result.filter(product => 
      product.contract_type === 'perpetual_futures' && 
      product.state === 'live'
    );
    
    console.log(`✅ Found ${perpetualFutures.length} perpetual futures contracts`);
    
    // 3. Create product ID mapping
    const productIds = {};
    perpetualFutures.forEach(product => {
      productIds[product.symbol] = product.id;
    });
    
    // 4. Test specific symbols
    const testSymbols = ['USUALUSD', 'POLUSD', 'ALGOUSD', 'BTCUSD', 'ETHUSD', 'SOLUSD'];
    console.log('\n🎯 Testing specific symbols:');
    
    testSymbols.forEach(symbol => {
      const productId = productIds[symbol];
      if (productId) {
        console.log(`   ✅ ${symbol}: Product ID ${productId}`);
      } else {
        console.log(`   ❌ ${symbol}: Not found`);
      }
    });
    
    // 5. Test order placement simulation for USUALUSD
    console.log('\n🧪 Testing order placement simulation for USUALUSD:');
    const usualProductId = productIds['USUALUSD'];
    
    if (usualProductId) {
      console.log(`   ✅ USUALUSD found with Product ID: ${usualProductId}`);
      
      // Simulate order data
      const orderData = {
        product_id: usualProductId,
        size: 1,
        side: 'sell',
        order_type: 'market_order',
        time_in_force: 'gtc'
      };
      
      console.log(`   📋 Order data would be:`, JSON.stringify(orderData, null, 2));
      console.log(`   ✅ Order placement should work with dynamic product ID`);
    } else {
      console.log(`   ❌ USUALUSD not found - this would cause "Invalid symbol" error`);
    }
    
    // 6. Show total available symbols
    console.log(`\n📊 Total available symbols: ${Object.keys(productIds).length}`);
    console.log(`📋 Sample symbols: ${Object.keys(productIds).slice(0, 20).join(', ')}`);
    
    console.log('\n✅ Dynamic symbol loading test completed successfully!');
    console.log('🎯 The ultra-fast system should now work with all symbols including USUALUSD');
    
  } catch (error) {
    console.error('❌ Error testing dynamic symbols:', error.message);
  }
}

// Run the test
testDynamicSymbols().catch(console.error); 