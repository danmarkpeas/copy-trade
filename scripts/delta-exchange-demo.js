#!/usr/bin/env node

/**
 * Delta Exchange Copy Trading Demo Script
 * 
 * This script demonstrates how to use the comprehensive Delta Exchange copy trading system.
 * It shows proper configuration, error handling, and monitoring capabilities.
 */

const DeltaExchangeCopyTrader = require('../services/DeltaExchangeCopyTrader');

// Configuration - Replace with your actual API credentials
const brokerConfig = {
    api_key: process.env.BROKER_API_KEY || 'your_broker_api_key',
    api_secret: process.env.BROKER_API_SECRET || 'your_broker_api_secret',
    name: 'demo_broker'
};

const followerConfigs = [
    {
        api_key: process.env.FOLLOWER1_API_KEY || 'your_follower1_api_key',
        api_secret: process.env.FOLLOWER1_API_SECRET || 'your_follower1_api_secret',
        name: 'follower_account_1',
        size_multiplier: 1.0 // Same size as broker
    },
    {
        api_key: process.env.FOLLOWER2_API_KEY || 'your_follower2_api_key',
        api_secret: process.env.FOLLOWER2_API_SECRET || 'your_follower2_api_secret',
        name: 'follower_account_2',
        size_multiplier: 0.5 // Half size of broker
    }
];

async function runDemo() {
    console.log('🚀 Starting Delta Exchange Copy Trading Demo');
    console.log('=' .repeat(60));
    
    // Validate configuration
    if (brokerConfig.api_key === 'your_broker_api_key') {
        console.error('❌ Please set your actual API credentials in environment variables or update the config');
        console.log('\nRequired environment variables:');
        console.log('- BROKER_API_KEY');
        console.log('- BROKER_API_SECRET');
        console.log('- FOLLOWER1_API_KEY');
        console.log('- FOLLOWER1_API_SECRET');
        console.log('- FOLLOWER2_API_KEY (optional)');
        console.log('- FOLLOWER2_API_SECRET (optional)');
        process.exit(1);
    }
    
    // Create copy trader instance
    const copyTrader = new DeltaExchangeCopyTrader(brokerConfig, followerConfigs);
    
    // Set up comprehensive event listeners
    setupEventListeners(copyTrader);
    
    try {
        // Start monitoring
        console.log('\n🔄 Starting copy trading system...');
        await copyTrader.startMonitoring();
        
        // Monitor system for 5 minutes (demo purposes)
        console.log('\n⏱️  Monitoring system for 5 minutes...');
        console.log('Press Ctrl+C to stop early\n');
        
        let monitorCount = 0;
        const monitorInterval = setInterval(() => {
            monitorCount++;
            const status = copyTrader.getStatus();
            const stats = copyTrader.getStats();
            
            console.log(`\n📊 Status Update #${monitorCount} (${new Date().toLocaleTimeString()})`);
            console.log('─'.repeat(40));
            console.log(`🔗 Connected: ${status.isConnected ? '✅' : '❌'}`);
            console.log(`🔐 Authenticated: ${status.isAuthenticated ? '✅' : '❌'}`);
            console.log(`📈 Total Trades: ${stats.totalTrades}`);
            console.log(`✅ Successful Copies: ${stats.successfulCopies}`);
            console.log(`❌ Failed Copies: ${stats.failedCopies}`);
            console.log(`📊 Success Rate: ${stats.successRate}`);
            console.log(`📦 Queue Length: ${status.queueLength}`);
            console.log(`⏱️  Uptime: ${Math.floor(stats.uptime / 1000)}s`);
            
            // Show broker positions
            if (Object.keys(status.brokerPositions).length > 0) {
                console.log('\n📊 Broker Positions:');
                Object.entries(status.brokerPositions).forEach(([symbol, position]) => {
                    console.log(`  ${symbol}: ${position.size} (Entry: ${position.entry_price})`);
                });
            }
            
            // Show follower positions
            Object.entries(status.followerPositions).forEach(([followerName, positions]) => {
                if (Object.keys(positions).length > 0) {
                    console.log(`\n📊 ${followerName} Positions:`);
                    Object.entries(positions).forEach(([symbol, position]) => {
                        console.log(`  ${symbol}: ${position.size} (Entry: ${position.entry_price})`);
                    });
                }
            });
            
            // Stop after 5 minutes
            if (monitorCount >= 60) { // 60 updates * 5 seconds = 5 minutes
                clearInterval(monitorInterval);
                console.log('\n⏰ Demo completed. Stopping system...');
                copyTrader.stopMonitoring();
                process.exit(0);
            }
        }, 5000); // Update every 5 seconds
        
    } catch (error) {
        console.error('❌ Failed to start copy trading system:', error.message);
        process.exit(1);
    }
}

