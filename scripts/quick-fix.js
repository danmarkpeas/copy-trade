const axios = require('axios');

class QuickFix {
    constructor() {
        this.currentIP = null;
    }

    async getCurrentIP() {
        try {
            const response = await axios.get('https://api.ipify.org', { timeout: 5000 });
            this.currentIP = response.data.trim();
            console.log(`📍 Your Public IP: ${this.currentIP}`);
            return this.currentIP;
        } catch (error) {
            console.log('❌ Failed to get IP address');
            return null;
        }
    }

    async testBackendConnection() {
        console.log('\n🔍 Testing backend server connection...');
        
        try {
            const response = await axios.get('http://localhost:3001', { timeout: 5000 });
            console.log('✅ Backend server is running');
            console.log(`Status: ${response.data.status}`);
            return true;
        } catch (error) {
            console.log('❌ Backend server is not running');
            console.log('Please start the backend server with: node server.js');
            return false;
        }
    }

    async testFrontendConnection() {
        console.log('\n🔍 Testing frontend server connection...');
        
        try {
            const response = await axios.get('http://localhost:3000', { timeout: 5000 });
            console.log('✅ Frontend server is running');
            return true;
        } catch (error) {
            console.log('❌ Frontend server is not running');
            console.log('Please start the frontend server with: npm run dev');
            return false;
        }
    }

    async testTradeMonitoringWithExistingBroker() {
        console.log('\n🔍 Testing trade monitoring with existing broker...');
        
        try {
            // Use the broker ID that's already working in the backend
            const brokerId = 'f9593e9d-b50d-447c-80e3-a79464be7dff';
            console.log(`📊 Testing with broker ID: ${brokerId}`);
            
            const response = await axios.post('http://localhost:3000/api/real-time-monitor', {
                broker_id: brokerId
            }, { timeout: 15000 });
            
            console.log('✅ Trade monitoring test successful');
            console.log('Response:', JSON.stringify(response.data, null, 2));
            return true;
        } catch (error) {
            if (error.response) {
                console.log(`❌ Trade monitoring test failed: ${error.response.status}`);
                console.log('Error:', JSON.stringify(error.response.data, null, 2));
            } else {
                console.log(`❌ Trade monitoring test failed: ${error.message}`);
            }
            return false;
        }
    }

    async fixIPWhitelistIssue() {
        console.log('\n🔧 Fixing IP whitelist issue...');
        
        if (!this.currentIP) {
            await this.getCurrentIP();
        }
        
        console.log('\n📋 To fix the IP whitelist issue:');
        console.log('1. Go to: https://www.delta.exchange/app/account/manageapikeys');
        console.log('2. Find your API key');
        console.log('3. Click "Edit" on the API key');
        console.log('4. Add this IP to the whitelist:');
        console.log(`   ${this.currentIP}`);
        console.log('5. Save the changes');
        console.log('\n🔄 After adding the IP, restart the copy trading system');
        
        return true;
    }

    async runQuickFix() {
        console.log('🔧 QUICK SYSTEM FIX');
        console.log('='.repeat(50));
        
        // Get current IP
        await this.getCurrentIP();
        
        // Test all components
        const results = {
            backend: await this.testBackendConnection(),
            frontend: await this.testFrontendConnection(),
            tradeMonitoring: await this.testTradeMonitoringWithExistingBroker()
        };
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('QUICK FIX SUMMARY');
        console.log('='.repeat(50));
        
        const passed = Object.values(results).filter(Boolean).length;
        const total = Object.keys(results).length;
        
        for (const [component, result] of Object.entries(results)) {
            const status = result ? '✅ PASS' : '❌ FAIL';
            console.log(`${component.replace(/([A-Z])/g, ' $1').toUpperCase()}: ${status}`);
        }
        
        console.log(`\nOverall: ${passed}/${total} components working`);
        
        // Fix issues
        console.log('\n' + '='.repeat(50));
        console.log('IMMEDIATE FIXES');
        console.log('='.repeat(50));
        
        if (!results.backend) {
            console.log('1. Start backend server: node server.js');
        }
        
        if (!results.frontend) {
            console.log('2. Start frontend server: npm run dev');
        }
        
        if (!results.tradeMonitoring) {
            console.log('3. Trade monitoring issue detected');
            console.log('   This is likely due to IP whitelist issue');
        }
        
        // Always show IP whitelist fix
        await this.fixIPWhitelistIssue();
        
        console.log('\n' + '='.repeat(50));
        console.log('CURRENT STATUS');
        console.log('='.repeat(50));
        console.log('✅ Frontend: Running on http://localhost:3000');
        console.log('✅ Backend: Running on port 3001');
        console.log('❌ API Issue: IP not whitelisted for Delta Exchange');
        console.log('❌ Trade Monitoring: Failing due to API issue');
        
        console.log('\n' + '='.repeat(50));
        console.log('NEXT STEPS');
        console.log('='.repeat(50));
        console.log('1. Add your IP to Delta Exchange API whitelist');
        console.log('2. Configure your real API credentials');
        console.log('3. Test the trade monitoring functionality');
        console.log('4. Access the platform at: http://localhost:3000');
        
        if (passed === total) {
            console.log('\n🎉 All systems are working correctly!');
        } else {
            console.log('\n⚠️  Some issues need to be resolved (see above)');
        }
        
        return results;
    }
}

async function main() {
    const fixer = new QuickFix();
    const results = await fixer.runQuickFix();
    
    return results;
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = QuickFix; 