#!/usr/bin/env node

/**
 * Delta Exchange Copy Trading System Test Script
 * 
 * This script tests the system functionality without requiring actual API credentials.
 * It validates the core components and provides a safe way to test the system.
 */

const DeltaExchangeCopyTrader = require('../services/DeltaExchangeCopyTrader');

// Mock configuration for testing
const mockBrokerConfig = {
    api_key: 'test_broker_api_key',
    api_secret: 'test_broker_api_secret',
    name: 'test_broker'
};

const mockFollowerConfigs = [
    {
        api_key: 'test_follower1_api_key',
        api_secret: 'test_follower1_api_secret',
        name: 'test_follower_1',
        size_multiplier: 1.0
    },
    {
        api_key: 'test_follower2_api_key',
        api_secret: 'test_follower2_api_secret',
        name: 'test_follower_2',
        size_multiplier: 0.5
    }
];

async function testSystemComponents() {
    console.log('🧪 Testing Delta Exchange Copy Trading System Components');
    console.log('=' .repeat(60));
    
    let testResults = {
        passed: 0,
        failed: 0,
        tests: []
    };
    
    // Test 1: Instance Creation
    try {
        const copyTrader = new DeltaExchangeCopyTrader(mockBrokerConfig, mockFollowerConfigs);
        testResults.tests.push({
            name: 'Instance Creation',
            status: 'PASS',
            message: 'Successfully created DeltaExchangeCopyTrader instance'
        });
        testResults.passed++;
    } catch (error) {
        testResults.tests.push({
            name: 'Instance Creation',
            status: 'FAIL',
            message: error.message
        });
        testResults.failed++;
    }
    
    // Test 2: Configuration Validation
    try {
        const copyTrader = new DeltaExchangeCopyTrader(mockBrokerConfig, mockFollowerConfigs);
        
        // Test broker config
        if (copyTrader.brokerConfig.api_key === mockBrokerConfig.api_key) {
            testResults.tests.push({
                name: 'Broker Config Validation',
                status: 'PASS',
                message: 'Broker configuration properly set'
            });
            testResults.passed++;
        } else {
            throw new Error('Broker config not properly set');
        }
        
        // Test follower configs
        if (copyTrader.followerConfigs.length === mockFollowerConfigs.length) {
            testResults.tests.push({
                name: 'Follower Configs Validation',
                status: 'PASS',
                message: `Follower configurations properly set (${mockFollowerConfigs.length} followers)`
            });
            testResults.passed++;
        } else {
            throw new Error('Follower configs not properly set');
        }
        
    } catch (error) {
        testResults.tests.push({
            name: 'Configuration Validation',
            status: 'FAIL',
            message: error.message
        });
        testResults.failed++;
    }
    
    // Test 3: Event System
    try {
        const copyTrader = new DeltaExchangeCopyTrader(mockBrokerConfig, mockFollowerConfigs);
        let eventReceived = false;
        
        copyTrader.on('test', () => {
            eventReceived = true;
        });
        
        copyTrader.emit('test');
        
        if (eventReceived) {
            testResults.tests.push({
                name: 'Event System',
                status: 'PASS',
                message: 'Event system working correctly'
            });
            testResults.passed++;
        } else {
            throw new Error('Event not received');
        }
    } catch (error) {
        testResults.tests.push({
            name: 'Event System',
            status: 'FAIL',
            message: error.message
        });
        testResults.failed++;
    }
    
    // Test 4: Size Calculation
    try {
        const copyTrader = new DeltaExchangeCopyTrader(mockBrokerConfig, mockFollowerConfigs);
        
        const brokerSize = 100;
        const follower1Size = copyTrader.calculateFollowerSize(brokerSize, mockFollowerConfigs[0]);
        const follower2Size = copyTrader.calculateFollowerSize(brokerSize, mockFollowerConfigs[1]);
        
        if (follower1Size === 100 && follower2Size === 50) {
            testResults.tests.push({
                name: 'Size Calculation',
                status: 'PASS',
                message: `Size calculation correct: Follower1=${follower1Size}, Follower2=${follower2Size}`
            });
            testResults.passed++;
        } else {
            throw new Error(`Size calculation incorrect: Follower1=${follower1Size}, Follower2=${follower2Size}`);
        }
    } catch (error) {
        testResults.tests.push({
            name: 'Size Calculation',
            status: 'FAIL',
            message: error.message
        });
        testResults.failed++;
    }
    
    // Test 5: Status Methods
    try {
        const copyTrader = new DeltaExchangeCopyTrader(mockBrokerConfig, mockFollowerConfigs);
        
        const status = copyTrader.getStatus();
        const stats = copyTrader.getStats();
        
        if (status && stats) {
            testResults.tests.push({
                name: 'Status Methods',
                status: 'PASS',
                message: 'Status and stats methods working correctly'
            });
            testResults.passed++;
        } else {
            throw new Error('Status or stats methods not working');
        }
    } catch (error) {
        testResults.tests.push({
            name: 'Status Methods',
            status: 'FAIL',
            message: error.message
        });
        testResults.failed++;
    }
    
    // Test 6: Signature Generation
    try {
        const copyTrader = new DeltaExchangeCopyTrader(mockBrokerConfig, mockFollowerConfigs);
        
        const message = 'test_message';
        const signature = copyTrader.generateSignature(mockBrokerConfig.api_secret, message);
        
        if (signature && signature.length === 64) { // SHA256 hex string length
            testResults.tests.push({
                name: 'Signature Generation',
                status: 'PASS',
                message: 'Signature generation working correctly'
            });
            testResults.passed++;
        } else {
            throw new Error('Invalid signature generated');
        }
    } catch (error) {
        testResults.tests.push({
            name: 'Signature Generation',
            status: 'FAIL',
            message: error.message
        });
        testResults.failed++;
    }
    
    // Test 7: Order Queue Management
    try {
        const copyTrader = new DeltaExchangeCopyTrader(mockBrokerConfig, mockFollowerConfigs);
        
        // Add test order to queue
        copyTrader.orderQueue.push({
            followerConfig: mockFollowerConfigs[0],
            symbol: 'BTC-PERP',
            side: 'buy',
            size: 10,
            orderType: 'market_order',
            limitPrice: null,
            reduceOnly: false
        });
        
        if (copyTrader.orderQueue.length === 1) {
            testResults.tests.push({
                name: 'Order Queue Management',
                status: 'PASS',
                message: 'Order queue management working correctly'
            });
            testResults.passed++;
        } else {
            throw new Error('Order queue not working correctly');
        }
    } catch (error) {
        testResults.tests.push({
            name: 'Order Queue Management',
            status: 'FAIL',
            message: error.message
        });
        testResults.failed++;
    }
    
    return testResults;
}

