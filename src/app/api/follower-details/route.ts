import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const followerName = searchParams.get('follower_name');

    if (!followerName) {
      return NextResponse.json(
        { error: 'Follower name is required' },
        { status: 400 }
      );
    }

    console.log('🔍 API: Loading follower details for:', followerName);

    // Get follower details using service role (bypasses RLS)
    const { data: followerData, error } = await supabase
      .from('followers')
      .select(`
        *,
        broker_accounts!followers_master_broker_account_id_fkey (
          broker_name,
          account_name
        )
      `)
      .eq('follower_name', followerName)
      .eq('account_status', 'active')
      .single();

    if (error) {
      console.log('❌ API: Error loading follower details:', error.message);
      return NextResponse.json(
        { error: `Error loading follower details: ${error.message}` },
        { status: 500 }
      );
    }

    if (!followerData) {
      return NextResponse.json(
        { error: 'Follower not found' },
        { status: 404 }
      );
    }

    // Format the response
    const details = {
      follower_name: followerData.follower_name,
      master_broker_name: followerData.broker_accounts?.broker_name || 'Unknown',
      master_account_name: followerData.broker_accounts?.account_name || 'Unknown',
      broker_platform: 'Delta Exchange',
      profile_id: followerData.profile_id,
      api_key: followerData.api_key,
      api_secret: followerData.api_secret,
      copy_mode: followerData.copy_mode,
      multiplier: followerData.multiplier,
      percentage: followerData.percentage,
      fixed_lot: followerData.fixed_lot,
      lot_size: followerData.lot_size,
      max_lot_size: followerData.max_lot_size,
      min_lot_size: followerData.min_lot_size,
      drawdown_limit: followerData.drawdown_limit,
      total_balance: followerData.total_balance,
      risk_level: followerData.risk_level,
      capital_allocated: followerData.capital_allocated,
      max_daily_trades: followerData.max_daily_trades,
      max_open_positions: followerData.max_open_positions,
      stop_loss_percentage: followerData.stop_loss_percentage,
      take_profit_percentage: followerData.take_profit_percentage,
      account_status: followerData.account_status,
      is_verified: followerData.is_verified,
      user_id: followerData.user_id
    };

    console.log('✅ API: Follower details loaded successfully');
    return NextResponse.json({ success: true, data: details });

  } catch (error) {
    console.log('❌ API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const followerName = searchParams.get('follower_name');
    const body = await request.json();

    if (!followerName) {
      return NextResponse.json(
        { error: 'Follower name is required' },
        { status: 400 }
      );
    }

    console.log('🔄 API: Updating follower:', followerName);

    // Update follower using service role (bypasses RLS)
    const { data: updateResult, error } = await supabase
      .from('followers')
      .update(body)
      .eq('follower_name', followerName)
      .eq('account_status', 'active')
      .select();

    if (error) {
      console.log('❌ API: Error updating follower:', error.message);
      return NextResponse.json(
        { error: `Error updating follower: ${error.message}` },
        { status: 500 }
      );
    }

    if (!updateResult || updateResult.length === 0) {
      return NextResponse.json(
        { error: 'No follower was updated' },
        { status: 404 }
      );
    }

    console.log('✅ API: Follower updated successfully');
    return NextResponse.json({ 
      success: true, 
      data: updateResult[0],
      message: 'Follower updated successfully'
    });

  } catch (error) {
    console.log('❌ API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 