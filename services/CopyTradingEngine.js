// services/CopyTradingEngine.js
const TradingService = require('./TradingService');
const EventEmitter = require('events');
const DeltaExchangeFollowerService = require('./DeltaExchangeFollowerService');
const PositionClosingDetector = require('./PositionClosingDetector');

class CopyTradingEngine extends EventEmitter {
  constructor() {
    super();
    this.masterTraders = new Map(); // masterId -> TradingService
    this.followers = new Map(); // followerId -> { service: TradingService, settings: CopySettings }
    this.copyRelationships = new Map(); // followerId -> Set of masterIds
    this.tradeHistory = [];
    this.positionDetectors = new Map(); // masterId -> PositionClosingDetector
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
        
        // Start position closing detector for this master
        this.startPositionDetector(masterId, apiKey, apiSecret);
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
      // Create Delta Exchange service for follower
      const followerService = new DeltaExchangeFollowerService(apiKey, apiSecret);
      
      // Store follower data
      this.followers.set(followerId, {
        service: followerService,
        settings: copySettings
      });

      console.log(`✅ Follower ${followerId} added with API credentials`);
      this.emit('followerAdded', { followerId, settings: copySettings });
      
      return { success: true, message: 'Follower added successfully' };
    } catch (error) {
      console.error('Error adding follower:', error);
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

      // Try to save to database, but don't fail if it doesn't work
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        await supabase.from('copy_trades').insert({
          master_id: masterId,
          follower_id: followerId,
          symbol: masterTrade.symbol,
          side: copyOrder.side,
          size: copyOrder.size,
          price: masterTrade.price,
          status: result.success ? 'executed' : 'failed',
          error_message: result.success ? null : result.error,
          executed_at: new Date().toISOString()
        });
      } catch (dbError) {
        console.log('⚠️ Could not save copy trade to database (non-critical):', dbError.message);
      }

      // Log the result
      if (result.success) {
        console.log(`✅ Copy trade executed successfully for follower ${followerId}: ${copyOrder.product_symbol} ${copyOrder.side} ${copyOrder.size}`);
      } else {
        console.error(`❌ Copy trade failed for follower ${followerId}: ${result.error}`);
      }

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
      console.log(`🔄 Master ${masterId} deleted position - closing follower positions`);
      // Master closed position - close follower positions
      await this.handleMasterPositionClose(masterId, position);
    } else if (position.action === 'create') {
      console.log(`📈 Master ${masterId} created position - no action needed for followers`);
    } else if (position.action === 'update') {
      console.log(`📊 Master ${masterId} updated position - no action needed for followers`);
    }
  }

  async handleMasterPositionClose(masterId, closedPosition) {
    console.log(`🔄 Master ${masterId} closed position: ${closedPosition.symbol}`);
    
    const followers = Array.from(this.copyRelationships.entries())
      .filter(([_, masterIds]) => masterIds.has(masterId))
      .map(([followerId]) => followerId);

    console.log(`📊 Found ${followers.length} followers to close positions for`);

    for (const followerId of followers) {
      const followerData = this.followers.get(followerId);
      if (!followerData) {
        console.log(`❌ Follower data not found for ${followerId}`);
        continue;
      }

      try {
        console.log(`🔍 Checking positions for follower ${followerId}...`);
        
        // Get follower's current positions
        const positionsResult = await followerData.service.getPositions();
        if (!positionsResult.success) {
          console.log(`❌ Failed to get positions for follower ${followerId}:`, positionsResult.error);
          continue;
        }

        // Find matching position
        const matchingPosition = positionsResult.data.find(
          pos => pos.product_symbol === closedPosition.symbol
        );

        if (matchingPosition && matchingPosition.size !== 0) {
          console.log(`📈 Found matching position: ${matchingPosition.product_symbol} ${matchingPosition.size} @ ${matchingPosition.entry_price}`);
          
          // Close the position with a market order
          const closeOrder = {
            product_symbol: closedPosition.symbol,
            size: Math.abs(matchingPosition.size),
            side: matchingPosition.size > 0 ? 'sell' : 'buy',
            order_type: 'market_order',
            client_order_id: `close_copy_${masterId}_${Date.now()}`
          };

          console.log(`🔄 Closing position with order:`, JSON.stringify(closeOrder, null, 2));

          const closeResult = await followerData.service.placeOrder(closeOrder);
          
          if (closeResult.success) {
            console.log(`✅ Position closed successfully for follower ${followerId}: ${closedPosition.symbol}`);
            
            this.emit('positionCopyClosed', {
              followerId,
              masterId,
              symbol: closedPosition.symbol,
              closeOrder,
              result: closeResult
            });
          } else {
            console.log(`❌ Failed to close position for follower ${followerId}:`, closeResult.error);
          }
        } else {
          console.log(`ℹ️  No matching position found for follower ${followerId} in ${closedPosition.symbol}`);
        }
      } catch (error) {
        console.error(`❌ Error closing copy position for follower ${followerId}:`, error);
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

  startPositionDetector(masterId, apiKey, apiSecret) {
    try {
      const detector = new PositionClosingDetector(apiKey, apiSecret);
      
      // Set up position closed callback
      detector.setPositionClosedCallback((symbol, positionData, reason) => {
        console.log(`🔄 Master ${masterId} position closed via detector: ${symbol} (${reason})`);
        this.handleMasterPositionClose(masterId, {
          symbol: symbol,
          action: 'delete',
          ...positionData
        });
      });

      // Set up position opened callback
      detector.setPositionOpenedCallback((symbol, positionData) => {
        console.log(`📈 Master ${masterId} position opened via detector: ${symbol}`);
        this.handleMasterPositionUpdate(masterId, {
          symbol: symbol,
          action: 'create',
          ...positionData
        });
      });

      detector.start();
      this.positionDetectors.set(masterId, detector);
      
      console.log(`✅ Position closing detector started for master ${masterId}`);
    } catch (error) {
      console.error(`❌ Failed to start position detector for master ${masterId}:`, error);
    }
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

    // Stop all position detectors
    for (const [masterId, detector] of this.positionDetectors) {
      detector.stop();
    }

    this.masterTraders.clear();
    this.followers.clear();
    this.copyRelationships.clear();
    this.positionDetectors.clear();
  }
}

module.exports = CopyTradingEngine; 