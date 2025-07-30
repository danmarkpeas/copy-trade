const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkEdgeFunctions() {
  console.log('🔍 Checking Edge Functions in Supabase Project\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔍 Testing known edge functions...');

    // Test 1: real-time-trade-monitor
    console.log('\n📊 Testing real-time-trade-monitor...');
    try {
      const monitorResponse = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/real-time-trade-monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          broker_id: '332f4927-8f66-46a3-bb4f-252a8c5373e3'
        })
      });

      if (monitorResponse.ok) {
        console.log('✅ real-time-trade-monitor: EXISTS and working');
      } else {
        console.log('❌ real-time-trade-monitor: NOT FOUND or not working');
      }
    } catch (error) {
      console.log('❌ real-time-trade-monitor: ERROR -', error.message);
    }

    // Test 2: delta-api-verify
    console.log('\n📊 Testing delta-api-verify...');
    try {
      const verifyResponse = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/delta-api-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          broker_name: 'delta',
          api_key: 'test',
          api_secret: 'test'
        })
      });

      if (verifyResponse.ok) {
        console.log('✅ delta-api-verify: EXISTS and working');
      } else {
        console.log('❌ delta-api-verify: NOT FOUND or not working');
      }
    } catch (error) {
      console.log('❌ delta-api-verify: ERROR -', error.message);
    }

    // Test 3: copy-trade
    console.log('\n📊 Testing copy-trade...');
    try {
      const copyResponse = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/copy-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          trade_data: {}
        })
      });

      if (copyResponse.ok) {
        console.log('✅ copy-trade: EXISTS and working');
      } else {
        console.log('❌ copy-trade: NOT FOUND or not working');
      }
    } catch (error) {
      console.log('❌ copy-trade: ERROR -', error.message);
    }

    // Test 4: send-email
    console.log('\n📊 Testing send-email...');
    try {
      const emailResponse = await fetch('https://urjgxetnqogwryhpafma.supabase.co/functions/v1/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to: 'test@test.com',
          subject: 'Test',
          content: 'Test'
        })
      });

      if (emailResponse.ok) {
        console.log('✅ send-email: EXISTS and working');
      } else {
        console.log('❌ send-email: NOT FOUND or not working');
      }
    } catch (error) {
      console.log('❌ send-email: ERROR -', error.message);
    }

    console.log('\n📋 How to find Edge Functions in Supabase Dashboard:');
    console.log('1. Go to: https://supabase.com/dashboard');
    console.log('2. Select your project: urjgxetnqogwryhpafma');
    console.log('3. Click on "Edge Functions" in the left sidebar');
    console.log('4. Look for the function names listed above');

    console.log('\n🔍 If functions are missing:');
    console.log('1. Check if you have the correct project selected');
    console.log('2. Verify you have access to Edge Functions');
    console.log('3. Functions might be in a different project');
    console.log('4. Functions might need to be deployed');

    console.log('\n💡 Next Steps:');
    console.log('1. Check your Supabase dashboard for Edge Functions');
    console.log('2. If real-time-trade-monitor is missing, we need to create it');
    console.log('3. If it exists but not working, we need to check the logs');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkEdgeFunctions().catch(console.error); 