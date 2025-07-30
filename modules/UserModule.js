const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

class UserModule {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * User Authentication & Management
   */
  async authenticateUser(userId, email) {
    try {
      console.log(`🔐 Authenticating user: ${email} (${userId})`);
      
      // Get or create user session
      const { data: user, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!user) {
        // Create new user
        const { data: newUser, error: createError } = await this.supabase
          .from('users')
          .insert({
            id: userId,
            email: email,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) throw createError;
        console.log(`✅ New user created: ${email}`);
        return newUser;
      }

      console.log(`✅ User authenticated: ${email}`);
      return user;
    } catch (error) {
      console.error(`❌ Authentication error for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Exchange Account Connection
   */
  async connectExchangeAccount(userId, accountData) {
    try {
      const { 
        account_name, 
        api_key, 
        api_secret, 
        profile_id, 
        role, // 'master' or 'follower'
        broker_name = 'delta'
      } = accountData;

      console.log(`🔗 Connecting exchange account: ${account_name} (${role})`);

      // Encrypt sensitive data
      const encryptedApiKey = this.encryptData(api_key);
      const encryptedApiSecret = this.encryptData(api_secret);

      if (role === 'master') {
        // Create broker account
        const { data: broker, error } = await this.supabase
          .from('broker_accounts')
          .insert({
            user_id: userId,
            account_name: account_name,
            api_key: encryptedApiKey,
            api_secret: encryptedApiSecret,
            profile_id: profile_id,
            broker_name: broker_name,
            is_active: true,
            is_verified: false // Will be verified on first API call
          })
          .select()
          .single();

        if (error) throw error;
        console.log(`✅ Broker account created: ${account_name}`);
        return { type: 'broker', data: broker };

      } else if (role === 'follower') {
        // Create follower account
        const { data: follower, error } = await this.supabase
          .from('followers')
          .insert({
            user_id: userId,
            follower_name: account_name,
            api_key: encryptedApiKey,
            api_secret: encryptedApiSecret,
            profile_id: profile_id,
            broker_name: broker_name,
            account_status: 'active',
            multiplier: 1.0,
            risk_amount: 0 // Will be set by user
          })
          .select()
          .single();

        if (error) throw error;
        console.log(`✅ Follower account created: ${account_name}`);
        return { type: 'follower', data: follower };
      }

      throw new Error('Invalid role. Must be "master" or "follower"');
    } catch (error) {
      console.error(`❌ Exchange account connection error:`, error);
      throw error;
    }
  }

  /**
   * Link Follower to Broker
   */
  async linkFollowerToBroker(followerId, brokerId, multiplier = 1.0, riskAmount = 0) {
    try {
      console.log(`🔗 Linking follower ${followerId} to broker ${brokerId}`);

      const { data, error } = await this.supabase
        .from('followers')
        .update({
          master_broker_account_id: brokerId,
          multiplier: multiplier,
          risk_amount: riskAmount,
          account_status: 'active'
        })
        .eq('id', followerId)
        .select()
        .single();

      if (error) throw error;
      console.log(`✅ Follower linked to broker successfully`);
      return data;
    } catch (error) {
      console.error(`❌ Error linking follower to broker:`, error);
      throw error;
    }
  }

  /**
   * Get User's Active Accounts
   */
  async getUserAccounts(userId) {
    try {
      // Get broker accounts
      const { data: brokers, error: brokerError } = await this.supabase
        .from('broker_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (brokerError) throw brokerError;

      // Get follower accounts
      const { data: followers, error: followerError } = await this.supabase
        .from('followers')
        .select('*')
        .eq('user_id', userId)
        .eq('account_status', 'active');

      if (followerError) throw followerError;

      return {
        brokers: brokers || [],
        followers: followers || []
      };
    } catch (error) {
      console.error(`❌ Error getting user accounts:`, error);
      throw error;
    }
  }

  /**
   * Verify API Credentials
   */
  async verifyApiCredentials(apiKey, apiSecret, brokerName = 'delta') {
    try {
      console.log(`🔍 Verifying API credentials for ${brokerName}`);
      
      // Test API connection
      const axios = require('axios');
      const timestamp = Date.now();
      const signature = this.generateSignature(apiSecret, timestamp);

      const response = await axios.get(`https://api.india.delta.exchange/v2/positions`, {
        headers: {
          'api-key': apiKey,
          'timestamp': timestamp,
          'signature': signature
        }
      });

      if (response.status === 200) {
        console.log(`✅ API credentials verified successfully`);
        return true;
      } else {
        console.log(`❌ API credentials verification failed`);
        return false;
      }
    } catch (error) {
      console.error(`❌ API verification error:`, error.message);
      return false;
    }
  }

  /**
   * Utility Functions
   */
  encryptData(data) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  decryptData(encryptedData) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  generateSignature(secret, timestamp) {
    const message = timestamp.toString();
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
  }
}

module.exports = UserModule; 