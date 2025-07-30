const WebSocket = require('ws');
const crypto = require('crypto');
const axios = require('axios');
const EventEmitter = require('events');

class DeltaExchangeCopyTrader extends EventEmitter {
    constructor(brokerConfig, followerConfigs) {
        super();
        
        this.brokerConfig = brokerConfig;
        this.followerConfigs = followerConfigs;
        
        // WebSocket and API configuration
        this.websocketUrl = "wss://socket.india.delta.exchange";
        this.baseUrl = "https://api.india.delta.exchange";
        
        // Trading state tracking
        this.brokerPositions = {};
        this.followerPositions = {};
        this.processedOrders = new Set(); // Track processed order IDs
        this.orderQueue = []; // Queue for processing orders
        this.isProcessing = false;
        
        // WebSocket connection
        this.ws = null;
        this.isAuthenticated = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.heartbeatInterval = null;
        this.lastHeartbeat = Date.now();
        
        // Performance tracking
        this.stats = {
            totalTrades: 0,
            successfulCopies: 0,
            failedCopies: 0,
            totalVolume: 0,
            startTime: Date.now()
        };
        
        // Initialize follower positions tracking
        this.followerConfigs.forEach(config => {
            this.followerPositions[config.name] = {};
        });
        
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        this.on('brokerTrade', this.processBrokerTrade.bind(this));
        this.on('positionChange', this.processPositionChange.bind(this));
        this.on('error', (error) => {
            console.error('Copy Trader Error:', error);
        });
    }
    
    generateSignature(secret, message) {
        return crypto
            .createHmac('sha256', secret)
            .update(message)
            .digest('hex');
    }
    
    async makeAuthenticatedRequest(config, method, endpoint, payload = '', params = {}) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const path = `/v2${endpoint}`;
        
        // Build query string
        const queryString = Object.keys(params).length > 0 
            ? '?' + new URLSearchParams(params).toString()
            : '';
        
        // Prepare payload (body)
        const body = payload ? JSON.stringify(payload) : '';
        
        // Create signature data: method + timestamp + requestPath + queryParams + body
        const signatureData = method + timestamp + path + queryString + body;
        const signature = this.generateSignature(config.api_secret, signatureData);
        
        const headers = {
            'api-key': config.api_key,
            'timestamp': timestamp,
            'signature': signature,
            'User-Agent': 'nodejs-rest-client',
            'Content-Type': 'application/json'
        };
        
        const url = `${this.baseUrl}${path}`;
        
