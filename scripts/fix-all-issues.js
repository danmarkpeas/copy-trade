const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

class AllIssuesFix {
    constructor() {
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://urjgxetnqogwryhpafma.supabase.co';
        this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
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

    async checkDatabaseConnection() {
        console.log('\n🔍 Checking database connection...');
        
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('count')
                .limit(1);
            
            if (error) {
                console.log('❌ Database connection failed:', error.message);
                return false;
            }
            
            console.log('✅ Database connection successful');
            return true;
        } catch (error) {
            console.log('❌ Database connection error:', error.message);
            return false;
        }
    }

    async checkBrokerAccounts() {
        console.log('\n🔍 Checking broker accounts...');
        
        try {
            const { data: brokerAccounts, error } = await this.supabase
                .from('broker_accounts')
                .select('*')
                .limit(10);
            
            if (error) {
                console.log('❌ Error fetching broker accounts:', error.message);
                return false;
            }
            
            console.log(`✅ Found ${brokerAccounts.length} broker accounts`);
            
            if (brokerAccounts.length === 0) {
                console.log('⚠️  No broker accounts found. You need to create one.');
                return false;
            }
            
            // Check for active broker accounts
            const activeAccounts = brokerAccounts.filter(account => account.is_active);
            console.log(`📊 Active broker accounts: ${activeAccounts.length}`);
            
            if (activeAccounts.length === 0) {
                console.log('⚠️  No active broker accounts found.');
                return false;
            }
            
            return true;
        } catch (error) {
            console.log('❌ Error checking broker accounts:', error.message);
            return false;
        }
    }

    async checkFollowers() {
        console.log('\n🔍 Checking followers...');
        
        try {
            const { data: followers, error } = await this.supabase
                .from('followers')
                .select('*')
                .limit(10);
            
            if (error) {
                console.log('❌ Error fetching followers:', error.message);
                return false;
            }
            
            console.log(`✅ Found ${followers.length} followers`);
            return true;
        } catch (error) {
            console.log('❌ Error checking followers:', error.message);
            return false;
        }
    }

    async testTradeMonitoringWithRealBroker() {
        console.log('\n🔍 Testing trade monitoring with real broker...');
        
        try {
            // Get a real broker account
            const { data: brokerAccounts, error } = await this.supabase
                .from('broker_accounts')
                .select('id, user_id')
                .eq('is_active', true)
                .limit(1);
            
            if (error || !brokerAccounts || brokerAccounts.length === 0) {
                console.log('❌ No active broker accounts found');
                return false;
            }
            
            const brokerId = brokerAccounts[0].id;
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

    async createTestBrokerAccount() {
        console.log('\n🔧 Creating test broker account...');
        
        try {
            // Get first user
            const { data: users, error: userError } = await this.supabase
                .from('users')
                .select('id')
                .limit(1);
            
            if (userError || !users || users.length === 0) {
                console.log('❌ No users found in database');
                return false;
            }
            
            const userId = users[0].id;
            
            // Create test broker account
            const { data: brokerAccount, error } = await this.supabase
                .from('broker_accounts')
                .insert({
                    user_id: userId,
                    platform: 'delta_exchange',
                    api_key: 'test_api_key',
                    api_secret: 'test_api_secret',
                    is_active: true,
                    name: 'Test Broker Account'
                })
                .select()
                .single();
            
            if (error) {
                console.log('❌ Error creating test broker account:', error.message);
                return false;
            }
            
            console.log('✅ Test broker account created successfully');
            console.log(`Broker ID: ${brokerAccount.id}`);
            return brokerAccount.id;
        } catch (error) {
            console.log('❌ Error creating test broker account:', error.message);
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

    async runCompleteFix() {
        console.log('🔧 COMPLETE SYSTEM FIX');
        console.log('='.repeat(50));
        
        // Get current IP
        await this.getCurrentIP();
        
        // Check all components
        const results = {
            database: await this.checkDatabaseConnection(),
            brokerAccounts: await this.checkBrokerAccounts(),
            followers: await this.checkFollowers(),
            tradeMonitoring: await this.testTradeMonitoringWithRealBroker()
        };
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('FIX SUMMARY');
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
        console.log('FIXING ISSUES');
        console.log('='.repeat(50));
        
        if (!results.database) {
            console.log('❌ Database connection issue - check Supabase configuration');
        }
        
        if (!results.brokerAccounts) {
            console.log('🔧 Creating test broker account...');
            const brokerId = await this.createTestBrokerAccount();
            if (brokerId) {
                console.log('✅ Test broker account created');
                // Test trade monitoring again
                await this.testTradeMonitoringWithRealBroker();
            }
        }
        
        if (!results.tradeMonitoring) {
            console.log('🔧 Trade monitoring issue detected');
            console.log('This might be due to:');
            console.log('1. No active broker accounts');
            console.log('2. API key not configured');
            console.log('3. IP whitelist issue');
        }
        
        // Always show IP whitelist fix
        await this.fixIPWhitelistIssue();
        
        console.log('\n' + '='.repeat(50));
        console.log('NEXT STEPS');
        console.log('='.repeat(50));
        console.log('1. Add your IP to Delta Exchange API whitelist');
        console.log('2. Configure your real API credentials');
        console.log('3. Test the trade monitoring functionality');
        console.log('4. Access the platform at: http://localhost:3000');
        
        return results;
    }
}

async function main() {
    const fixer = new AllIssuesFix();
    const results = await fixer.runCompleteFix();
    
    return results;
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AllIssuesFix; 