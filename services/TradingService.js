// services/TradingService.js
const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');
const EventEmitter = require('events');

const BASE_URL = 'https://api.india.delta.exchange';
const WS_URL = 'wss://socket.india.delta.exchange';

class TradingService extends EventEmitter {
  constructor(apiKey, apiSecret) {
    super();
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.ws = null;
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  generateSignature(message) {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
  }

  getAuthHeaders(method, path, queryString = '', payload = '') {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    // Ensure path includes /v2 prefix
    const fullPath = path.startsWith('/v2') ? path : `/v2${path}`;
    const signatureData = method + timestamp + fullPath + queryString + payload;
    const signature = this.generateSignature(signatureData);

    return {
      'api-key': this.apiKey,
      'timestamp': timestamp,
      'signature': signature,
      'User-Agent': 'copy-trading-bot',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async placeOrder(orderData) {
    try {
      const payload = JSON.stringify(orderData);
      const headers = this.getAuthHeaders('POST', '/orders', '', payload);

      const response = await axios.post(`${BASE_URL}/v2/orders`, orderData, {
        headers,
        timeout: 10000
      });

      this.emit('orderPlaced', {
        success: true,
        order: response.data.result,
        originalData: orderData
      });

      return {
        success: true,
        data: response.data.result
      };
    } catch (error) {
      const errorData = {
        success: false,
        error: error.response?.data?.error || error.message,
        originalData: orderData
      };

      this.emit('orderError', errorData);
      return errorData;
    }
  }

  async cancelOrder(orderId, productId) {
    try {
      const payload = JSON.stringify({ id: orderId, product_id: productId });
      const headers = this.getAuthHeaders('DELETE', '/orders', '', payload);

      const response = await axios.delete(`${BASE_URL}/v2/orders`, {
        headers,
        data: { id: orderId, product_id: productId },
        timeout: 10000
      });

      this.emit('orderCancelled', {
        success: true,
        order: response.data.result
      });

      return {
        success: true,
        data: response.data.result
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async getPositions() {
    try {
      const headers = this.getAuthHeaders('GET', '/positions/margined');

      const response = await axios.get(`${BASE_URL}/v2/positions/margined`, {
        headers,
        timeout: 10000
      });

      return {
        success: true,
        data: response.data.result
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async getOrders(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) queryParams.append(key, filters[key]);
      });

      const queryString = queryParams.toString();
      const fullQueryString = queryString ? `?${queryString}` : '';
      
      const headers = this.getAuthHeaders('GET', '/orders', fullQueryString);

      const response = await axios.get(`${BASE_URL}/v2/orders`, {
        params: filters,
        headers,
        timeout: 10000
      });

      return {
        success: true,
        data: response.data.result
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  connectWebSocket() {
    this.ws = new WebSocket(WS_URL);

    this.ws.on('open', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.authenticate();
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('WebSocket disconnected');
      this.isAuthenticated = false;
      this.reconnect();
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('wsError', error);
    });
  }

  authenticate() {
    const method = 'GET';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = '/live';
    const signatureData = method + timestamp + path;
    const signature = this.generateSignature(signatureData);

    const authMessage = {
      type: 'auth',
      payload: {
        'api-key': this.apiKey,
        signature: signature,
        timestamp: timestamp
      }
    };

    this.ws.send(JSON.stringify(authMessage));
  }

  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'success':
        if (message.message === 'Authenticated') {
          this.isAuthenticated = true;
          this.emit('authenticated');
          this.subscribeToChannels();
        }
        break;
      
      case 'v2/user_trades':
        this.emit('userTrade', {
          symbol: message.sy,
          fillId: message.f,
          side: message.S,
          size: message.s,
          price: message.p,
          position: message.po,
          role: message.r,
          timestamp: message.t,
          orderId: message.o
        });
        break;
      
      case 'positions':
        this.emit('positionUpdate', {
          action: message.action,
          symbol: message.symbol,
          productId: message.product_id,
          size: message.size,
          entryPrice: message.entry_price,
          margin: message.margin,
          liquidationPrice: message.liquidation_price
        });
        break;
      
      case 'orders':
        this.emit('orderUpdate', {
          action: message.action,
          orderId: message.order_id,
          symbol: message.symbol,
          side: message.side,
          size: message.size,
          unfilledSize: message.unfilled_size,
          state: message.state,
          reason: message.reason
        });
        break;
    }
  }

  subscribeToChannels() {
    const subscriptions = [
      {
        name: 'v2/user_trades',
        symbols: ['all']
      },
      {
        name: 'positions',
        symbols: ['all']
      },
      {
        name: 'orders',
        symbols: ['all']
      }
    ];

    subscriptions.forEach(channel => {
      const subscribeMessage = {
        type: 'subscribe',
        payload: {
          channels: [channel]
        }
      };
      this.ws.send(JSON.stringify(subscribeMessage));
    });
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      setTimeout(() => {
        this.connectWebSocket();
      }, 5000 * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = TradingService; 