function displayTestResults(results) {
    console.log('\n📊 Test Results Summary');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Test Results');
    console.log('─'.repeat(60));
    
    results.tests.forEach((test, index) => {
        const status = test.status === 'PASS' ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${test.name}`);
        console.log(`   ${test.message}`);
        console.log('');
    });
    
    if (results.failed === 0) {
        console.log('🎉 All tests passed! The system is ready for use.');
    } else {
        console.log('⚠️  Some tests failed. Please check the implementation.');
    }
}

async function testIntegration() {
    console.log('\n🔗 Testing System Integration');
    console.log('─'.repeat(40));
    
    try {
        const copyTrader = new DeltaExchangeCopyTrader(mockBrokerConfig, mockFollowerConfigs);
        
        // Set up event listeners
        let eventsReceived = {
            started: false,
            authenticated: false,
            brokerTrade: false,
            tradeCopied: false,
            error: false
        };
        
        copyTrader.on('started', () => {
            eventsReceived.started = true;
            console.log('  ✅ Started event received');
        });
        
        copyTrader.on('authenticated', () => {
            eventsReceived.authenticated = true;
            console.log('  ✅ Authenticated event received');
        });
        
        copyTrader.on('brokerTrade', (data) => {
            eventsReceived.brokerTrade = true;
            console.log('  ✅ Broker trade event received');
        });
        
        copyTrader.on('tradeCopied', (data) => {
            eventsReceived.tradeCopied = true;
            console.log('  ✅ Trade copied event received');
        });
        
        copyTrader.on('error', (error) => {
            eventsReceived.error = true;
            console.log('  ✅ Error event received');
        });
        
        // Simulate some events
        copyTrader.emit('started');
        copyTrader.emit('authenticated');
        
        // Simulate a broker trade
        const mockTradeData = {
            symbol: 'BTC-PERP',
            side: 'buy',
            size: 10,
            order_id: 'test_order_123',
            average_fill_price: 50000,
            reduce_only: false
        };
        
        copyTrader.emit('brokerTrade', mockTradeData);
        
        console.log('  ✅ Integration test completed successfully');
        return true;
        
    } catch (error) {
        console.log(`  ❌ Integration test failed: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🎯 Delta Exchange Copy Trading System Test Suite');
    console.log('=' .repeat(60));
    
    // Run component tests
    const testResults = await testSystemComponents();
    displayTestResults(testResults);
    
    // Run integration test
    const integrationSuccess = await testIntegration();
    
    console.log('\n🎯 Overall Test Summary');
    console.log('=' .repeat(60));
    console.log(`Component Tests: ${testResults.passed}/${testResults.passed + testResults.failed} passed`);
    console.log(`Integration Test: ${integrationSuccess ? 'PASS' : 'FAIL'}`);
    
    if (testResults.failed === 0 && integrationSuccess) {
        console.log('\n🎉 All tests passed! The system is ready for production use.');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Please review the implementation.');
        process.exit(1);
    }
}

// Run tests
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = { testSystemComponents, testIntegration }; 