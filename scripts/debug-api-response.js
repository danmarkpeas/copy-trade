const fetch = require('node-fetch');

async function debugApiResponse() {
  console.log('🔍 DEBUGGING DELTA EXCHANGE API RESPONSE\n');
  
  try {
    // Fetch all products from Delta Exchange API
    const response = await fetch('https://api.delta.exchange/v2/products');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('📊 API RESPONSE STRUCTURE:');
    console.log('Success:', data.success);
    console.log('Result type:', typeof data.result);
    console.log('Result length:', Array.isArray(data.result) ? data.result.length : 'Not an array');
    
    if (Array.isArray(data.result) && data.result.length > 0) {
      console.log('\n📋 FIRST PRODUCT STRUCTURE:');
      const firstProduct = data.result[0];
      console.log(JSON.stringify(firstProduct, null, 2));
      
      console.log('\n🔍 SEARCHING FOR CONTRACT TYPES:');
      const contractTypes = [...new Set(data.result.map(p => p.contract_type).filter(Boolean))];
      console.log('Available contract types:', contractTypes);
      
      console.log('\n🔍 SEARCHING FOR STATUS VALUES:');
      const statuses = [...new Set(data.result.map(p => p.status).filter(Boolean))];
      console.log('Available statuses:', statuses);
      
      console.log('\n🔍 SEARCHING FOR SYMBOLS:');
      const symbols = data.result.map(p => p.symbol).filter(Boolean).slice(0, 20);
      console.log('First 20 symbols:', symbols);
      
      // Look for specific symbols we need
      const targetSymbols = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'POLUSD', 'ALGOUSD'];
      console.log('\n🎯 SEARCHING FOR TARGET SYMBOLS:');
      targetSymbols.forEach(symbol => {
        const found = data.result.find(p => p.symbol === symbol);
        if (found) {
          console.log(`✅ ${symbol}: Found - ID: ${found.id}, Type: ${found.contract_type}, Status: ${found.status}`);
        } else {
          console.log(`❌ ${symbol}: Not found`);
        }
      });
      
      // Look for any product with our target symbols
      console.log('\n🔍 SEARCHING FOR ANY PRODUCT WITH TARGET SYMBOLS:');
      targetSymbols.forEach(symbol => {
        const found = data.result.find(p => p.symbol && p.symbol.includes(symbol.replace('USD', '')));
        if (found) {
          console.log(`✅ ${symbol}: Similar found - Symbol: ${found.symbol}, ID: ${found.id}, Type: ${found.contract_type}, Status: ${found.status}`);
        } else {
          console.log(`❌ ${symbol}: No similar found`);
        }
      });
      
    } else {
      console.log('❌ No products found in response');
    }
    
  } catch (error) {
    console.error('❌ Error debugging API response:', error.message);
  }
}

// Run the debug script
debugApiResponse().catch(console.error); 