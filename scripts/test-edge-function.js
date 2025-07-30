// Test Edge Function
// Run this with: node scripts/test-edge-function.js

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testEdgeFunction() {
  console.log('🔍 Testing Supabase Edge Function...\n');
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    return;
  }
  
  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/delta-api-verify`;
  
  console.log('📡 Edge Function URL:', edgeFunctionUrl);
  console.log('🔑 Using anon key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
  
  // Test data (replace with your actual API keys)
  const testData = {
    broker_name: 'delta',
    api_key: 'test_api_key_123456789012345678901234567890',
    api_secret: 'test_secret_123456789012345678901234567890'
  };
  
  console.log('\n📋 Test Data:');
  console.log('  Broker:', testData.broker_name);
  console.log('  API Key Length:', testData.api_key.length);
  console.log('  API Secret Length:', testData.api_secret.length);
  
  try {
    console.log('\n🚀 Making request to Edge Function...');
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(testData),
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('📊 Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Edge Function is working!');
      console.log('   The function responded successfully.');
      console.log('   Note: This test uses dummy API keys, so validation will fail.');
    } else {
      console.log('\n❌ Edge Function error:');
      console.log('   Status:', response.status);
      console.log('   Error:', result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    console.error('   This might indicate:');
    console.error('   1. Edge Function not deployed');
    console.error('   2. Network connectivity issues');
    console.error('   3. Environment variables not set');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Try creating a broker account in the UI');
  console.log('   2. Check Edge Function logs: npx supabase functions logs delta-api-verify');
  console.log('   3. Monitor the function: npx supabase functions serve delta-api-verify');
}

testEdgeFunction().catch(console.error); 