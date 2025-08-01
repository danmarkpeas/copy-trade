import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateSignature(secret: string, message: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

async function testFollowerCredentials(apiKey: string, apiSecret: string) {
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = '/v2/positions/margined';
    const signatureData = 'GET' + timestamp + path;
    const signature = generateSignature(apiSecret, signatureData);

    const headers = {
      'api-key': apiKey,
      'timestamp': timestamp,
      'signature': signature,
      'User-Agent': 'copy-trading-bot',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const response = await axios.get('https://api.india.delta.exchange/v2/positions/margined', {
      headers,
      timeout: 10000
    });

    return {
      success: true,
      balance: response.data.result?.length || 0,
      error: null
    };
  } catch (error: any) {
    return {
      success: false,
      balance: 0,
      error: error.response?.data?.error?.code || error.message
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get all followers from database
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('*')
      .eq('account_status', 'active');

    if (followersError) {
      return NextResponse.json({ error: 'Failed to fetch followers' }, { status: 500 });
    }

    // Test each follower's credentials
    const testedFollowers = await Promise.all(
      followers.map(async (follower) => {
        const testResult = await testFollowerCredentials(follower.api_key, follower.api_secret);
        
        return {
          id: follower.id,
          name: follower.follower_name,
          status: testResult.success ? 'active' : 'error',
          apiCredentials: testResult.success,
          balance: testResult.balance,
          lastTrade: 'Never', // This would need to be fetched from trade history
          errorReason: testResult.error
        };
      })
    );

    return NextResponse.json({
      success: true,
      followers: testedFollowers,
      total: testedFollowers.length,
      active: testedFollowers.filter(f => f.status === 'active').length,
      errors: testedFollowers.filter(f => f.status === 'error').length
    });

  } catch (error) {
    console.error('Error testing followers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 