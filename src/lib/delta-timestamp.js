// Delta Exchange Timestamp Synchronization - Client Side
// This can be used in API routes or server-side code

class DeltaTimestampSync {
  constructor() {
    this.timeOffset = 0;
    this.lastSyncTime = 0;
    this.syncInterval = 30000; // Sync every 30 seconds
  }

  // Get server time from Delta Exchange
  async getDeltaServerTime() {
    try {
      const response = await fetch('https://api.delta.exchange/v2/time', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.result.server_time;
    } catch (error) {
      console.error('Failed to get Delta server time:', error);
      // Fallback to local time + buffer
      return Math.floor(Date.now() / 1000) + 5;
    }
  }

  // Synchronize local time with Delta server time
  async syncTime() {
    try {
      const serverTime = await this.getDeltaServerTime();
      const localTime = Math.floor(Date.now() / 1000);
      this.timeOffset = serverTime - localTime;
      this.lastSyncTime = Date.now();
      console.log(`Time synchronized. Offset: ${this.timeOffset} seconds`);
      return true;
    } catch (error) {
      console.error('Time synchronization failed:', error);
      return false;
    }
  }

  // Get synchronized timestamp
  getSynchronizedTimestamp() {
    const localTime = Math.floor(Date.now() / 1000);
    const synchronizedTime = localTime + this.timeOffset;
    
    // Add a small buffer to ensure we're ahead
    return synchronizedTime + 1;
  }

  // Generate Delta Exchange signature
  generateSignature(method, path, body, apiSecret) {
    const timestamp = this.getSynchronizedTimestamp();
    const message = method + path + body + timestamp;
    
    // Note: In Node.js, you would use crypto.createHmac
    // This is a placeholder - implement actual HMAC-SHA256
    const signature = this.hmacSha256(message, apiSecret);
    
    return {
      timestamp: timestamp.toString(),
      signature: signature
    };
  }

  // HMAC-SHA256 implementation (placeholder)
  hmacSha256(message, secret) {
    // In Node.js, use: crypto.createHmac('sha256', secret).update(message).digest('hex')
    // For browser, you might need a crypto library
    throw new Error('Implement HMAC-SHA256 based on your environment');
  }

  // Auto-sync timer
  startAutoSync() {
    // Initial sync
    this.syncTime();
    
    // Set up periodic sync
    setInterval(() => {
      this.syncTime();
    }, this.syncInterval);
  }

  // Check if sync is needed
  isSyncNeeded() {
    return Date.now() - this.lastSyncTime > this.syncInterval;
  }
}

// Usage example for API routes:
async function makeDeltaApiCall(method, path, body, apiKey, apiSecret) {
  const timestampSync = new DeltaTimestampSync();
  
  // Sync time if needed
  if (timestampSync.isSyncNeeded()) {
    await timestampSync.syncTime();
  }
  
  // Generate signature
  const { timestamp, signature } = timestampSync.generateSignature(method, path, body, apiSecret);
  
  // Make API call
  const response = await fetch(`https://api.delta.exchange${path}`, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'timestamp': timestamp,
      'signature': signature
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  return response;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DeltaTimestampSync, makeDeltaApiCall };
} 