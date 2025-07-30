-- Create missing tables from the migration
-- Run this in your Supabase SQL Editor

-- 1. Create the subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references users(id) on delete cascade,
  trader_id uuid references users(id) on delete cascade,
  risk_mode text default 'fixed', -- e.g. 'fixed', 'multiplier', 'proportional'
  capital_allocated numeric,
  status text default 'active',
  created_at timestamptz default now()
);

-- 2. Create the broker_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS broker_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  broker_name text not null, -- e.g., Binance, Zerodha, MT5
  account_uid text,          -- Broker-specific account/profile ID
  api_key text not null,     -- ENCRYPTED: Public API key
  api_secret text not null,  -- ENCRYPTED: Secret or access token
  is_active boolean default true,
  client_id text,            -- Optional: Client ID if required
  account_type text,         -- Optional: e.g., demo, live, margin
  account_name text not null, -- User-defined unique name for this master account
  created_at timestamptz default now()
);

-- 3. Create the trade_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.trade_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  product_id int,
  product_symbol text,
  side text check (side in ('buy', 'sell')),
  size numeric,
  price numeric,
  order_type text,
  state text,
  avg_fill_price numeric,
  order_id text,
  created_at timestamptz default now()
);

-- 4. Add delta_user_id column to trade_history if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trade_history' 
    AND column_name = 'delta_user_id'
  ) THEN
    ALTER TABLE public.trade_history ADD COLUMN delta_user_id int;
  END IF;
END $$;

-- 5. Verify all tables exist
SELECT 'Verifying tables exist' as info;
SELECT 
  table_name,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'traders', 'followers', 'trades', 'copied_trades', 'notifications', 'broker_accounts', 'subscriptions', 'trade_history')
ORDER BY table_name;

-- 6. Show table structures
SELECT 'Table structures' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('subscriptions', 'broker_accounts')
ORDER BY table_name, ordinal_position; 

-- Create missing tables for copy trading system

-- COPY_TRADES TABLE
CREATE TABLE IF NOT EXISTS copy_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_trade_id text NOT NULL,
  master_broker_id uuid REFERENCES broker_accounts(id) ON DELETE CASCADE,
  follower_id uuid REFERENCES users(id) ON DELETE CASCADE,
  follower_order_id text,
  original_symbol text NOT NULL,
  original_side text NOT NULL CHECK (original_side IN ('buy', 'sell')),
  original_size numeric NOT NULL,
  original_price numeric NOT NULL,
  copied_size numeric NOT NULL,
  copied_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'exited', 'cancelled')),
  entry_time timestamptz DEFAULT now(),
  exit_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TRADE_SYNC_STATUS TABLE
CREATE TABLE IF NOT EXISTS trade_sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_broker_id uuid REFERENCES broker_accounts(id) ON DELETE CASCADE,
  follower_id uuid REFERENCES users(id) ON DELETE CASCADE,
  master_trade_id text NOT NULL,
  follower_trade_id text,
  sync_status text NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'unsynced', 'error')),
  last_verified timestamptz DEFAULT now(),
  error_message text,
  retry_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text,
  message text,
  created_at timestamptz DEFAULT now(),
  read boolean DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_copy_trades_master_trade_id ON copy_trades(master_trade_id);
CREATE INDEX IF NOT EXISTS idx_copy_trades_follower_id ON copy_trades(follower_id);
CREATE INDEX IF NOT EXISTS idx_copy_trades_status ON copy_trades(status);
CREATE INDEX IF NOT EXISTS idx_copy_trades_entry_time ON copy_trades(entry_time);
CREATE INDEX IF NOT EXISTS idx_copy_trades_master_broker_id ON copy_trades(master_broker_id);

CREATE INDEX IF NOT EXISTS idx_trade_sync_master_broker_id ON trade_sync_status(master_broker_id);
CREATE INDEX IF NOT EXISTS idx_trade_sync_follower_id ON trade_sync_status(follower_id);
CREATE INDEX IF NOT EXISTS idx_trade_sync_status ON trade_sync_status(sync_status);

-- Update followers table with new columns
ALTER TABLE followers ADD COLUMN IF NOT EXISTS broker_account_id uuid REFERENCES broker_accounts(id) ON DELETE CASCADE;
ALTER TABLE followers ADD COLUMN IF NOT EXISTS last_sync_time timestamptz;
ALTER TABLE followers ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'active' CHECK (sync_status IN ('active', 'paused', 'error'));
ALTER TABLE followers ADD COLUMN IF NOT EXISTS max_drawdown numeric DEFAULT 0;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_copy_trades_updated_at BEFORE UPDATE ON copy_trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trade_sync_status_updated_at BEFORE UPDATE ON trade_sync_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create helper functions
CREATE OR REPLACE FUNCTION calculate_copied_size(
  original_size numeric,
  follower_risk_mode text,
  follower_capital_allocated numeric,
  follower_multiplier numeric,
  follower_lot_size numeric,
  follower_percentage_balance numeric
) RETURNS numeric AS $$
BEGIN
  CASE follower_risk_mode
    WHEN 'fixed' THEN
      RETURN follower_lot_size;
    WHEN 'multiplier' THEN
      RETURN original_size * follower_multiplier;
    WHEN 'percentage' THEN
      RETURN (follower_capital_allocated * follower_percentage_balance / 100) / original_size;
    ELSE
      RETURN original_size;
  END CASE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION can_follower_copy_trade(
  follower_drawdown_limit numeric,
  potential_loss numeric
) RETURNS boolean AS $$
BEGIN
  RETURN potential_loss <= follower_drawdown_limit;
END;
$$ LANGUAGE plpgsql; 