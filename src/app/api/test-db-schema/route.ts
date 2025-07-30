import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results: any = {};

    // Test copy_trades table
    try {
      const { data: copyTrades, error: copyTradesError } = await supabase
        .from('copy_trades')
        .select('count', { count: 'exact', head: true });

      results.copy_trades = {
        exists: !copyTradesError,
        count: copyTrades?.length || 0,
        error: copyTradesError?.message
      };
    } catch (error) {
      results.copy_trades = {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test trade_sync_status table
    try {
      const { data: syncStatus, error: syncError } = await supabase
        .from('trade_sync_status')
        .select('count', { count: 'exact', head: true });

      results.trade_sync_status = {
        exists: !syncError,
        count: syncStatus?.length || 0,
        error: syncError?.message
      };
    } catch (error) {
      results.trade_sync_status = {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test followers table with new columns
    try {
      const { data: followers, error: followersError } = await supabase
        .from('followers')
        .select('*')
        .limit(1);

      results.followers = {
        exists: !followersError,
        has_new_columns: followers && followers.length > 0 ? 
          'broker_account_id' in followers[0] && 'sync_status' in followers[0] : false,
        error: followersError?.message
      };
    } catch (error) {
      results.followers = {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test broker_accounts table
    try {
      const { data: brokerAccounts, error: brokerError } = await supabase
        .from('broker_accounts')
        .select('count', { count: 'exact', head: true });

      results.broker_accounts = {
        exists: !brokerError,
        count: brokerAccounts?.length || 0,
        error: brokerError?.message
      };
    } catch (error) {
      results.broker_accounts = {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test trade_history table
    try {
      const { data: tradeHistory, error: historyError } = await supabase
        .from('trade_history')
        .select('count', { count: 'exact', head: true });

      results.trade_history = {
        exists: !historyError,
        count: tradeHistory?.length || 0,
        error: historyError?.message
      };
    } catch (error) {
      results.trade_history = {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema test completed',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing database schema:', error);
    return NextResponse.json(
      { error: 'Database schema test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 