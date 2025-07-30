const UserModule = require('./UserModule');
const BrokerModule = require('./BrokerModule');
const FollowerModule = require('./FollowerModule');
const TradeEngine = require('./TradeEngine');
const EventEmitter = require('events');

class CopyTradingOrchestrator extends EventEmitter {
  constructor() {
    super();
    
    // Initialize modules
    this.userModule = new UserModule();
    this.tradeEngine = new TradeEngine();
    
    // User sessions and active systems
    this.userSessions = new Map(); // Map<userId, { email, lastActive }>
    this.brokerModules = new Map(); // Map<userId, BrokerModule>
    this.followerModules = new Map(); // Map<followerId, FollowerModule>
    
    // System state
    this.isRunning = false;
    this.stats = {
      totalUsers: 0,
      activeBrokers: 0,
      activeFollowers: 0,
      totalSignals: 0,
      successfulCopies: 0,
      failedCopies: 0
    };
  }

  /**
   * Initialize System
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Copy Trading Orchestrator...');
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isRunning = true;
      console.log('✅ Copy Trading Orchestrator initialized');
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Orchestrator initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Setup Event Listeners
   */
  setupEventListeners() {
    // Trade Engine events
    this.tradeEngine.on('signalProcessed', (data) => {
      console.log(`📊 Signal processed: ${data.results.successful}/${data.results.total} successful`);
      this.updateStats(data.results);
      this.emit('signalProcessed', data);
    });

    this.tradeEngine.on('signalFailed', (data) => {
      console.error(`❌ Signal failed:`, data);
      this.emit('signalFailed', data);
    });

    this.tradeEngine.on('error', (error) => {
      console.error(`❌ Trade Engine error:`, error);
      this.emit('error', error);
    });
  }

  /**
   * Register User Session
   */
  async registerUser(userId, email) {
    try {
      console.log(`👤 Registering user session: ${email} (${userId})`);
      
      // Authenticate user
      const user = await this.userModule.authenticateUser(userId, email);
      
      // Update user session
      this.userSessions.set(userId, {
        email: email,
        lastActive: new Date().toISOString(),
        user: user
      });
      
      // Initialize copy trading for this user
      await this.initializeUserCopyTrading(userId);
      
      console.log(`✅ User session registered: ${email}`);
      this.emit('userRegistered', { userId, email });
      
      return user;
      
    } catch (error) {
      console.error(`❌ Error registering user:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Initialize Copy Trading for User
   */
  async initializeUserCopyTrading(userId) {
    try {
      console.log(`🔧 Initializing copy trading for user: ${userId}`);
      
      // Get user's accounts
      const accounts = await this.userModule.getUserAccounts(userId);
      
      // Initialize broker module if user has active broker
      if (accounts.brokers.length > 0) {
        const broker = accounts.brokers[0]; // Use first active broker
        await this.initializeBrokerModule(userId, broker);
      }
      
      // Initialize follower modules if user has followers
      if (accounts.followers.length > 0) {
        for (const follower of accounts.followers) {
          await this.initializeFollowerModule(follower.id, follower);
        }
      }
      
      console.log(`✅ Copy trading initialized for user: ${userId}`);
      
    } catch (error) {
      console.error(`❌ Error initializing user copy trading:`, error);
      throw error;
    }
  }

  /**
   * Initialize Broker Module
   */
  async initializeBrokerModule(userId, brokerConfig) {
    try {
      console.log(`📈 Initializing broker module: ${brokerConfig.account_name}`);
      
      // Create broker module
      const brokerModule = new BrokerModule({
        id: brokerConfig.id,
        name: brokerConfig.account_name,
        api_key: brokerConfig.api_key,
        api_secret: brokerConfig.api_secret
      });
      
      // Set up event listeners
      brokerModule.on('tradeSignal', (signal) => {
        console.log(`📡 Broker trade signal: ${signal.type} ${signal.data.symbol}`);
        this.tradeEngine.processSignal(signal, brokerConfig.id, userId);
      });
      
      brokerModule.on('error', (error) => {
        console.error(`❌ Broker module error:`, error);
        this.emit('error', error);
      });
      
      // Initialize broker
      await brokerModule.initialize();
      
      // Store broker module
      this.brokerModules.set(userId, brokerModule);
      
      console.log(`✅ Broker module initialized: ${brokerConfig.account_name}`);
      this.emit('brokerInitialized', { userId, brokerName: brokerConfig.account_name });
      
    } catch (error) {
      console.error(`❌ Error initializing broker module:`, error);
      throw error;
    }
  }

  /**
   * Initialize Follower Module
   */
  async initializeFollowerModule(followerId, followerConfig) {
    try {
      console.log(`👥 Initializing follower module: ${followerConfig.follower_name}`);
      
      // Create follower module
      const followerModule = new FollowerModule({
        name: followerConfig.follower_name,
        api_key: followerConfig.api_key,
        api_secret: followerConfig.api_secret,
        multiplier: followerConfig.multiplier || 1.0,
        risk_amount: followerConfig.risk_amount || 0
      });
      
      // Set up event listeners
      followerModule.on('tradeExecuted', (result) => {
        console.log(`✅ Follower trade executed: ${result.follower} - ${result.type}`);
        this.emit('followerTradeExecuted', result);
      });
      
      followerModule.on('executionError', (error) => {
        console.error(`❌ Follower execution error:`, error);
        this.emit('followerError', error);
      });
      
      // Initialize follower
      await followerModule.initialize();
      
      // Store follower module
      this.followerModules.set(followerId, followerModule);
      
      console.log(`✅ Follower module initialized: ${followerConfig.follower_name}`);
      this.emit('followerInitialized', { followerId, followerName: followerConfig.follower_name });
      
    } catch (error) {
      console.error(`❌ Error initializing follower module:`, error);
      throw error;
    }
  }

  /**
   * Connect Exchange Account
   */
  async connectExchangeAccount(userId, accountData) {
    try {
      console.log(`🔗 Connecting exchange account for user: ${userId}`);
      
      const result = await this.userModule.connectExchangeAccount(userId, accountData);
      
      // If broker account was created, initialize it
      if (result.type === 'broker') {
        await this.initializeBrokerModule(userId, result.data);
      }
      
      // If follower account was created, initialize it
      if (result.type === 'follower') {
        await this.initializeFollowerModule(result.data.id, result.data);
      }
      
      console.log(`✅ Exchange account connected: ${result.type}`);
      this.emit('accountConnected', result);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Error connecting exchange account:`, error);
      throw error;
    }
  }

