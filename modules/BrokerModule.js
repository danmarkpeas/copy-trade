const WebSocket = require('ws');
const axios = require('axios');
const crypto = require('crypto');
const EventEmitter = require('events');

class BrokerModule extends EventEmitter {
  constructor(brokerConfig) {
    super();
    this.brokerConfig = brokerConfig;
    this.ws = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.heartbeatInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    
    // Trade tracking
    this.activePositions = new Map();
    this.tradeHistory = [];
    this.lastTradeId = null;
  }

  /**
   * Initialize Broker Connection
   */
  async initialize() {
    try {
      console.log(`🚀 Initializing broker: ${this.brokerConfig.name}`);
      
      // Verify API credentials first
      const isValid = await this.verifyCredentials();
      if (!isValid) {
        throw new Error('Invalid API credentials');
      }

      // Connect to WebSocket
      await this.connectWebSocket();
      
      // Start monitoring
      this.startMonitoring();
      
      console.log(`✅ Broker initialized: ${this.brokerConfig.name}`);
      this.emit('initialized', this.brokerConfig.name);
      
    } catch (error) {
      console.error(`❌ Broker initialization failed:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Verify API Credentials
   */
  async verifyCredentials() {
    try {
      console.log(`🔍 Verifying broker credentials: ${this.brokerConfig.name}`);
      
      const timestamp = Date.now();
      const signature = this.generateSignature(timestamp);

      const response = await axios.get('https://api.india.delta.exchange/v2/positions', {
        headers: {
          'api-key': this.brokerConfig.api_key,
          'timestamp': timestamp,
          'signature': signature
        }
      });

      if (response.status === 200) {
        console.log(`✅ Broker credentials verified: ${this.brokerConfig.name}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Credential verification failed:`, error.message);
      return false;
    }
  }

  /**
   * Connect to WebSocket
   */
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔗 Connecting to Delta Exchange WebSocket...`);
        
        this.ws = new WebSocket('wss://api.india.delta.exchange/ws');
        
        this.ws.on('open', () => {
          console.log(`✅ WebSocket connected`);
          this.isConnected = true;
          this.authenticateWebSocket();
        });

        this.ws.on('message', (data) => {
          this.handleWebSocketMessage(JSON.parse(data));
        });

        this.ws.on('close', () => {
          console.log(`🔌 WebSocket disconnected`);
          this.isConnected = false;
          this.isAuthenticated = false;
          this.handleReconnect();
        });

        this.ws.on('error', (error) => {
          console.error(`❌ WebSocket error:`, error);
          this.emit('error', error);
          reject(error);
        });

        // Set timeout for connection
        setTimeout(() => {
          if (!this.isAuthenticated) {
            reject(new Error('WebSocket authentication timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Authenticate WebSocket
   */
  authenticateWebSocket() {
    try {
      const timestamp = Date.now();
      const signature = this.generateSignature(timestamp);

      const authMessage = {
        type: 'subscribe',
        payload: {
          channels: [
            {
              name: 'auth',
              symbols: ['all']
            }
          ]
        }
      };

      this.ws.send(JSON.stringify(authMessage));
      
      // Subscribe to trade channels
      this.subscribeToChannels();
      
    } catch (error) {
      console.error(`❌ WebSocket authentication error:`, error);
    }
  }

  /**
   * Subscribe to Trade Channels
   */
  subscribeToChannels() {
    try {
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
      
      console.log(`📡 Subscribed to orders, positions, and fills channels`);
      
    } catch (error) {
      console.error(`❌ Channel subscription error:`, error);
    }
  }

  /**
   * Handle WebSocket Messages
   */
  handleWebSocketMessage(message) {
    try {
      // Handle authentication response
      if (message.type === 'auth') {
        if (message.success) {
          console.log(`🔐 WebSocket authenticated successfully`);
          this.isAuthenticated = true;
          this.startHeartbeat();
          this.emit('authenticated');
        } else {
          console.error(`❌ WebSocket authentication failed:`, message);
        }
        return;
      }

      // Handle fills (direct trade detection)
      if (message.type === 'fills') {
        console.log(`📨 Received fill update:`, JSON.stringify(message, null, 2));
        
        if (message.result && Array.isArray(message.result)) {
          message.result.forEach(fill => {
            this.processTradeFill(fill);
          });
        }
        return;
      }

      // Handle orders
      if (message.type === 'orders') {
        console.log(`📨 Received order update:`, JSON.stringify(message, null, 2));
        
        if (message.result && Array.isArray(message.result)) {
          message.result.forEach(order => {
            this.processOrderUpdate(order);
          });
        }
        return;
      }

      // Handle positions
      if (message.type === 'positions') {
        console.log(`📨 Received position update:`, JSON.stringify(message, null, 2));
        this.updatePositions(message.result || []);
        return;
      }

      // Handle pong responses
      if (message.type === 'pong') {
        return;
      }

      // Log other messages
      if (message.type !== 'subscriptions') {
        console.log(`📨 Received message:`, JSON.stringify(message, null, 2));
      }

    } catch (error) {
      console.error(`❌ Error handling WebSocket message:`, error);
    }
  }

  /**
   * Process Trade Fill
   */
  processTradeFill(fill) {
    try {
      const tradeData = {
        tradeId: fill.order_id,
        symbol: fill.product_symbol,
        side: fill.side,
        size: parseFloat(fill.size),
        price: parseFloat(fill.price),
        timestamp: new Date().toISOString(),
        brokerId: this.brokerConfig.id,
        brokerName: this.brokerConfig.name
      };

      console.log(`🎯 Trade fill detected:`, tradeData);
      
      // Emit trade signal
      this.emit('tradeSignal', {
        type: 'entry',
        data: tradeData
      });

      // Update trade history
      this.tradeHistory.push(tradeData);
      
    } catch (error) {
      console.error(`❌ Error processing trade fill:`, error);
    }
  }

  /**
   * Process Order Update
   */
  processOrderUpdate(order) {
    try {
      // Check if order is filled
      const isFilled = order.status === 'filled' || 
                      order.status === 'partially_filled' ||
                      order.reason === 'filled';

      if (isFilled) {
        const tradeData = {
          tradeId: order.order_id,
          symbol: order.product_symbol,
          side: order.side,
          size: parseFloat(order.size),
          price: parseFloat(order.average_fill_price || order.price),
          timestamp: new Date().toISOString(),
          brokerId: this.brokerConfig.id,
          brokerName: this.brokerConfig.name
        };

        console.log(`🎯 Order filled detected:`, tradeData);
        
        // Emit trade signal
        this.emit('tradeSignal', {
          type: 'entry',
          data: tradeData
        });

        // Update trade history
        this.tradeHistory.push(tradeData);
      }

    } catch (error) {
      console.error(`❌ Error processing order update:`, error);
    }
  }

  /**
   * Update Positions
   */
  updatePositions(positions) {
    try {
      this.activePositions.clear();
      
      positions.forEach(position => {
        if (parseFloat(position.size) !== 0) {
          this.activePositions.set(position.product_symbol, {
            symbol: position.product_symbol,
            size: parseFloat(position.size),
            side: position.side,
            averagePrice: parseFloat(position.average_price),
            unrealizedPnl: parseFloat(position.unrealized_pnl)
          });
        }
      });

      console.log(`📊 Updated positions: ${this.activePositions.size} active positions`);
      
    } catch (error) {
      console.error(`❌ Error updating positions:`, error);
    }
  }

  /**
   * Start Heartbeat
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Handle Reconnection
   */
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connectWebSocket();
      }, this.reconnectDelay);
    } else {
      console.error(`❌ Max reconnection attempts reached`);
      this.emit('error', new Error('Max reconnection attempts reached'));
    }
  }

  /**
   * Start Monitoring
   */
  startMonitoring() {
    console.log(`👀 Started monitoring broker: ${this.brokerConfig.name}`);
    this.emit('monitoringStarted');
  }

  /**
   * Stop Monitoring
   */
  stopMonitoring() {
    console.log(`⏹️ Stopping monitoring for broker: ${this.brokerConfig.name}`);
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.ws) {
      this.ws.close();
    }
    
    this.isConnected = false;
    this.isAuthenticated = false;
    this.emit('monitoringStopped');
  }

  /**
   * Get Status
   */
  getStatus() {
    return {
      brokerName: this.brokerConfig.name,
      isConnected: this.isConnected,
      isAuthenticated: this.isAuthenticated,
      activePositions: Array.from(this.activePositions.values()),
      tradeHistory: this.tradeHistory.slice(-10), // Last 10 trades
      uptime: process.uptime()
    };
  }

  /**
   * Utility Functions
   */
  generateSignature(timestamp) {
    const message = timestamp.toString();
    return crypto.createHmac('sha256', this.brokerConfig.api_secret)
      .update(message)
      .digest('hex');
  }
}

module.exports = BrokerModule; 