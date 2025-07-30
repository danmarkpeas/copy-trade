const crypto = require('crypto');

class UserFillsService {
  constructor(apiKey, apiSecret) {
    this.baseURL = 'https://api.india.delta.exchange';
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  generateSignature(secret, prehashString) {
    return crypto.createHmac('sha256', secret).update(prehashString).digest('hex');
  }

  async getUserFills(options = {}) {
    try {
      const {
        symbol,
        start_time,
        end_time,
        page_size = 50,
        page_number = 1
      } = options;

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const method = 'GET';
      const path = '/v2/fills';
      
      // Build query parameters
      const params = new URLSearchParams();
      if (symbol) params.append('symbol', symbol);
      if (start_time) params.append('start_time', start_time);
      if (end_time) params.append('end_time', end_time);
      if (page_size) params.append('page_size', page_size.toString());
      if (page_number) params.append('page_number', page_number.toString());
      
      const queryString = params.toString();
      const fullPath = queryString ? `${path}?${queryString}` : path;
      const payload = '';
      
      const prehashString = method + timestamp + fullPath + payload;
      const signature = this.generateSignature(this.apiSecret, prehashString);

      const headers = {
        'Accept': 'application/json',
        'api-key': this.apiKey,
        'signature': signature,
        'timestamp': timestamp,
        'User-Agent': 'copy-trading-platform'
      };

      const response = await fetch(`${this.baseURL}${fullPath}`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          status: response.status,
          error: errorData
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data.result || [],
        count: data.result?.length || 0,
        pagination: {
          page_size,
          page_number,
          total: data.pagination?.total || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getRecentFills(minutes = 5) {
    const endTime = Date.now();
    const startTime = endTime - (minutes * 60 * 1000);
    
    return await this.getUserFills({
      start_time: startTime.toString(),
      end_time: endTime.toString(),
      page_size: 100
    });
  }
}

module.exports = UserFillsService; 