// services/CopyTradingEngine.js
const TradingService = require('./TradingService');
const EventEmitter = require('events');

class CopyTradingEngine extends EventEmitter {
  constructor() {
    super();
    this.masterTraders = new Map(); // masterId -> TradingService
    this.followers = new Map(); // followerId -> { service: TradingService, settings: CopySettings }
    this.copyRelationships = new Map(); // followerId -> Set of masterIds
    this.tradeHistory = [];
  }

  addMasterTrader(masterId, apiKey, apiSecret) {
    try {
      const masterService = new TradingService(apiKey, apiSecret);
      
      // Listen to master's trades
      masterService.on('userTrade', (trade) => {
        this.handleMasterTrade(masterId, trade);
      });

      masterService.on('positionUpdate', (position) => {
        this.handleMasterPositionUpdate(masterId, position);
      });

      masterService.on('authenticated', () => {
        console.log(`Master trader ${masterId} authenticated`);
        this.emit('masterConnected', masterId);
      });

      masterService.on('wsError', (error) => {
        console.error(`Master trader ${masterId} WebSocket error:`, error);
        this.emit('masterError', { masterId, error });
      });

      masterService.connectWebSocket();
      this.masterTraders.set(masterId, masterService);

      return { success: true, message: 'Master trader added successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  addFollower(followerId, apiKey, apiSecret, copySettings) {
    try {
      const followerService = new TradingService(apiKey, apiSecret);
      
      followerService.on('orderPlaced', (orderData) => {
        this.emit('followerOrderPlaced', { followerId, orderData });
      });

      followerService.on('orderError', (errorData) => {
        this.emit('followerOrderError', { followerId, errorData });
      });

      followerService.on('authenticated', () => {
        console.log(`Follower ${followerId} authenticated`);
        this.emit('followerConnected', followerId);
      });

      followerService.connectWebSocket();
      
      this.followers.set(followerId, {
        service: followerService,
        settings: copySettings
      });

      return { success: true, message: 'Follower added successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  createCopyRelationship(followerId, masterId) {
    if (!this.followers.has(followerId)) {
      return { success: false, error: 'Follower not found' };
    }

    if (!this.masterTraders.has(masterId)) {
      return { success: false, error: 'Master trader not found' };
    }

    if (!this.copyRelationships.has(followerId)) {
      this.copyRelationships.set(followerId, new Set());
    }

    this.copyRelationships.get(followerId).add(masterId);
    
    this.emit('copyRelationshipCreated', { followerId, masterId });
    
    return { success: true, message: 'Copy relationship created' };
  }

  removeCopyRelationship(followerId, masterId) {
    if (this.copyRelationships.has(followerId)) {
      this.copyRelationships.get(followerId).delete(masterId);
      
      if (this.copyRelationships.get(followerId).size === 0) {
        this.copyRelationships.delete(followerId);
      }
    }

    this.emit('copyRelationshipRemoved', { followerId, masterId });
    
    return { success: true, message: 'Copy relationship removed' };
  }

  async handleMasterTrade(masterId, trade) {
    console.log(`Master ${masterId} trade:`, trade);
    
    // Find all followers of this master
    const followers = Array.from(this.copyRelationships.entries())
      .filter(([_, masterIds]) => masterIds.has(masterId))
      .map(([followerId]) => followerId);

    // Execute copy trades for each follower
    for (const followerId of followers) {
      await this.executeCopyTrade(followerId, masterId, trade);
    }
  }

  async executeCopyTrade(followerId, masterId, masterTrade) {
    try {
      const followerData = this.followers.get(followerId);
      if (!followerData) return;

      const { service: followerService, settings } = followerData;

      // Apply copy trading logic based on settings
      const copyOrder = this.calculateCopyOrder(masterTrade, settings);
      
      if (!copyOrder) {
        console.log(`Copy trade skipped for follower ${followerId} - filtered out`);
        return;
      }

      // Place the copy order
      const result = await followerService.placeOrder(copyOrder);
      
      // Record the trade
      const tradeRecord = {
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        masterId,
        followerId,
        masterTrade,
        copyOrder,
        result,
        settings: { ...settings }
      };

      this.tradeHistory.push(tradeRecord);
      this.emit('copyTradeExecuted', tradeRecord);

      return result;
    } catch (error) {
      console.error(`Error executing copy trade for follower ${followerId}:`, error);
      this.emit('copyTradeError', { followerId, masterId, error: error.message });
    }
  }

  calculateCopyOrder(masterTrade, settings) {
    // Apply filters
    if (settings.symbolFilter && settings.symbolFilter.length > 0) {
      if (!settings.symbolFilter.includes(masterTrade.symbol)) {
        return null; // Skip this trade
      }
    }

    if (settings.minTradeSize && Math.abs(masterTrade.size) < settings.minTradeSize) {
      return null; // Skip small trades
    }

    if (settings.maxTradeSize && Math.abs(masterTrade.size) > settings.maxTradeSize) {
      return null; // Skip large trades
    }

    // Calculate position size based on copy ratio
    let copySize = Math.abs(masterTrade.size);
    
    if (settings.copyRatio && settings.copyRatio !== 1) {
      copySize = copySize * settings.copyRatio;
      // Use minimum size of 0.01 instead of Math.floor to avoid zero
      copySize = Math.max(0.01, copySize);
    }

    if (settings.fixedAmount) {
      copySize = settings.fixedAmount;
    }

    if (copySize === 0) return null;

    // Determine order type and price
    let orderType = 'market_order';
    let limitPrice = null;

    if (settings.useMarketOrders === false) {
      orderType = 'limit_order';
      // Use a price slightly better than master's fill price
      const priceAdjustment = masterTrade.side === 'buy' ? 0.999 : 1.001;
      limitPrice = (parseFloat(masterTrade.price) * priceAdjustment).toString();
    }

    const copyOrder = {
      product_symbol: masterTrade.symbol,
      size: copySize,
      side: settings.reverseDirection ? (masterTrade.side === 'buy' ? 'sell' : 'buy') : masterTrade.side,
      order_type: orderType,
      client_order_id: `copy_${masterTrade.fillId}_${Date.now()}`
    };

    if (limitPrice) {
      copyOrder.limit_price = limitPrice;
    }

    return copyOrder;
  }

  async handleMasterPositionUpdate(masterId, position) {
    console.log(`Master ${masterId} position update:`, position);
    
    // Handle position-based copying (e.g., stop losses, take profits)
    if (position.action === 'delete') {
      // Master closed position - potentially close follower positions
      await this.handleMasterPositionClose(masterId, position);
    }
  }

  async handleMasterPositionClose(masterId, closedPosition) {
    const followers = Array.from(this.copyRelationships.entries())
      .filter(([_, masterIds]) => masterIds.has(masterId))
      .map(([followerId]) => followerId);

    for (const followerId of followers) {
      const followerData = this.followers.get(followerId);
      if (!followerData || !followerData.settings.copyPositionClose) continue;

      try {
        // Get follower's current positions
        const positionsResult = await followerData.service.getPositions();
        if (!positionsResult.success) continue;

        // Find matching position
        const matchingPosition = positionsResult.data.find(
          pos => pos.product_symbol === closedPosition.symbol
        );

        if (matchingPosition && matchingPosition.size !== 0) {
          // Close the position with a market order
          const closeOrder = {
            product_symbol: closedPosition.symbol,
            size: Math.abs(matchingPosition.size),
            side: matchingPosition.size > 0 ? 'sell' : 'buy',
            order_type: 'market_order',
            reduce_only: 'true',
            client_order_id: `close_copy_${masterId}_${Date.now()}`
          };

          await followerData.service.placeOrder(closeOrder);
          
          this.emit('positionCopyClosed', {
            followerId,
            masterId,
            symbol: closedPosition.symbol,
            closeOrder
          });
        }
      } catch (error) {
        console.error(`Error closing copy position for follower ${followerId}:`, error);
      }
    }
  }

  updateFollowerSettings(followerId, newSettings) {
    const followerData = this.followers.get(followerId);
    if (followerData) {
      followerData.settings = { ...followerData.settings, ...newSettings };
      this.emit('followerSettingsUpdated', { followerId, settings: followerData.settings });
      return { success: true, message: 'Settings updated successfully' };
    }
    return { success: false, error: 'Follower not found' };
  }

  getTradeHistory(filters = {}) {
    let history = [...this.tradeHistory];

    if (filters.followerId) {
      history = history.filter(trade => trade.followerId === filters.followerId);
    }

    if (filters.masterId) {
      history = history.filter(trade => trade.masterId === filters.masterId);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      history = history.filter(trade => trade.timestamp >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      history = history.filter(trade => trade.timestamp <= endDate);
    }

    return history.sort((a, b) => b.timestamp - a.timestamp);
  }

  getStats(followerId) {
    const followerTrades = this.tradeHistory.filter(trade => trade.followerId === followerId);
    
    const stats = {
      totalTrades: followerTrades.length,
      successfulTrades: followerTrades.filter(trade => trade.result.success).length,
      failedTrades: followerTrades.filter(trade => !trade.result.success).length,
      successRate: 0,
      totalVolume: 0,
      averageTradeSize: 0
    };

    if (stats.totalTrades > 0) {
      stats.successRate = (stats.successfulTrades / stats.totalTrades) * 100;
      stats.totalVolume = followerTrades.reduce((sum, trade) => {
        return sum + (trade.copyOrder.size * parseFloat(trade.masterTrade.price || 0));
      }, 0);
      stats.averageTradeSize = stats.totalVolume / stats.totalTrades;
    }

    return stats;
  }

  disconnect() {
    // Disconnect all master traders
    for (const [masterId, service] of this.masterTraders) {
      service.disconnect();
    }

    // Disconnect all followers
    for (const [followerId, data] of this.followers) {
      data.service.disconnect();
    }

    this.masterTraders.clear();
    this.followers.clear();
    this.copyRelationships.clear();
  }
}

module.exports = CopyTradingEngine; 