        try {
            let response;
            const axiosConfig = {
                headers,
                timeout: 30000
            };
            
            switch (method) {
                case 'GET':
                    response = await axios.get(url + queryString, axiosConfig);
                    break;
                case 'POST':
                    response = await axios.post(url + queryString, body, axiosConfig);
                    break;
                case 'DELETE':
                    response = await axios.delete(url, { ...axiosConfig, data: payload });
                    break;
                default:
                    throw new Error(`Unsupported HTTP method: ${method}`);
            }
            
            return response;
        } catch (error) {
            console.error(`API request failed for ${config.name}:`, error.message);
            if (error.response) {
                console.error(`Response status: ${error.response.status}`);
                console.error(`Response data:`, error.response.data);
            }
            throw error;
        }
    }
    
    async getCurrentPositions(config) {
        try {
            // For Delta Exchange India API, we need to get positions differently
            // Try without parameters first
            const response = await this.makeAuthenticatedRequest(config, 'GET', '/positions');
            const data = response.data;
            
            const positions = {};
            if (data.success && data.result) {
                data.result.forEach(position => {
                    const symbol = position.product_symbol;
                    positions[symbol] = {
                        size: parseFloat(position.size),
                        entry_price: parseFloat(position.entry_price),
                        product_id: position.product_id,
                        unrealized_pnl: parseFloat(position.unrealized_pnl || 0),
                        realized_pnl: parseFloat(position.realized_pnl || 0)
                    };
                });
            }
            
            return positions;
        } catch (error) {
            console.error(`Failed to get positions for ${config.name}:`, error.message);
            // Return empty positions instead of throwing - this allows the system to continue
            return {};
        }
    }
    
    async placeOrder(config, symbol, side, size, orderType = 'market_order', limitPrice = null, reduceOnly = false) {
        try {
            const orderData = {
                product_symbol: symbol,
                size: Math.abs(size),
                side: side,
                order_type: orderType,
                reduce_only: reduceOnly.toString()
            };
            
            if (orderType === 'limit_order' && limitPrice) {
                orderData.limit_price = limitPrice;
            }
            
            const payload = JSON.stringify(orderData);
            const response = await this.makeAuthenticatedRequest(config, 'POST', '/orders', payload);
            
            const result = response.data;
            if (result.success) {
                console.log(`✅ Order placed successfully for ${config.name}: ${side} ${size} ${symbol}`);
                return result.result;
            } else {
                console.error(`❌ Order failed for ${config.name}:`, result.error);
                return null;
            }
        } catch (error) {
            console.error(`Failed to place order for ${config.name}:`, error.message);
            return null;
        }
    }
    
    calculateFollowerSize(brokerSize, followerConfig) {
        const copyMode = followerConfig.copy_mode || 'multiplier';
        
        console.log(`📊 Calculating follower size for ${followerConfig.follower_name}:`);
        console.log(`   Copy Mode: ${copyMode}`);
        console.log(`   Broker Size: ${brokerSize}`);
        
        let followerSize = 0;
        
        if (copyMode === 'multiplier') {
            const multiplier = followerConfig.multiplier || 1.0;
            followerSize = brokerSize * multiplier;
            console.log(`   Multiplier: ${multiplier}`);
            console.log(`   Calculated Size: ${followerSize}`);
        } else if (copyMode === 'fixed_amount') {
            const fixedAmount = followerConfig.fixed_amount || 10; // Default $10
            const currentPrice = 1; // We'll need to get this from market data
            followerSize = fixedAmount / currentPrice;
            console.log(`   Fixed Amount: $${fixedAmount}`);
            console.log(`   Calculated Size: ${followerSize}`);
        } else if (copyMode === 'fixed_lot') {
            followerSize = followerConfig.fixed_lot || 0.001; // Default very small lot
            console.log(`   Fixed Lot: ${followerSize}`);
        } else {
            // Default to very small fixed lot for safety
            followerSize = 0.001;
            console.log(`   Default Size: ${followerSize}`);
        }
        
        // Apply minimum and maximum constraints
        const minLotSize = followerConfig.min_lot_size || 0.001;
        const maxLotSize = followerConfig.max_lot_size || 1.0;
        
        followerSize = Math.max(minLotSize, Math.min(maxLotSize, followerSize));
        
        console.log(`   Final Size (after constraints): ${followerSize}`);
        console.log(`   Min Lot: ${minLotSize}, Max Lot: ${maxLotSize}`);
        
        return followerSize;
    }
    
    async processOrderQueue() {
        if (this.isProcessing || this.orderQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        while (this.orderQueue.length > 0) {
            const orderData = this.orderQueue.shift();
            const { followerConfig, symbol, side, size, orderType, limitPrice, reduceOnly, brokerOrderId, brokerSize, brokerPrice } = orderData;
            
            try {
                const orderResult = await this.placeOrder(
                    followerConfig,
                    symbol,
                    side,
                    size,
                    orderType,
                    limitPrice,
                    reduceOnly
                );
                
                if (orderResult) {
                    this.stats.successfulCopies++;
                    this.stats.totalVolume += size;
                    this.emit('tradeCopied', {
                        follower: followerConfig.name,
                        symbol,
                        side,
                        size,
                        orderId: orderResult.id,
                        timestamp: Date.now(),
                        followerName: followerConfig.follower_name || followerConfig.name,
                        brokerName: this.brokerConfig.broker_name || this.brokerConfig.name,
                        brokerOrderId: brokerOrderId,
                        brokerSize: brokerSize,
                        brokerPrice: brokerPrice
                    });
                } else {
                    this.stats.failedCopies++;
                }
            } catch (error) {
                console.error('Error processing order from queue:', error.message);
                this.stats.failedCopies++;
                this.emit('error', {
                    type: 'queueProcessingError',
                    error: error.message
                });
            }
        }
        
        this.isProcessing = false;
    }
    
    async processBrokerTrade(tradeData) {
        try {
            const { symbol, side, size, order_id, average_fill_price, reduce_only } = tradeData;
            
            // Skip if already processed
            if (this.processedOrders.has(order_id)) {
                return;
            }
            
            this.processedOrders.add(order_id);
            this.stats.totalTrades++;
            
            console.log(`🔄 Processing broker trade: ${side} ${size} ${symbol} at ${average_fill_price}`);
            
            // Update broker position tracking
            if (!this.brokerPositions[symbol]) {
                this.brokerPositions[symbol] = 0;
            }
            
            if (side === 'buy') {
                this.brokerPositions[symbol] += size;
            } else {
                this.brokerPositions[symbol] -= size;
            }
            
            // Add orders to queue for processing
            this.followerConfigs.forEach(followerConfig => {
                const followerSize = this.calculateFollowerSize(size, followerConfig);
                
                this.orderQueue.push({
                    followerConfig,
                    symbol,
                    side,
                    size: followerSize,
                    orderType: 'market_order',
                    limitPrice: null,
                    reduceOnly: reduce_only || false,
                    brokerOrderId: order_id,
                    brokerSize: size,
                    brokerPrice: average_fill_price
                });
            });
            
            // Process queue
            setImmediate(() => {
                this.processOrderQueue();
            });
            
        } catch (error) {
            console.error('Error processing broker trade:', error.message);
            this.emit('error', { type: 'processingError', error: error.message });
        }
    }
    
    async processPositionChange(positionData) {
        try {
            const { symbol, size: newSize } = positionData;
            const newSizeFloat = parseFloat(newSize);
            
            // Check if this is a position closure (size = 0)
            if (newSizeFloat === 0 && this.brokerPositions[symbol]) {
                const oldSize = this.brokerPositions[symbol];
                if (oldSize !== 0) {
                    console.log(`🔄 Position closed detected: ${symbol} (was ${oldSize})`);
                    
                    // Close positions in all follower accounts
                    const promises = this.followerConfigs.map(async (followerConfig) => {
                        try {
                            const followerPositions = await this.getCurrentPositions(followerConfig);
                            
                            if (followerPositions[symbol]) {
                                const followerPositionSize = followerPositions[symbol].size;
                                
                                if (followerPositionSize !== 0) {
                                    const closeSide = followerPositionSize > 0 ? 'sell' : 'buy';
                                    const closeSize = Math.abs(followerPositionSize);
                                    
                                    await this.placeOrder(
                                        followerConfig,
                                        symbol,
                                        closeSide,
                                        Math.floor(closeSize),
                                        'market_order',
                                        null,
                                        true // reduce_only
                                    );
                                    
                                    console.log(`✅ Closed position for ${followerConfig.name}: ${symbol}`);
                                    this.emit('positionClosed', {
                                        follower: followerConfig.name,
                                        symbol,
                                        size: closeSize
                                    });
                                }
                            }
                        } catch (error) {
                            console.error(`Failed to close position for ${followerConfig.name}:`, error.message);
                            this.emit('error', {
                                type: 'positionCloseFailed',
                                follower: followerConfig.name,
                                error: error.message
                            });
                        }
                    });
                    
                    await Promise.allSettled(promises);
                }
            }
            
            // Update broker position tracking
            this.brokerPositions[symbol] = newSizeFloat;
            
        } catch (error) {
            console.error('Error processing position change:', error.message);
            this.emit('error', { type: 'positionProcessingError', error: error.message });
        }
    }
    
    setupWebSocket() {
        this.ws = new WebSocket(this.websocketUrl);
        
        this.ws.on('open', () => {
            console.log('🔗 WebSocket connection opened');
            this.reconnectAttempts = 0;
            this.authenticateWebSocket();
        });
        
        this.ws.on('message', (data) => {
            this.handleWebSocketMessage(data);
        });
        
        this.ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            this.emit('error', { type: 'websocketError', error: error.message });
        });
        
        this.ws.on('close', (code, reason) => {
            console.warn(`⚠️ WebSocket closed: ${code} - ${reason}`);
            this.isAuthenticated = false;
            this.stopHeartbeat();
            this.attemptReconnect();
        });
    }
    
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.ping();
                this.lastHeartbeat = Date.now();
            }
        }, 30000); // Send heartbeat every 30 seconds
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    authenticateWebSocket() {
        const method = 'GET';
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const path = '/live';
        
        // Delta Exchange WebSocket signature format: method + timestamp + path
        const signatureData = method + timestamp + path;
        const signature = this.generateSignature(this.brokerConfig.api_secret, signatureData);
        
        const authMessage = {
            type: 'auth',
            payload: {
                'api-key': this.brokerConfig.api_key,
                signature: signature,
                timestamp: timestamp
            }
        };
        
        console.log('🔐 Attempting WebSocket authentication...');
        console.log('   API Key:', this.brokerConfig.api_key.substring(0, 10) + '...');
        console.log('   Timestamp:', timestamp);
        console.log('   Signature Data:', signatureData);
        console.log('   Generated Signature:', signature);
        
        // Try alternative signature format if the first one fails
        setTimeout(() => {
            if (!this.isAuthenticated) {
                console.log('🔄 Trying alternative signature format...');
                
                // Alternative: just timestamp + path
                const altSignatureData = timestamp + path;
                const altSignature = this.generateSignature(this.brokerConfig.api_secret, altSignatureData);
                
                const altAuthMessage = {
                    type: 'auth',
                    payload: {
                        'api-key': this.brokerConfig.api_key,
                        signature: altSignature,
                        timestamp: timestamp
                    }
                };
                
                console.log('   Alternative Signature Data:', altSignatureData);
                console.log('   Alternative Signature:', altSignature);
                
                this.ws.send(JSON.stringify(altAuthMessage));
            }
        }, 2000);
        
        this.ws.send(JSON.stringify(authMessage));
    }
    
    subscribeToChannels() {
        // Subscribe to orders channel
        const ordersSubscription = {
            type: 'subscribe',
            payload: {
                channels: [
                    {
                        name: 'orders',
                        symbols: ['all']
                    }
                ]
            }
        };
        
        // Subscribe to positions channel
        const positionsSubscription = {
            type: 'subscribe',
            payload: {
                channels: [
                    {
                        name: 'positions',
                        symbols: ['all']
                    }
                ]
            }
        };
        
        // Subscribe to fills channel for direct trade detection
        const fillsSubscription = {
            type: 'subscribe',
            payload: {
                channels: [
                    {
                        name: 'fills',
                        symbols: ['all']
                    }
                ]
            }
        };
        
        this.ws.send(JSON.stringify(ordersSubscription));
        this.ws.send(JSON.stringify(positionsSubscription));
        this.ws.send(JSON.stringify(fillsSubscription));
        
        console.log('📡 Subscribed to orders, positions, and fills channels');
    }
    
    handleWebSocketMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            
            // Handle authentication success
            if (message.type === 'success' && message.message === 'Authenticated') {
                console.log('✅ WebSocket authenticated successfully');
                this.isAuthenticated = true;
                this.subscribeToChannels();
                this.startHeartbeat();
                this.emit('authenticated');
                return;
            }
            
            // Handle order updates (trade detection)
            if (message.type === 'orders') {
                console.log('📨 Received order update:', JSON.stringify(message, null, 2));
                
                const { reason, action, unfilled_size, size, status } = message;
                
                // Detect filled orders (completed trades) - multiple conditions
                const isFilled = reason === 'fill' || status === 'filled' || status === 'partially_filled';
                const isRelevantAction = ['update', 'create', 'fill'].includes(action);
                
                if (isFilled && isRelevantAction) {
                    const unfilledSize = unfilled_size || 0;
                    const totalSize = size || 0;
                    
                    // Process if order is fully or partially filled
                    if (unfilledSize < totalSize) {
                        const filledSize = totalSize - unfilledSize;
                        
                        const tradeData = {
                            symbol: message.symbol,
                            side: message.side,
                            size: filledSize,
                            order_id: message.order_id,
                            average_fill_price: message.average_fill_price || message.price,
                            reduce_only: message.reduce_only || false
                        };
                        
                        console.log('🎯 Trade detected:', tradeData);
                        
                        // Emit trade event for processing
                        setImmediate(() => {
                            this.emit('brokerTrade', tradeData);
                        });
                    }
                }
                
                // Also detect when orders are created (for immediate execution)
                if (action === 'create' && status === 'open') {
                    console.log('📝 New order created:', message.symbol, message.side, message.size);
                }
            }
            
            // Handle position updates (exit detection)
            else if (message.type === 'positions') {
                console.log('📨 Received position update:', JSON.stringify(message, null, 2));
                
                if (['update', 'delete', 'snapshot'].includes(message.action)) {
                    setImmediate(() => {
                        this.emit('positionChange', message);
                    });
                }
            }
            
            // Handle fills directly
            else if (message.type === 'fills') {
                console.log('📨 Received fill update:', JSON.stringify(message, null, 2));
                
                if (message.result && Array.isArray(message.result)) {
                    message.result.forEach(fill => {
                        const tradeData = {
                            symbol: fill.product_symbol,
                            side: fill.side,
                            size: parseFloat(fill.size),
                            order_id: fill.order_id,
                            average_fill_price: parseFloat(fill.price),
                            reduce_only: false
                        };
                        
                        console.log('🎯 Fill detected:', tradeData);
                        
                        setImmediate(() => {
                            this.emit('brokerTrade', tradeData);
                        });
                    });
                }
            }
            
            // Handle other message types for debugging
            else if (message.type !== 'subscriptions' && message.type !== 'pong') {
                console.log('📨 Received message:', JSON.stringify(message, null, 2));
            }
            
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error.message);
            console.error('Raw data:', data.toString());
        }
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached. Stopping reconnection.');
            this.emit('error', { type: 'maxReconnectAttemptsReached' });
            return;
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff
        
        console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            this.setupWebSocket();
        }, delay);
    }
    
    async initializePositions() {
        try {
            // Get initial broker positions
            this.brokerPositions = await this.getCurrentPositions(this.brokerConfig);
            console.log('📊 Initial broker positions:', this.brokerPositions);
            
            // Get initial follower positions
            for (const followerConfig of this.followerConfigs) {
                const positions = await this.getCurrentPositions(followerConfig);
                this.followerPositions[followerConfig.name] = positions;
                console.log(`📊 Initial ${followerConfig.name} positions:`, positions);
            }
        } catch (error) {
            console.error('Failed to initialize positions:', error.message);
            this.emit('error', { type: 'initializationError', error: error.message });
        }
    }
    
    async startMonitoring() {
        console.log(`🚀 Starting copy trading system - monitoring ${this.brokerConfig.name}`);
        
        try {
            // Initialize positions
            await this.initializePositions();
            
            // Start WebSocket connection
            this.setupWebSocket();
            
            this.emit('started');
            
        } catch (error) {
            console.error('Failed to start monitoring:', error.message);
            this.emit('error', { type: 'startupError', error: error.message });
        }
    }
    
    stopMonitoring() {
        console.log('🛑 Stopping copy trading system...');
        
        this.stopHeartbeat();
        
        if (this.ws) {
            this.ws.close();
        }
        
        this.isAuthenticated = false;
        this.emit('stopped');
        console.log('✅ Copy trading system stopped');
    }
    
    // Utility methods for monitoring
    getStatus() {
        return {
            isConnected: this.ws && this.ws.readyState === WebSocket.OPEN,
            isAuthenticated: this.isAuthenticated,
            brokerPositions: this.brokerPositions,
            followerPositions: this.followerPositions,
            processedOrdersCount: this.processedOrders.size,
            queueLength: this.orderQueue.length,
            isProcessing: this.isProcessing,
            uptime: Date.now() - this.stats.startTime
        };
    }
    
    getStats() {
        const successRate = this.stats.totalTrades > 0 
            ? `${((this.stats.successfulCopies / this.stats.totalTrades) * 100).toFixed(1)}%`
            : '0%';
            
        return {
            ...this.stats,
            successRate,
            averageVolume: this.stats.successfulCopies > 0 
                ? Math.round(this.stats.totalVolume / this.stats.successfulCopies)
                : 0
        };
    }
    
    clearProcessedOrders() {
        this.processedOrders.clear();
        console.log('🧹 Cleared processed orders cache');
    }
}

module.exports = DeltaExchangeCopyTrader; 