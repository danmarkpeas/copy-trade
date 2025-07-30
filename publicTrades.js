const crypto = require('crypto');

class PublicTradesService {
  constructor() {
    this.baseURL = 'https://api.india.delta.exchange';
  }

  async getPublicTrades(symbol, limit = 100) {
    try {
      const response = await fetch(`${this.baseURL}/v2/trades?symbol=${symbol}&limit=${limit}`);
      
      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: `Failed to fetch public trades for ${symbol}`
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data.result || [],
        symbol: symbol,
        count: data.result?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getMultiplePublicTrades(symbols) {
    const results = {};
    
    for (const symbol of symbols) {
      const result = await this.getPublicTrades(symbol);
      results[symbol] = result;
    }
    
    return results;
  }
}

module.exports = PublicTradesService; 