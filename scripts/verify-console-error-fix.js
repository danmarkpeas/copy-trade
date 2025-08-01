const axios = require('axios');

async function verifyConsoleErrorFix() {
  console.log('🔍 VERIFYING CONSOLE ERROR FIX');
  console.log('=' .repeat(50));
  
  console.log('Testing the set-user endpoint that was causing the console error...');
  
  try {
    // Test with the same data structure the frontend uses
    const response = await axios.post('http://localhost:3001/api/set-user', {
      user_id: 'test-user-verification',
      email: 'test@verification.com'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });

    console.log('✅ SUCCESS: Set-User endpoint is working correctly!');
    console.log('Response:', response.data);
    
    if (response.data.success) {
      console.log('\n🎉 CONSOLE ERROR FIXED!');
      console.log('The "❌ Failed to set user in backend" error should no longer appear.');
      console.log('The frontend can now successfully set user sessions in the backend.');
    } else {
      console.log('❌ Response indicates failure');
    }
    
  } catch (error) {
    console.log('❌ ERROR: Set-User endpoint is still failing');
    console.log('Error details:', error.response?.data || error.message);
    console.log('\nThis means the console error "❌ Failed to set user in backend" will still appear.');
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('VERIFICATION COMPLETE');
  console.log('=' .repeat(50));
}

// Run the verification
verifyConsoleErrorFix().catch(console.error); 