function setupEventListeners(copyTrader) {
    // System events
    copyTrader.on('started', () => {
        console.log('🎉 Copy trading system started successfully');
    });
    
    copyTrader.on('authenticated', () => {
        console.log('🔐 Successfully authenticated with Delta Exchange');
    });
    
    copyTrader.on('stopped', () => {
        console.log('⏹️ Copy trading system has been stopped');
    });
    
    // Trading events
    copyTrader.on('brokerTrade', (tradeData) => {
        console.log(`\n🔄 Broker Trade Detected:`);
        console.log(`  Symbol: ${tradeData.symbol}`);
        console.log(`  Side: ${tradeData.side.toUpperCase()}`);
        console.log(`  Size: ${tradeData.size}`);
        console.log(`  Price: ${tradeData.average_fill_price}`);
        console.log(`  Order ID: ${tradeData.order_id}`);
    });
    
    copyTrader.on('tradeCopied', (data) => {
        console.log(`\n📈 Trade Copied Successfully:`);
        console.log(`  Follower: ${data.follower}`);
        console.log(`  Symbol: ${data.symbol}`);
        console.log(`  Side: ${data.side.toUpperCase()}`);
        console.log(`  Size: ${data.size}`);
        console.log(`  Order ID: ${data.orderId}`);
    });
    
    copyTrader.on('positionClosed', (data) => {
        console.log(`\n📉 Position Closed:`);
        console.log(`  Follower: ${data.follower}`);
        console.log(`  Symbol: ${data.symbol}`);
        console.log(`  Size: ${data.size}`);
    });
    
    // Error events
    copyTrader.on('error', (error) => {
        console.error('\n🚨 Copy Trader Error:', error);
        
        // Handle specific error types
        switch (error.type) {
            case 'websocketError':
                console.log('  🔄 WebSocket connection error - system will attempt to reconnect');
                break;
            case 'authenticationError':
                console.log('  🔑 Authentication failed - check API credentials');
                break;
            case 'tradeCopyFailed':
                console.log(`  📊 Failed to copy trade to ${error.follower}`);
                break;
            case 'positionCloseFailed':
                console.log(`  📉 Failed to close position for ${error.follower}`);
                break;
            case 'maxReconnectAttemptsReached':
                console.log('  ❌ Max reconnection attempts reached');
                break;
            default:
                console.log('  ⚠️ Unknown error type');
        }
    });
}

// Utility function to test API connectivity
async function testApiConnectivity() {
    console.log('\n🔍 Testing API connectivity...');
    
    try {
        const testTrader = new DeltaExchangeCopyTrader(brokerConfig, []);
        
        // Test getting positions
        const positions = await testTrader.getCurrentPositions(brokerConfig);
        console.log('✅ API connectivity test passed');
        console.log(`📊 Current positions: ${Object.keys(positions).length} symbols`);
        
        return true;
    } catch (error) {
        console.error('❌ API connectivity test failed:', error.message);
        console.log('\nPossible issues:');
        console.log('- Invalid API credentials');
        console.log('- Network connectivity issues');
        console.log('- Delta Exchange API service down');
        return false;
    }
}

// Main execution
async function main() {
    console.log('🎯 Delta Exchange Copy Trading System Demo');
    console.log('=' .repeat(60));
    
    // Test API connectivity first
    const connectivityOk = await testApiConnectivity();
    if (!connectivityOk) {
        console.log('\n❌ Cannot proceed without API connectivity');
        process.exit(1);
    }
    
    // Run the demo
    await runDemo();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Run the demo
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    });
}

module.exports = { runDemo, testApiConnectivity }; 