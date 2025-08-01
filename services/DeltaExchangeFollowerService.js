const axios = require('axios');
const crypto = require('crypto');

class DeltaExchangeFollowerService {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = 'https://api.india.delta.exchange';
  }

  generateSignature(secret, message) {
    return crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
  }

  async makeAuthenticatedRequest(method, endpoint, payload = '', params = {}) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = `/v2${endpoint}`;
    
    // Build query string
    const queryString = Object.keys(params).length > 0 
      ? '?' + new URLSearchParams(params).toString()
      : '';
    
    // Prepare payload (body) - ensure it's a string and matches Python verification
    const body = typeof payload === 'string' ? payload : (payload ? JSON.stringify(payload) : '');
    
    // Create signature data: method + timestamp + path + queryString + body (matching Python script)
    const signatureData = method + timestamp + path + queryString + body;
    const signature = this.generateSignature(this.apiSecret, signatureData);
    
    const headers = {
      'api-key': this.apiKey,
      'timestamp': timestamp,
      'signature': signature,
      'User-Agent': 'nodejs-follower-service',
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
          response = await axios.post(url + queryString, payload ? JSON.parse(payload) : {}, axiosConfig);
          break;
        case 'DELETE':
          response = await axios.delete(url + queryString, axiosConfig);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
      
      return response.data;
    } catch (error) {
      console.error(`API request failed: ${method} ${endpoint}`, error.response?.data || error.message);
      throw error;
    }
  }

  async placeOrder(orderData) {
    try {
      console.log(`📊 Placing order for follower: ${orderData.product_symbol} ${orderData.side} ${orderData.size}`);
      
      const response = await this.makeAuthenticatedRequest('POST', '/orders', JSON.stringify(orderData));
      
      if (response.success) {
        console.log(`✅ Order placed successfully: ${orderData.product_symbol} ${orderData.side} ${orderData.size}`);
        return {
          success: true,
          data: response.result,
          message: 'Order placed successfully'
        };
      } else {
        console.error(`❌ Order failed: ${response.error}`);
        return {
          success: false,
          error: response.error,
          message: 'Order placement failed'
        };
      }
    } catch (error) {
      console.error(`❌ Error placing order:`, error.message);
      return {
        success: false,
        error: error.message,
        message: 'Order placement error'
      };
    }
  }

  async getPositions() {
    try {
      const response = await this.makeAuthenticatedRequest('GET', '/positions');
      
      if (response.success) {
        return {
          success: true,
          data: response.result || []
        };
      } else {
        return {
          success: false,
          error: response.error
        };
      }
    } catch (error) {
      console.error(`❌ Error getting positions:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getBalance() {
    try {
      const response = await this.makeAuthenticatedRequest('GET', '/wallet/balances');
      
      if (response.success) {
        return {
          success: true,
          data: response.result || []
        };
      } else {
        return {
          success: false,
          error: response.error
        };
      }
    } catch (error) {
      console.error(`❌ Error getting balance:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cancelOrder(orderId) {
    try {
      const response = await this.makeAuthenticatedRequest('DELETE', `/orders/${orderId}`);
      
      if (response.success) {
        return {
          success: true,
          data: response.result
        };
      } else {
        return {
          success: false,
          error: response.error
        };
      }
    } catch (error) {
      console.error(`❌ Error canceling order:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = DeltaExchangeFollowerService; 