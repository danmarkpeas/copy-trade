const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testEmailEdgeFunction() {
  console.log('🧪 Testing Email Edge Function...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase environment variables');
    return;
  }

  try {
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-email`;
    
    console.log('📧 Testing with HTML parameter...');
    
    const testData = {
      to: 'test@example.com',
      subject: 'Test Email - HTML Parameter',
      html: '<h1>Test Email</h1><p>This is a test email with HTML content.</p>'
    };

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(testData)
    });

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Text:', response.statusText);

    const result = await response.json();
    console.log('📊 Response Data:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('✅ Email Edge Function working correctly!');
    } else {
      console.log('❌ Email Edge Function failed');
    }

  } catch (error) {
    console.log('❌ Error testing email Edge Function:', error.message);
  }
}

testEmailEdgeFunction().catch(console.error); 