  /**
   * Link Follower to Broker
   */
  async linkFollowerToBroker(followerId, brokerId, multiplier = 1.0, riskAmount = 0) {
    try {
      console.log(`🔗 Linking follower ${followerId} to broker ${brokerId}`);
      
      const result = await this.userModule.linkFollowerToBroker(followerId, brokerId, multiplier, riskAmount);
      
      console.log(`✅ Follower linked to broker`);
      this.emit('followerLinked', { followerId, brokerId, multiplier, riskAmount });
      
      return result;
      
    } catch (error) {
      console.error(`❌ Error linking follower to broker:`, error);
      throw error;
    }
  }

  /**
   * Get User Status
   */
  getUserStatus(userId) {
    const userSession = this.userSessions.get(userId);
    const brokerModule = this.brokerModules.get(userId);
    
    if (!userSession) {
      return { error: 'User not found' };
    }
    
    return {
      user: userSession.email,
      lastActive: userSession.lastActive,
      broker: brokerModule ? brokerModule.getStatus() : null,
      followers: Array.from(this.followerModules.values()).map(f => f.getStatus())
    };
  }

  /**
   * Get System Status
   */
  getSystemStatus() {
    return {
      isRunning: this.isRunning,
      stats: this.stats,
      users: Array.from(this.userSessions.values()).map(session => ({
        email: session.email,
        lastActive: session.lastActive
      })),
      brokers: Array.from(this.brokerModules.entries()).map(([userId, module]) => ({
        userId,
        status: module.getStatus()
      })),
      followers: Array.from(this.followerModules.entries()).map(([followerId, module]) => ({
        followerId,
        status: module.getStatus()
      })),
      tradeEngine: this.tradeEngine.getStats()
    };
  }

  /**
   * Update Statistics
   */
  updateStats(results) {
    this.stats.totalSignals++;
    this.stats.successfulCopies += results.successful;
    this.stats.failedCopies += results.failed;
    this.stats.totalUsers = this.userSessions.size;
    this.stats.activeBrokers = this.brokerModules.size;
    this.stats.activeFollowers = this.followerModules.size;
  }

  /**
   * Stop User's Copy Trading
   */
  async stopUserCopyTrading(userId) {
    try {
      console.log(`⏹️ Stopping copy trading for user: ${userId}`);
      
      // Stop broker module
      const brokerModule = this.brokerModules.get(userId);
      if (brokerModule) {
        brokerModule.stopMonitoring();
        this.brokerModules.delete(userId);
      }
      
      // Stop follower modules for this user
      const userSession = this.userSessions.get(userId);
      if (userSession) {
        // Find followers belonging to this user
        for (const [followerId, followerModule] of this.followerModules.entries()) {
          if (followerModule.followerConfig.user_id === userId) {
            followerModule.stop();
            this.followerModules.delete(followerId);
          }
        }
      }
      
      // Remove user session
      this.userSessions.delete(userId);
      
      console.log(`✅ Copy trading stopped for user: ${userId}`);
      this.emit('userStopped', { userId });
      
    } catch (error) {
      console.error(`❌ Error stopping user copy trading:`, error);
      throw error;
    }
  }

  /**
   * Stop System
   */
  async stop() {
    try {
      console.log(`⏹️ Stopping Copy Trading Orchestrator...`);
      
      // Stop all broker modules
      for (const [userId, brokerModule] of this.brokerModules.entries()) {
        brokerModule.stopMonitoring();
      }
      
      // Stop all follower modules
      for (const [followerId, followerModule] of this.followerModules.entries()) {
        followerModule.stop();
      }
      
      // Stop trade engine
      this.tradeEngine.stop();
      
      // Clear all maps
      this.userSessions.clear();
      this.brokerModules.clear();
      this.followerModules.clear();
      
      this.isRunning = false;
      console.log(`✅ Copy Trading Orchestrator stopped`);
      this.emit('stopped');
      
    } catch (error) {
      console.error(`❌ Error stopping orchestrator:`, error);
      throw error;
    }
  }
}

module.exports = CopyTradingOrchestrator; 