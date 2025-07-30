// Test Email System
// Run this with: node scripts/test-email-system.js

const fetch = require('node-fetch');

async function testEmailSystem() {
  console.log('🧪 Testing Email System...\n');

  const testData = {
    to: 'test@example.com',
    subject: 'Test Email from Copy Trading Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧪 Test Email</h1>
          </div>
          <div class="content">
            <h2>Email System Test</h2>
            <p>This is a test email to verify that the email system is working correctly.</p>
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>Timestamp: ${new Date().toISOString()}</li>
              <li>System: Copy Trading Platform</li>
              <li>Status: Testing</li>
            </ul>
            <p>If you receive this email, the email system is working properly!</p>
          </div>
          <div class="footer">
            <p>This is a test email from the Copy Trading Platform</p>
            <p>&copy; 2025 Copy Trading Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    console.log('📧 Sending test email...');
    console.log('  To:', testData.to);
    console.log('  Subject:', testData.subject);
    console.log('  HTML Length:', testData.html.length, 'characters');

    // Test the local API route
    const localResponse = await fetch('http://localhost:3000/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    console.log('\n📊 Local API Response:');
    console.log('  Status:', localResponse.status);
    console.log('  Status Text:', localResponse.statusText);

    const localResult = await localResponse.json();
    console.log('  Response:', JSON.stringify(localResult, null, 2));

    // Test the Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      console.log('\n🔍 Testing Supabase Edge Function...');
      
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-email`;
      
      const edgeResponse = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(testData)
      });

      console.log('\n📊 Edge Function Response:');
      console.log('  Status:', edgeResponse.status);
      console.log('  Status Text:', edgeResponse.statusText);

      const edgeResult = await edgeResponse.json();
      console.log('  Response:', JSON.stringify(edgeResult, null, 2));
    } else {
      console.log('\n⚠️  Supabase environment variables not found, skipping Edge Function test');
    }

    console.log('\n✅ Email system test completed!');
    console.log('\n📝 Notes:');
    console.log('  - Local API route logs emails to console');
    console.log('  - Edge Function can be configured with actual email service');
    console.log('  - Check server logs for detailed email information');

  } catch (error) {
    console.error('❌ Email system test failed:', error);
  }
}

testEmailSystem(); 