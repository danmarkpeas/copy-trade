const axios = require('axios');

async function getCurrentIP() {
    try {
        console.log('🔍 Getting your current public IP address...');
        
        // Try multiple IP services for redundancy
        const ipServices = [
            'https://api.ipify.org',
            'https://ipinfo.io/ip',
            'https://icanhazip.com',
            'https://checkip.amazonaws.com'
        ];
        
        for (const service of ipServices) {
            try {
                const response = await axios.get(service, { timeout: 5000 });
                const ip = response.data.trim();
                
                console.log('✅ IP Address Retrieved Successfully!');
                console.log(`📍 Your Public IP: ${ip}`);
                console.log('\n📋 To fix the IP whitelist issue:');
                console.log('1. Go to: https://www.delta.exchange/app/account/manageapikeys');
                console.log('2. Find your API key');
                console.log('3. Click "Edit" on the API key');
                console.log('4. Add this IP to the whitelist:');
                console.log(`   ${ip}`);
                console.log('5. Save the changes');
                console.log('\n🔄 After adding the IP, restart the copy trading system');
                
                return ip;
            } catch (error) {
                console.log(`❌ Failed to get IP from ${service}: ${error.message}`);
                continue;
            }
        }
        
        console.log('❌ Failed to get IP from all services');
        return null;
        
    } catch (error) {
        console.error('❌ Error getting IP:', error.message);
        return null;
    }
}

async function main() {
    console.log('🌐 IP Address Checker for Delta Exchange API');
    console.log('='.repeat(50));
    
    const ip = await getCurrentIP();
    
    if (ip) {
        console.log('\n✅ SUCCESS: IP address retrieved');
        console.log(`Your IP: ${ip}`);
        console.log('\n📝 Next Steps:');
        console.log('1. Add this IP to your Delta Exchange API key whitelist');
        console.log('2. Restart the copy trading system');
        console.log('3. Test the trade monitoring functionality');
    } else {
        console.log('\n❌ FAILED: Could not retrieve IP address');
        console.log('Please check your internet connection and try again');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { getCurrentIP }; 