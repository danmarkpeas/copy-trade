-- USERS TABLE
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique,
  role text default 'follower',
  kyc_status text default 'pending',
  created_at timestamptz default now()
);

-- TRADERS TABLE
create table if not exists public.traders (
  id uuid primary key references users(id) on delete cascade,
  bio text,
  performance_rating float,
  total_followers int default 0
);

-- FOLLOWERS TABLE
create table if not exists public.followers (
  id uuid primary key references users(id) on delete cascade,
  subscribed_to uuid references traders(id) on delete set null,
  capital_allocated numeric,
  risk_level text default 'medium',
  copy_mode text default 'copy' check (copy_mode in ('copy', 'notify'))
);

-- TRADES TABLE
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid references traders(id),
  asset text,
  action text check (action in ('buy', 'sell')),
  quantity numeric,
  price numeric,
  status text default 'open',
  created_at timestamptz default now()
);

-- COPIED_TRADES TABLE
create table if not exists public.copied_trades (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid references trades(id),
  follower_id uuid references followers(id),
  quantity numeric,
  price numeric,
  status text default 'pending',
  copied_at timestamptz default now()
);

-- NOTIFICATIONS TABLE
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  type text,
  message text,
  created_at timestamptz default now(),
  read boolean default false
);

-- FUNCTION + TRIGGER TO SYNC auth.users WITH public.users
-- Fixed version with better error handling and name extraction
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_name text;
begin
  -- Extract name from user metadata
  -- Try to get name from raw_user_meta_data first (Google OAuth)
  if new.raw_user_meta_data is not null and new.raw_user_meta_data ? 'name' then
    user_name := new.raw_user_meta_data->>'name';
  elsif new.raw_user_meta_data is not null and new.raw_user_meta_data ? 'full_name' then
    user_name := new.raw_user_meta_data->>'full_name';
  elsif new.raw_user_meta_data is not null and new.raw_user_meta_data ? 'given_name' then
    -- Combine given_name and family_name if available
    if new.raw_user_meta_data ? 'family_name' then
      user_name := (new.raw_user_meta_data->>'given_name') || ' ' || (new.raw_user_meta_data->>'family_name');
    else
      user_name := new.raw_user_meta_data->>'given_name';
    end if;
  else
    -- Fallback: use email prefix as name
    user_name := split_part(new.email, '@', 1);
  end if;

  -- Use a DO block to handle potential errors gracefully
  begin
    insert into public.users (id, email, name, created_at)
    values (new.id, new.email, user_name, now());
  exception
    when unique_violation then
      -- User already exists, this is fine
      null;
    when others then
      -- Log the error but don't fail the auth process
      raise log 'Error in handle_new_user trigger: %', sqlerrm;
      null;
  end;
  return new;
end;
$$ language plpgsql security definer;

-- Drop and recreate the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Automatically close all copied_trades when a trade is closed
create or replace function close_copied_trades_on_trade_close()
returns trigger as $$
begin
  update copied_trades set status = 'closed' where trade_id = new.id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_close_copied_trades on trades;
create trigger trg_close_copied_trades
after update of status on trades
for each row
when (new.status = 'closed')
execute function close_copied_trades_on_trade_close();

-- RLS POLICIES
alter table public.users enable row level security;

-- Allow the trigger function to insert users (bypass RLS)
create policy "Allow trigger function to insert users"
  on public.users for insert
  with check (true);

create policy "User can access own row"
  on public.users for select using (auth.uid() = id);
create policy "User can update own row"
  on public.users for update using (auth.uid() = id);

alter table public.traders enable row level security;
create policy "Traders manage own data"
  on public.traders for all using (auth.uid() = id);

alter table public.followers enable row level security;
create policy "Followers manage own data"
  on public.followers for all using (auth.uid() = id);

alter table public.trades enable row level security;
create policy "Trader manages own trades"
  on public.trades for all using (auth.uid() = trader_id);

alter table public.copied_trades enable row level security;
create policy "Follower sees own copied trades"
  on public.copied_trades for select using (auth.uid() = follower_id);

create policy "Anyone can view trades"
  on public.trades for select using (true);

-- Broker Accounts Table (Universal for all brokers)
create table if not exists broker_accounts (
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
  created_at timestamptz default now(),
  unique (user_id, account_name) -- Enforce unique account_name per user
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references users(id) on delete cascade,
  trader_id uuid references users(id) on delete cascade,
  risk_mode text default 'fixed', -- e.g. 'fixed', 'multiplier', 'proportional'
  capital_allocated numeric,
  status text default 'active',
  created_at timestamptz default now()
);

