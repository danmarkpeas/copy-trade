const axios = require('axios');
const crypto = require('crypto');
const EventEmitter = require('events');

class FollowerModule extends EventEmitter {
  constructor(followerConfig) {
    super();
    this.followerConfig = followerConfig;
    this.isActive = false;
    this.balance = 0;
    this.margin = 0;
    this.openPositions = new Map();
    this.tradeHistory = [];
    this.executionQueue = [];
    this.isProcessing = false;
    
    // Risk management
    this.maxRiskPerTrade = followerConfig.risk_amount || 0;
    this.maxOpenPositions = 5;
    this.maxDailyLoss = 1000; // USD
    this.dailyLoss = 0;
    this.lastResetDate = new Date().toDateString();
  }

  /**
   * Initialize Follower
   */
  async initialize() {
    try {
      console.log(`🚀 Initializing follower: ${this.followerConfig.name}`);
      
      // Verify API credentials
      const isValid = await this.verifyCredentials();
      if (!isValid) {
        throw new Error('Invalid API credentials');
      }

      // Get account balance and margin
      await this.updateAccountInfo();
      
      // Get current positions
      await this.updatePositions();
      
      this.isActive = true;
      console.log(`✅ Follower initialized: ${this.followerConfig.name}`);
      this.emit('initialized', this.followerConfig.name);
      
    } catch (error) {
      console.error(`❌ Follower initialization failed:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Verify API Credentials
   */
  async verifyCredentials() {
    try {
      console.log(`🔍 Verifying follower credentials: ${this.followerConfig.name}`);
      
      const timestamp = Date.now();
      const signature = this.generateSignature(timestamp);

      const response = await axios.get('https://api.india.delta.exchange/v2/positions', {
        headers: {
          'api-key': this.followerConfig.api_key,
          'timestamp': timestamp,
          'signature': signature
        }
      });

      if (response.status === 200) {
        console.log(`✅ Follower credentials verified: ${this.followerConfig.name}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Credential verification failed:`, error.message);
      return false;
    }
  }

  /**
   * Update Account Information
   */
  async updateAccountInfo() {
    try {
      const timestamp = Date.now();
      const signature = this.generateSignature(timestamp);

      const response = await axios.get('https://api.india.delta.exchange/v2/wallet/balances', {
        headers: {
          'api-key': this.followerConfig.api_key,
          'timestamp': timestamp,
          'signature': signature
        }
      });

      if (response.status === 200 && response.data.success) {
        const balances = response.data.result;
        this.balance = balances.find(b => b.currency === 'USDT')?.balance || 0;
        this.margin = balances.find(b => b.currency === 'USDT')?.margin_balance || 0;
        
        console.log(`💰 Account updated - Balance: ${this.balance} USDT, Margin: ${this.margin} USDT`);
      }
    } catch (error) {
      console.error(`❌ Error updating account info:`, error.message);
    }
  }

  /**
   * Update Positions
   */
  async updatePositions() {
    try {
      const timestamp = Date.now();
      const signature = this.generateSignature(timestamp);

      const response = await axios.get('https://api.india.delta.exchange/v2/positions', {
        headers: {
          'api-key': this.followerConfig.api_key,
          'timestamp': timestamp,
          'signature': signature
        }
      });

      if (response.status === 200 && response.data.success) {
        this.openPositions.clear();
        
        response.data.result.forEach(position => {
          if (parseFloat(position.size) !== 0) {
            this.openPositions.set(position.product_symbol, {
              symbol: position.product_symbol,
              size: parseFloat(position.size),
              side: position.side,
              averagePrice: parseFloat(position.average_price),
              unrealizedPnl: parseFloat(position.unrealized_pnl)
            });
          }
        });

        console.log(`📊 Positions updated: ${this.openPositions.size} open positions`);
      }
    } catch (error) {
      console.error(`❌ Error updating positions:`, error.message);
    }
  }

  /**
   * Process Trade Signal
   */
  async processTradeSignal(signal) {
    try {
      console.log(`📡 Processing trade signal for ${this.followerConfig.name}:`, signal);
      
      // Add to execution queue
      this.executionQueue.push(signal);
      
      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }
      
    } catch (error) {
      console.error(`❌ Error processing trade signal:`, error);
      this.emit('error', error);
    }
  }

  /**
   * Process Execution Queue
   */
  async processQueue() {
    if (this.isProcessing || this.executionQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.executionQueue.length > 0) {
      const signal = this.executionQueue.shift();
      
      try {
        if (signal.type === 'entry') {
          await this.executeEntry(signal.data);
        } else if (signal.type === 'exit') {
          await this.executeExit(signal.data);
        }
      } catch (error) {
        console.error(`❌ Error executing signal:`, error);
        this.emit('executionError', { signal, error });
      }
    }

    this.isProcessing = false;
  }

  /**
   * Execute Entry Trade
   */
  async executeEntry(tradeData) {
    try {
      console.log(`📈 Executing entry for ${this.followerConfig.name}:`, tradeData);
      
      // Check risk management rules
      if (!this.checkRiskManagement(tradeData)) {
        console.log(`⚠️ Risk management check failed for ${this.followerConfig.name}`);
        return;
      }

      // Calculate position size
      const positionSize = this.calculatePositionSize(tradeData);
      
      if (positionSize <= 0) {
        console.log(`⚠️ Invalid position size for ${this.followerConfig.name}`);
        return;
      }

      // Place order
      const orderResult = await this.placeOrder({
        symbol: tradeData.symbol,
        side: tradeData.side,
        size: positionSize,
        order_type: 'market'
      });

      if (orderResult.success) {
        console.log(`✅ Entry executed successfully for ${this.followerConfig.name}`);
        
        // Update positions
        await this.updatePositions();
        
        // Emit success event
        this.emit('tradeExecuted', {
          type: 'entry',
          follower: this.followerConfig.name,
          tradeData: tradeData,
          executedSize: positionSize,
          orderId: orderResult.order_id
        });

        // Add to trade history
        this.tradeHistory.push({
          ...tradeData,
          executedSize: positionSize,
          orderId: orderResult.order_id,
          timestamp: new Date().toISOString()
        });

      } else {
        console.error(`❌ Entry execution failed for ${this.followerConfig.name}:`, orderResult);
        this.emit('executionError', { tradeData, error: orderResult });
      }

    } catch (error) {
      console.error(`❌ Error executing entry:`, error);
      this.emit('executionError', { tradeData, error });
    }
  }

  /**
   * Execute Exit Trade
   */
  async executeExit(tradeData) {
    try {
      console.log(`📉 Executing exit for ${this.followerConfig.name}:`, tradeData);
      
      // Check if we have an open position for this symbol
      const position = this.openPositions.get(tradeData.symbol);
      
      if (!position) {
        console.log(`⚠️ No open position found for ${tradeData.symbol}`);
        return;
      }

      // Place exit order
      const orderResult = await this.placeOrder({
        symbol: tradeData.symbol,
        side: position.side === 'buy' ? 'sell' : 'buy',
        size: position.size,
        order_type: 'market',
        reduce_only: true
      });

      if (orderResult.success) {
        console.log(`✅ Exit executed successfully for ${this.followerConfig.name}`);
        
        // Update positions
        await this.updatePositions();
        
        // Emit success event
        this.emit('tradeExecuted', {
          type: 'exit',
          follower: this.followerConfig.name,
          tradeData: tradeData,
          executedSize: position.size,
          orderId: orderResult.order_id
        });

      } else {
        console.error(`❌ Exit execution failed for ${this.followerConfig.name}:`, orderResult);
        this.emit('executionError', { tradeData, error: orderResult });
      }

    } catch (error) {
      console.error(`❌ Error executing exit:`, error);
      this.emit('executionError', { tradeData, error });
    }
  }

  /**
   * Place Order
   */
  async placeOrder(orderData) {
    try {
      const timestamp = Date.now();
      const signature = this.generateSignature(timestamp);

      const payload = {
        product_id: orderData.symbol,
        side: orderData.side,
        size: orderData.size.toString(),
        order_type: orderData.order_type,
        reduce_only: orderData.reduce_only || false
      };

      const response = await axios.post('https://api.india.delta.exchange/v2/orders', payload, {
        headers: {
          'api-key': this.followerConfig.api_key,
          'timestamp': timestamp,
          'signature': signature,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 && response.data.success) {
        return {
          success: true,
          order_id: response.data.result.order_id,
          status: response.data.result.status
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Order placement failed'
        };
      }

    } catch (error) {
      console.error(`❌ Order placement error:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Risk Management Checks
   */
  checkRiskManagement(tradeData) {
    try {
      // Reset daily loss if it's a new day
      const today = new Date().toDateString();
      if (today !== this.lastResetDate) {
        this.dailyLoss = 0;
        this.lastResetDate = today;
      }

      // Check daily loss limit
      if (this.dailyLoss >= this.maxDailyLoss) {
        console.log(`⚠️ Daily loss limit reached: ${this.dailyLoss}/${this.maxDailyLoss}`);
        return false;
      }

      // Check max open positions
      if (this.openPositions.size >= this.maxOpenPositions) {
        console.log(`⚠️ Max open positions reached: ${this.openPositions.size}/${this.maxOpenPositions}`);
        return false;
      }

      // Check if we already have a position in this symbol
      if (this.openPositions.has(tradeData.symbol)) {
        console.log(`⚠️ Already have position in ${tradeData.symbol}`);
        return false;
      }

      return true;

    } catch (error) {
      console.error(`❌ Risk management check error:`, error);
      return false;
    }
  }

  /**
   * Calculate Position Size
   */
  calculatePositionSize(tradeData) {
    try {
      let positionSize = 0;

      if (this.maxRiskPerTrade > 0) {
        // Use fixed risk amount
        positionSize = this.maxRiskPerTrade / tradeData.price;
      } else {
        // Use multiplier
        positionSize = tradeData.size * this.followerConfig.multiplier;
      }

      // Ensure minimum size
      if (positionSize < 0.001) {
        positionSize = 0.001;
      }

      // Round to 8 decimal places
      return Math.round(positionSize * 100000000) / 100000000;

    } catch (error) {
      console.error(`❌ Position size calculation error:`, error);
      return 0;
    }
  }

  /**
   * Get Status
   */
  getStatus() {
    return {
      followerName: this.followerConfig.name,
      isActive: this.isActive,
      balance: this.balance,
      margin: this.margin,
      openPositions: Array.from(this.openPositions.values()),
      tradeHistory: this.tradeHistory.slice(-10), // Last 10 trades
      queueLength: this.executionQueue.length,
      isProcessing: this.isProcessing,
      dailyLoss: this.dailyLoss,
      maxDailyLoss: this.maxDailyLoss
    };
  }

  /**
   * Stop Follower
   */
  stop() {
    console.log(`⏹️ Stopping follower: ${this.followerConfig.name}`);
    this.isActive = false;
    this.emit('stopped');
  }

  /**
   * Utility Functions
   */
  generateSignature(timestamp) {
    const message = timestamp.toString();
    return crypto.createHmac('sha256', this.followerConfig.api_secret)
      .update(message)
      .digest('hex');
  }
}

module.exports = FollowerModule; 