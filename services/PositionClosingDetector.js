const WebSocket = require('ws');
const crypto = require('crypto');

class PositionClosingDetector {
    constructor(apiKey, apiSecret) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.ws = null;
        this.positions = new Map(); // Track current positions
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
        this.onPositionClosedCallback = null;
        this.onPositionOpenedCallback = null;
    }

    generateSignature(secret, message) {
        return crypto
            .createHmac('sha256', secret)
            .update(message)
            .digest('hex');
    }

    connect() {
        this.ws = new WebSocket('wss://socket.india.delta.exchange');
        
        this.ws.on('open', () => {
            console.log('🔗 WebSocket connected for position monitoring');
            this.reconnectAttempts = 0;
            this.authenticate();
        });

        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(message);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });

        this.ws.on('close', (code, reason) => {
            console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
            this.handleReconnect();
        });

        this.ws.on('error', (error) => {
            console.error('🚨 WebSocket error:', error);
        });
    }

    authenticate() {
        const method = 'GET';
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const path = '/live';
        const signatureData = method + timestamp + path;
        const signature = this.generateSignature(this.apiSecret, signatureData);

        const authMessage = {
            type: 'auth',
            payload: {
                'api-key': this.apiKey,
                signature: signature,
                timestamp: timestamp
            }
        };

        this.ws.send(JSON.stringify(authMessage));
        console.log('🔐 Position monitoring authentication sent');
    }

    handleMessage(message) {
        switch (message.type) {
            case 'success':
                if (message.message === 'Authenticated') {
                    console.log('✅ Position monitoring authentication successful');
                    this.subscribeToChannels();
                }
                break;

            case 'positions':
                this.handlePositionUpdate(message);
                break;

            case 'v2/user_trades':
                this.handleTradeUpdate(message);
                break;

            case 'orders':
                this.handleOrderUpdate(message);
                break;

            default:
                // Only log non-standard messages
                if (message.type && !['heartbeat', 'subscription'].includes(message.type)) {
                    console.log('📨 Position monitoring message:', message);
                }
        }
    }

    subscribeToChannels() {
        // Subscribe to positions channel
        this.subscribe('positions', ['all']);
        
        // Subscribe to user trades for fill notifications
        this.subscribe('v2/user_trades', ['all']);
        
        // Subscribe to orders for order status changes
        this.subscribe('orders', ['all']);
        
        console.log('📡 Position monitoring subscribed to all channels');
    }

    subscribe(channelName, symbols) {
        const subscribeMessage = {
            type: 'subscribe',
            payload: {
                channels: [{
                    name: channelName,
                    symbols: symbols
                }]
            }
        };
        
        this.ws.send(JSON.stringify(subscribeMessage));
    }

    handlePositionUpdate(data) {
        const symbol = data.symbol;
        const action = data.action;
        const size = data.size;
        const previousPosition = this.positions.get(symbol);

        console.log(`📊 Position update for ${symbol}:`, {
            action,
            size,
            previousSize: previousPosition?.size || 0
        });

        switch (action) {
            case 'delete':
                console.log(`🔴 Position CLOSED (deleted): ${symbol}`);
                this.onPositionClosed(symbol, data, 'delete');
                this.positions.delete(symbol);
                break;

            case 'create':
                console.log(`🟢 Position OPENED: ${symbol} - Size: ${size}`);
                this.positions.set(symbol, data);
                this.onPositionOpened(symbol, data);
                break;

            case 'update':
                const oldSize = previousPosition?.size || 0;
                
                if (oldSize !== 0 && size === 0) {
                    console.log(`🔴 Position CLOSED (size=0): ${symbol}`);
                    this.onPositionClosed(symbol, data, 'size_zero');
                    this.positions.delete(symbol);
                } else if (Math.abs(oldSize) > Math.abs(size) && size !== 0) {
                    console.log(`📉 Position REDUCED: ${symbol} - ${oldSize} → ${size}`);
                    this.positions.set(symbol, data);
                    this.onPositionReduced(symbol, data, oldSize, size);
                } else {
                    console.log(`📊 Position UPDATED: ${symbol} - ${oldSize} → ${size}`);
                    this.positions.set(symbol, data);
                }
                break;

            case 'snapshot':
                // Handle initial snapshot
                if (Array.isArray(data.result)) {
                    data.result.forEach(position => {
                        this.positions.set(position.symbol, position);
                    });
                    console.log(`📸 Position snapshot loaded: ${data.result.length} positions`);
                }
                break;
        }
    }

    handleTradeUpdate(data) {
        const symbol = data.sy;
        const positionAfter = data.po; // Position after this fill
        const fillSize = data.s;
        const side = data.S;
        const price = data.p;
        const reason = data.R; // "normal" or "adl"

        console.log(`💰 Fill executed: ${symbol} - ${side} ${fillSize} @ ${price}`);

        // Check if position was closed via this fill
        if (positionAfter === 0) {
            console.log(`🔴 Position CLOSED via fill: ${symbol}`);
            console.log(`   Fill details: ${side} ${fillSize} contracts @ ${price}`);
            console.log(`   Reason: ${reason}`);
            
            this.onPositionClosedViaFill(symbol, data);
            this.positions.delete(symbol);
        }

        // Check for ADL (Auto Deleveraging)
        if (reason === 'adl') {
            console.log(`⚠️ ADL executed for ${symbol}`);
            this.onADLExecution(symbol, data);
        }
    }

    handleOrderUpdate(data) {
        // Monitor order status changes that might indicate position changes
        const symbol = data.product_symbol;
        const state = data.state;
        const orderType = data.order_type;

        if (state === 'filled' && (orderType === 'market_order' || orderType === 'limit_order')) {
            console.log(`📋 Order filled: ${symbol} - ${data.side} ${data.size}`);
        }
    }

    // Event handlers - Override these in your implementation
    onPositionClosed(symbol, positionData, reason) {
        console.log(`🎯 Position closed event: ${symbol} (${reason})`);
        
        // Call the callback if set
        if (this.onPositionClosedCallback) {
            this.onPositionClosedCallback(symbol, positionData, reason);
        }
    }

    onPositionOpened(symbol, positionData) {
        console.log(`🎯 Position opened event: ${symbol}`);
        
        // Call the callback if set
        if (this.onPositionOpenedCallback) {
            this.onPositionOpenedCallback(symbol, positionData);
        }
    }

    onPositionReduced(symbol, positionData, oldSize, newSize) {
        console.log(`🎯 Position reduced event: ${symbol} - ${oldSize} → ${newSize}`);
    }

    onPositionClosedViaFill(symbol, fillData) {
        console.log(`🎯 Position closed via fill: ${symbol}`);
        
        // Call the position closed callback
        if (this.onPositionClosedCallback) {
            this.onPositionClosedCallback(symbol, fillData, 'fill');
        }
    }

    onADLExecution(symbol, fillData) {
        console.log(`🎯 ADL execution: ${symbol}`);
    }

    // Set callbacks for position events
    setPositionClosedCallback(callback) {
        this.onPositionClosedCallback = callback;
    }

    setPositionOpenedCallback(callback) {
        this.onPositionOpenedCallback = callback;
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect position monitoring (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('❌ Max reconnection attempts reached for position monitoring');
        }
    }

    start() {
        console.log('🚀 Starting position closing detector...');
        this.connect();
    }

    stop() {
        if (this.ws) {
            this.ws.close();
            console.log('🛑 Position detector stopped');
        }
    }

    getCurrentPositions() {
        return Array.from(this.positions.values());
    }
}

module.exports = PositionClosingDetector; 