const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up environment variables for Copy Trading Platform\n');

// Supabase project details
const supabaseUrl = 'https://urjgxetnqogwryhpafma.supabase.co';
const projectRef = 'urjgxetnqogwryhpafma';

console.log('📋 Required Environment Variables:');
console.log('=====================================');
console.log(`NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>');
console.log('SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>');
console.log('NEXT_PUBLIC_SITE_URL=http://localhost:3000');
console.log('');

console.log('🔑 How to get your API keys:');
console.log('============================');
console.log('1. Go to https://supabase.com/dashboard');
console.log('2. Select your project: copy trading (urjgxetnqogwryhpafma)');
console.log('3. Go to Settings > API');
console.log('4. Copy the following keys:');
console.log('   - anon public key (for NEXT_PUBLIC_SUPABASE_ANON_KEY)');
console.log('   - service_role secret key (for SUPABASE_SERVICE_ROLE_KEY)');
console.log('');

console.log('📝 Create a .env file in the project root with:');
console.log('===============================================');
console.log(`NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here');
console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
console.log('NEXT_PUBLIC_SITE_URL=http://localhost:3000');
console.log('');

console.log('⚠️  Important Notes:');
console.log('===================');
console.log('- The .env file should be in the project root directory');
console.log('- Never commit the .env file to version control');
console.log('- Restart your development server after creating the .env file');
console.log('- The service role key has admin privileges - keep it secure');
console.log('');

console.log('🚀 After creating the .env file:');
console.log('===============================');
console.log('1. Stop your development server (Ctrl+C)');
console.log('2. Run: npm run dev');
console.log('3. Visit http://localhost:3000/trades');
console.log('4. The trades page should now work properly');
console.log('');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists!');
  console.log('📄 Current .env file contents:');
  console.log('==============================');
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log(envContent);
} else {
  console.log('❌ .env file not found');
  console.log('📝 Please create the .env file as shown above');
}

console.log('\n🎯 Next Steps:');
console.log('==============');
console.log('1. Get your API keys from Supabase dashboard');
console.log('2. Create the .env file with the correct values');
console.log('3. Restart your development server');
console.log('4. Test the trades page'); 