# Duplicate Prevention System

## Overview
This system prevents users from creating duplicate broker accounts and follower accounts by implementing database constraints, validation functions, and triggers.

## What's Protected

### 1. Broker Accounts
- **Same user cannot have multiple accounts with the same broker and account ID**
- **Same user cannot have multiple accounts with the same account name**
- **Same user cannot have multiple accounts with the same API key + secret combination**

### 2. Follower Accounts (Subscriptions)
- **Same user cannot follow the same trader multiple times**
- **Users cannot follow themselves**
- **Only valid traders can be followed**

## Database Constraints

### Broker Accounts Table
```sql
-- Existing constraint
UNIQUE (user_id, account_name)

-- New constraints added
UNIQUE (user_id, broker_name, account_uid)
UNIQUE (user_id, api_key, api_secret)
```

### Subscriptions Table
```sql
-- New constraint added
UNIQUE (follower_id, trader_id)
```

## Validation Functions

### 1. `validate_broker_account()`
**Trigger function that runs before INSERT/UPDATE on broker_accounts**

Checks for:
- Duplicate broker + account_uid combination
- Duplicate account names
- Duplicate API keys

**Error Messages:**
- "You already have an account with this broker and account ID"
- "You already have an account with this name"
- "You already have an account with this API key and secret combination"

### 2. `validate_subscription()`
**Trigger function that runs before INSERT/UPDATE on subscriptions**

Checks for:
- Self-following attempts
- Duplicate follower-trader relationships
- Valid trader existence
- Valid follower existence

**Error Messages:**
- "You cannot follow yourself"
- "You are already following this trader"
- "Trader does not exist or is not a trader"
- "Follower does not exist"

## Helper Functions

### 1. `can_add_broker_account(user_uuid, broker_name, account_uid, account_name, api_key, api_secret)`
**Returns:** `(can_add boolean, reason text)`

Use this function to check if a user can add a broker account before attempting to insert.

### 2. `can_follow_trader(follower_uuid, trader_uuid)`
**Returns:** `(can_follow boolean, reason text)`

Use this function to check if a user can follow a trader before attempting to insert.

### 3. `get_user_broker_accounts(user_uuid)`
**Returns:** Table with user's broker accounts

Returns all broker accounts for a specific user with duplicate checking.

### 4. `get_user_subscriptions(user_uuid)`
**Returns:** Table with user's subscriptions

Returns all subscriptions for a specific user with trader information.

## Row Level Security (RLS)

### Broker Accounts
```sql
-- Users can only manage their own broker accounts
CREATE POLICY "Users can manage own broker accounts"
  ON broker_accounts
  FOR ALL
  USING (auth.uid() = user_id);
```

### Subscriptions
```sql
-- Followers can manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (auth.uid() = follower_id);

-- Traders can view their followers
CREATE POLICY "Traders can view their followers"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = trader_id);
```

## Usage Examples

### Frontend Integration

#### Check Before Adding Broker Account
```javascript
// Check if user can add broker account
const { data: canAdd, error } = await supabase
  .rpc('can_add_broker_account', {
    user_uuid: userId,
    broker_name_input: 'Binance',
    account_uid_input: 'account123',
    account_name_input: 'My Binance Account',
    api_key_input: 'your_api_key',
    api_secret_input: 'your_api_secret'
  });

if (canAdd && canAdd[0]?.can_add) {
  // Proceed with adding account
  const { data, error } = await supabase
    .from('broker_accounts')
    .insert({
      user_id: userId,
      broker_name: 'Binance',
      account_uid: 'account123',
      api_key: 'encrypted_key',
      api_secret: 'encrypted_secret',
      account_name: 'My Binance Account'
    });
} else {
  // Show error message
  console.error(canAdd[0]?.reason);
}
```

#### Check Before Following Trader
```javascript
// Check if user can follow trader
const { data: canFollow, error } = await supabase
  .rpc('can_follow_trader', {
    follower_uuid: currentUserId,
    trader_uuid: traderId
  });

if (canFollow && canFollow[0]?.can_follow) {
  // Proceed with following
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      follower_id: currentUserId,
      trader_id: traderId,
      risk_mode: 'fixed',
      capital_allocated: 1000
    });
} else {
  // Show error message
  console.error(canFollow[0]?.reason);
}
```

#### Get User's Broker Accounts
```javascript
// Get all broker accounts for current user
const { data: accounts, error } = await supabase
  .rpc('get_user_broker_accounts', {
    user_uuid: currentUserId
  });

console.log('User broker accounts:', accounts);
```

#### Get User's Subscriptions
```javascript
// Get all subscriptions for current user
const { data: subscriptions, error } = await supabase
  .rpc('get_user_subscriptions', {
    user_uuid: currentUserId
  });

console.log('User subscriptions:', subscriptions);
```

## Error Handling

### Database Level Errors
The system will automatically prevent duplicates and throw descriptive error messages:

```sql
-- This will fail with error message
INSERT INTO broker_accounts (user_id, broker_name, account_uid, api_key, api_secret, account_name)
VALUES ('user-uuid', 'Binance', 'existing-account', 'key', 'secret', 'My Account');
-- Error: You already have an account with this broker and account ID
```

### Application Level Validation
Use the helper functions to check before attempting database operations:

```javascript
// Check before insert
const canAdd = await supabase.rpc('can_add_broker_account', {...});
if (!canAdd.data[0]?.can_add) {
  // Handle error gracefully
  showError(canAdd.data[0]?.reason);
  return;
}
```

## Testing

### Run the Test Script
Execute `scripts/test-duplicate-prevention.sql` to verify all constraints and functions are working.

### Manual Testing
1. Try to add a broker account with duplicate information
2. Try to follow the same trader twice
3. Try to follow yourself
4. Verify error messages are descriptive and helpful

## Monitoring

### Check Constraints
```sql
-- View all unique constraints
SELECT 
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE constraint_type = 'UNIQUE'
AND table_name IN ('broker_accounts', 'subscriptions');
```

### Check Functions
```sql
-- View all validation functions
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%validate%';
```

### Check Triggers
```sql
-- View all triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers 
WHERE trigger_name LIKE '%validate%';
```

## Benefits

1. **Data Integrity**: Prevents duplicate data at the database level
2. **User Experience**: Clear error messages help users understand what went wrong
3. **Security**: RLS policies ensure users can only access their own data
4. **Performance**: Efficient validation functions with proper indexing
5. **Maintainability**: Centralized validation logic in database functions

## Maintenance

### Adding New Validation Rules
1. Modify the appropriate validation function
2. Update the trigger if needed
3. Test with the test script
4. Update documentation

### Removing Constraints
```sql
-- Remove specific constraints if needed
ALTER TABLE broker_accounts DROP CONSTRAINT IF EXISTS unique_user_broker_account;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS unique_follower_trader;
```

### Disabling Validation
```sql
-- Disable triggers temporarily
ALTER TABLE broker_accounts DISABLE TRIGGER validate_broker_account_trigger;
ALTER TABLE public.subscriptions DISABLE TRIGGER validate_subscription_trigger;
``` 