-- TRADE HISTORY TABLE (for all buy/sell/close events)
create table if not exists public.trade_history (
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

ALTER TABLE public.trade_history ADD COLUMN IF NOT EXISTS delta_user_id int;

alter table public.trade_history enable row level security;
create policy "User can view own trade history"
  on public.trade_history for select using (auth.uid() = user_id);
create policy "Anyone can view trade history"
  on public.trade_history for select using (true);
create policy "Allow all inserts for trade_history"
  on public.trade_history for insert using (true); 

-- Copy trades mapping table for tracking master → follower trade relationships
CREATE TABLE IF NOT EXISTS copy_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_trade_id TEXT NOT NULL,
  master_broker_id UUID REFERENCES broker_accounts(id) ON DELETE CASCADE,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  follower_broker_id UUID REFERENCES broker_accounts(id) ON DELETE CASCADE,
  follower_order_id TEXT,
  original_symbol TEXT NOT NULL,
  original_side TEXT NOT NULL, -- 'buy' or 'sell'
  original_size DECIMAL(20,8) NOT NULL,
  original_price DECIMAL(20,8) NOT NULL,
  copied_size DECIMAL(20,8) NOT NULL,
  copied_price DECIMAL(20,8) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'executed', 'failed', 'exited', 'cancelled'
  entry_time TIMESTAMPTZ DEFAULT NOW(),
  exit_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT copy_trades_status_check CHECK (status IN ('pending', 'executed', 'failed', 'exited', 'cancelled')),
  CONSTRAINT copy_trades_side_check CHECK (original_side IN ('buy', 'sell'))
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_copy_trades_master_trade_id ON copy_trades(master_trade_id);
CREATE INDEX IF NOT EXISTS idx_copy_trades_follower_id ON copy_trades(follower_id);
CREATE INDEX IF NOT EXISTS idx_copy_trades_status ON copy_trades(status);
CREATE INDEX IF NOT EXISTS idx_copy_trades_entry_time ON copy_trades(entry_time);
CREATE INDEX IF NOT EXISTS idx_copy_trades_master_broker_id ON copy_trades(master_broker_id);

-- Trade sync verification table
CREATE TABLE IF NOT EXISTS trade_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_broker_id UUID REFERENCES broker_accounts(id) ON DELETE CASCADE,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  master_trade_id TEXT NOT NULL,
  follower_trade_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced', -- 'synced', 'unsynced', 'error'
  last_verified TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT trade_sync_status_check CHECK (sync_status IN ('synced', 'unsynced', 'error'))
);

-- Indexes for sync status
CREATE INDEX IF NOT EXISTS idx_trade_sync_master_broker_id ON trade_sync_status(master_broker_id);
CREATE INDEX IF NOT EXISTS idx_trade_sync_follower_id ON trade_sync_status(follower_id);
CREATE INDEX IF NOT EXISTS idx_trade_sync_status ON trade_sync_status(sync_status);

-- Enhanced followers table with additional fields
ALTER TABLE followers ADD COLUMN IF NOT EXISTS broker_account_id UUID REFERENCES broker_accounts(id);
ALTER TABLE followers ADD COLUMN IF NOT EXISTS last_sync_time TIMESTAMPTZ;
ALTER TABLE followers ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'active';
ALTER TABLE followers ADD COLUMN IF NOT EXISTS max_drawdown DECIMAL(5,2) DEFAULT 10.00; -- 10% default

-- Add constraints
ALTER TABLE followers ADD CONSTRAINT IF NOT EXISTS followers_sync_status_check 
  CHECK (sync_status IN ('active', 'paused', 'error'));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_copy_trades_updated_at BEFORE UPDATE ON copy_trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trade_sync_status_updated_at BEFORE UPDATE ON trade_sync_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate copied trade size based on follower settings
CREATE OR REPLACE FUNCTION calculate_copied_size(
  original_size DECIMAL,
  follower_risk_mode TEXT,
  follower_capital_allocated DECIMAL,
  follower_multiplier DECIMAL DEFAULT 1.0,
  follower_lot_size DECIMAL DEFAULT NULL,
  follower_percentage_balance DECIMAL DEFAULT NULL
) RETURNS DECIMAL AS $$
BEGIN
  CASE follower_risk_mode
    WHEN 'fixed' THEN
      RETURN COALESCE(follower_lot_size, 0.01); -- Default minimum lot
    WHEN 'multiplier' THEN
      RETURN original_size * COALESCE(follower_multiplier, 1.0);
    WHEN 'percentage' THEN
      RETURN (original_size * COALESCE(follower_percentage_balance, 100)) / 100;
    ELSE
      RETURN original_size; -- Default to exact copy
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to check if follower can copy trade (drawdown check)
CREATE OR REPLACE FUNCTION can_follower_copy_trade(
  follower_user_id UUID,
  trade_size DECIMAL,
  trade_price DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  follower_record RECORD;
  current_balance DECIMAL;
  potential_loss DECIMAL;
BEGIN
  -- Get follower settings
  SELECT * INTO follower_record 
  FROM followers 
  WHERE user_id = follower_user_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate potential loss (simplified - in real system you'd get actual balance)
  potential_loss := trade_size * trade_price * 0.1; -- Assume 10% potential loss
  
  -- Check if this would exceed drawdown limit
  IF potential_loss > (follower_record.capital_allocated * follower_record.max_drawdown / 100) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql; 