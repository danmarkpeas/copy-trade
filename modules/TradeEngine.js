const EventEmitter = require('events');
const { createClient } = require('@supabase/supabase-js');

class TradeEngine extends EventEmitter {
  constructor() {
    super();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Signal processing
    this.signalQueue = [];
    this.isProcessing = false;
    this.processedSignals = new Set();
    
    // Execution tracking
    this.executionStats = {
      totalSignals: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDelay: 0,
      lastSignalTime: null
    };
    
    // Retry configuration
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Process Trade Signal
   */
  async processSignal(signal, brokerId, userId) {
    try {
      console.log(`📡 Trade Engine: Processing signal from broker ${brokerId}:`, signal);
      
      // Add to queue
      this.signalQueue.push({
        signal,
        brokerId,
        userId,
        timestamp: Date.now(),
        retryCount: 0
      });
      
      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }
      
    } catch (error) {
      console.error(`❌ Trade Engine: Error processing signal:`, error);
      this.emit('error', error);
    }
  }

  /**
   * Process Signal Queue
   */
  async processQueue() {
    if (this.isProcessing || this.signalQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.signalQueue.length > 0) {
      const queueItem = this.signalQueue.shift();
      
      try {
        await this.processSignalItem(queueItem);
      } catch (error) {
        console.error(`❌ Trade Engine: Error processing signal item:`, error);
        
        // Retry if under max retries
        if (queueItem.retryCount < this.maxRetries) {
          queueItem.retryCount++;
          console.log(`🔄 Retrying signal (attempt ${queueItem.retryCount}/${this.maxRetries})`);
          
          setTimeout(() => {
            this.signalQueue.unshift(queueItem);
            this.processQueue();
          }, this.retryDelay * queueItem.retryCount);
        } else {
          console.error(`❌ Max retries reached for signal`);
          this.emit('signalFailed', { queueItem, error });
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process Individual Signal Item
   */
  async processSignalItem(queueItem) {
    const { signal, brokerId, userId, timestamp } = queueItem;
    
    try {
      // Verify signal
      if (!this.verifySignal(signal)) {
        throw new Error('Invalid signal format');
      }

      // Check for duplicate signals
      const signalId = this.generateSignalId(signal);
      if (this.processedSignals.has(signalId)) {
        console.log(`⚠️ Duplicate signal detected, skipping`);
        return;
      }

      // Get followers for this broker
      const followers = await this.getFollowersForBroker(brokerId);
      
      if (followers.length === 0) {
        console.log(`⚠️ No active followers found for broker ${brokerId}`);
        return;
      }

      console.log(`📤 Broadcasting signal to ${followers.length} followers`);

      // Broadcast signal to all followers
      const executionPromises = followers.map(follower => 
        this.executeSignalForFollower(signal, follower, userId)
      );

      // Wait for all executions to complete
      const results = await Promise.allSettled(executionPromises);
      
      // Process results
      let successCount = 0;
      let failureCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
        } else {
          failureCount++;
          console.error(`❌ Execution failed for follower ${followers[index].name}:`, result.reason);
        }
      });

      // Update stats
      this.updateExecutionStats(successCount, failureCount, timestamp);
      
      // Mark signal as processed
      this.processedSignals.add(signalId);
      
      // Emit completion event
      this.emit('signalProcessed', {
        signal,
        brokerId,
        userId,
        results: {
          total: followers.length,
          successful: successCount,
          failed: failureCount,
          delay: Date.now() - timestamp
        }
      });

      console.log(`✅ Signal processed: ${successCount} successful, ${failureCount} failed`);

    } catch (error) {
      console.error(`❌ Error processing signal item:`, error);
      throw error;
    }
  }

  /**
   * Verify Signal Format
   */
  verifySignal(signal) {
    try {
      // Check required fields
      const requiredFields = ['type', 'data'];
      for (const field of requiredFields) {
        if (!signal[field]) {
          console.error(`❌ Missing required field: ${field}`);
          return false;
        }
      }

      // Check signal type
      if (!['entry', 'exit'].includes(signal.type)) {
        console.error(`❌ Invalid signal type: ${signal.type}`);
        return false;
      }

      // Check trade data
      const tradeData = signal.data;
      const requiredTradeFields = ['symbol', 'side', 'size', 'price'];
      for (const field of requiredTradeFields) {
        if (!tradeData[field]) {
          console.error(`❌ Missing required trade field: ${field}`);
          return false;
        }
      }

      // Validate data types
      if (typeof tradeData.size !== 'number' || tradeData.size <= 0) {
        console.error(`❌ Invalid size: ${tradeData.size}`);
        return false;
      }

      if (typeof tradeData.price !== 'number' || tradeData.price <= 0) {
        console.error(`❌ Invalid price: ${tradeData.price}`);
        return false;
      }

      if (!['buy', 'sell'].includes(tradeData.side)) {
        console.error(`❌ Invalid side: ${tradeData.side}`);
        return false;
      }

      return true;

    } catch (error) {
      console.error(`❌ Signal verification error:`, error);
      return false;
    }
  }

  /**
   * Get Followers for Broker
   */
  async getFollowersForBroker(brokerId) {
    try {
      const { data: followers, error } = await this.supabase
        .from('followers')
        .select('*')
        .eq('master_broker_account_id', brokerId)
        .eq('account_status', 'active');

      if (error) {
        console.error(`❌ Error fetching followers:`, error);
        return [];
      }

      return followers || [];

    } catch (error) {
      console.error(`❌ Error getting followers:`, error);
      return [];
    }
  }

  /**
   * Execute Signal for Follower
   */
  async executeSignalForFollower(signal, follower, userId) {
    try {
      console.log(`📤 Executing signal for follower: ${follower.follower_name}`);
      
      // Create follower module instance
      const FollowerModule = require('./FollowerModule');
      const followerModule = new FollowerModule({
        name: follower.follower_name,
        api_key: follower.api_key,
        api_secret: follower.api_secret,
        multiplier: follower.multiplier || 1.0,
        risk_amount: follower.risk_amount || 0
      });

      // Initialize follower
      await followerModule.initialize();
      
      // Process signal
      await followerModule.processTradeSignal(signal);
      
      // Wait for execution to complete
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Execution timeout' });
        }, 10000); // 10 second timeout

        followerModule.once('tradeExecuted', (result) => {
          clearTimeout(timeout);
          resolve({ success: true, result });
        });

        followerModule.once('executionError', (error) => {
          clearTimeout(timeout);
          resolve({ success: false, error });
        });
      });

    } catch (error) {
      console.error(`❌ Error executing signal for follower:`, error);
      return { success: false, error };
    }
  }

  /**
   * Update Execution Statistics
   */
  updateExecutionStats(successCount, failureCount, signalTimestamp) {
    this.executionStats.totalSignals++;
    this.executionStats.successfulExecutions += successCount;
    this.executionStats.failedExecutions += failureCount;
    this.executionStats.lastSignalTime = new Date().toISOString();
    
    // Calculate average delay
    const delay = Date.now() - signalTimestamp;
    const totalSignals = this.executionStats.totalSignals;
    this.executionStats.averageDelay = 
      ((this.executionStats.averageDelay * (totalSignals - 1)) + delay) / totalSignals;
  }

  /**
   * Generate Signal ID
   */
  generateSignalId(signal) {
    const { type, data } = signal;
    return `${type}_${data.symbol}_${data.side}_${data.size}_${data.price}_${Date.now()}`;
  }

  /**
   * Get Execution Statistics
   */
  getStats() {
    return {
      ...this.executionStats,
      successRate: this.executionStats.totalSignals > 0 
        ? (this.executionStats.successfulExecutions / this.executionStats.totalSignals * 100).toFixed(2) + '%'
        : '0%',
      queueLength: this.signalQueue.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Clear Processed Signals (for cleanup)
   */
  clearProcessedSignals() {
    this.processedSignals.clear();
    console.log(`🧹 Cleared processed signals cache`);
  }

  /**
   * Stop Trade Engine
   */
  stop() {
    console.log(`⏹️ Stopping Trade Engine`);
    this.isProcessing = false;
    this.signalQueue = [];
    this.emit('stopped');
  }
}

module.exports = TradeEngine; 