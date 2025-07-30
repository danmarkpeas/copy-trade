# Enhanced Follower System Guide

## Overview

The enhanced follower system now includes comprehensive broker credentials, verification functionality, and advanced trading parameters. This system allows users to create multiple follower accounts, each with their own broker credentials and detailed trading settings.

## Key Features

### 1. Broker Credentials for Followers
- **Profile ID**: Optional profile identifier for the broker account
- **API Key**: Follower's own API key for the broker
- **API Secret**: Follower's own API secret for the broker
- **Verification**: Built-in verification system to validate credentials

### 2. Master Broker Account Selection
- **Dropdown Integration**: Shows only broker accounts belonging to the same user
- **One-to-One Relationship**: Each follower account can follow only one master broker account
- **Security**: Prevents cross-user broker account access

### 3. Advanced Trading Parameters
- **Lot Size Management**: 
  - `lot_size`: Default lot size for trades
  - `max_lot_size`: Maximum allowed lot size
  - `min_lot_size`: Minimum allowed lot size
- **Risk Management**:
  - `drawdown_limit`: Maximum drawdown percentage
  - `stop_loss_percentage`: Stop loss percentage
  - `take_profit_percentage`: Take profit percentage
- **Trading Limits**:
  - `max_daily_trades`: Maximum trades per day
  - `max_open_positions`: Maximum concurrent open positions
- **Risk Level**: Categorization (low, medium, high)

### 4. Copy Mode Validation
- **Fixed Lot**: Uses a specific lot size for all trades
- **Multiplier**: Multiplies the master account's lot size (0.1 - 3.0)
- **Percentage Balance**: Uses a percentage of account balance (1% - 100%)

## Database Schema

### Enhanced Followers Table

```sql
-- New columns added to the followers table:
profile_id text,                    -- Broker profile ID
api_key text,                       -- Follower's API key
api_secret text,                    -- Follower's API secret
lot_size numeric DEFAULT 1.0,       -- Default lot size
max_lot_size numeric DEFAULT 10.0,  -- Maximum lot size
min_lot_size numeric DEFAULT 0.01,  -- Minimum lot size
account_status text DEFAULT 'pending', -- Account status
is_verified boolean DEFAULT false,  -- Verification status
verification_date timestamptz,      -- When verified
master_broker_account_id uuid,      -- Reference to master broker account
max_daily_trades int DEFAULT 50,    -- Daily trade limit
max_open_positions int DEFAULT 10,  -- Position limit
stop_loss_percentage numeric DEFAULT 5.0,  -- Stop loss %
take_profit_percentage numeric DEFAULT 10.0, -- Take profit %
```

## Core Functions

### 1. Broker Account Dropdown
```sql
get_user_broker_accounts_for_follower(user_uuid uuid)
```
- Returns only broker accounts belonging to the specified user
- Includes display names for easy selection
- Filters for active accounts only

### 2. Credential Validation
```sql
validate_follower_broker_credentials(api_key, api_secret, profile_id)
```
- Validates API key and secret format
- Prevents duplicate credential usage
- Prevents using master account credentials
- Returns detailed validation results

### 3. Account Verification
```sql
verify_follower_broker_account(follower_uuid, follower_name)
```
- Tests API credentials with actual broker API calls
- Updates verification status automatically
- Supports different brokers (Delta Exchange, etc.)

### 4. Complete Account Creation
```sql
create_follower_account_complete(user_uuid, follower_name, master_broker_account_id, ...)
```
- Creates follower account with all parameters
- Validates all settings before creation
- Returns detailed creation results

### 5. Account Management
```sql
get_follower_account_complete_details(user_uuid, follower_name)
update_follower_account_complete(user_uuid, follower_name, ...)
get_user_follower_accounts_complete(user_uuid)
```

## Usage Examples

### Creating a Follower Account

```sql
-- Create a follower account with all settings
SELECT * FROM create_follower_account_complete(
  'user-uuid-here',
  'My Follower Account',
  'master-broker-account-uuid',
  'profile_123',
  'api_key_here',
  'api_secret_here',
  'multiplier',
  2.0,  -- multiplier value
  NULL, -- percentage (not used for multiplier)
  NULL, -- fixed lot (not used for multiplier)
  1.0,  -- lot size
  10.0, -- max lot size
  0.01, -- min lot size
  20.0, -- drawdown limit
  10000.0, -- total balance
  'medium', -- risk level
  50,   -- max daily trades
  10,   -- max open positions
  5.0,  -- stop loss percentage
  10.0  -- take profit percentage
);
```

### Getting Broker Accounts for Dropdown

```sql
-- Get user's broker accounts for dropdown
SELECT * FROM get_user_broker_accounts_for_follower('user-uuid-here');
```

### Verifying Follower Account

```sql
-- Verify follower account credentials
SELECT * FROM verify_follower_broker_account('user-uuid-here', 'My Follower Account');
```

### Updating Follower Settings

```sql
-- Update follower account settings
SELECT * FROM update_follower_account_complete(
  'user-uuid-here',
  'My Follower Account',
  NULL, -- profile_id (keep current)
  'new_api_key', -- new API key
  'new_api_secret', -- new API secret
  'fixed lot', -- new copy mode
  NULL, -- multiplier (not used for fixed lot)
  NULL, -- percentage (not used for fixed lot)
  2.0,  -- new fixed lot size
  2.0,  -- new lot size
  15.0, -- new max lot size
  0.05, -- new min lot size
  25.0, -- new drawdown limit
  15000.0, -- new total balance
  'high', -- new risk level
  75,   -- new max daily trades
  15,   -- new max open positions
  3.0,  -- new stop loss percentage
  15.0  -- new take profit percentage
);
```

## Validation Rules

### Copy Mode Validation
- **Fixed Lot**: Requires fixed_lot between 0.01 and 1000.0
- **Multiplier**: Requires multiplier between 0.1 and 3.0
- **Percentage Balance**: Requires percentage between 1.0 and 100.0

### Lot Size Validation
- Must be between `min_lot_size` and `max_lot_size`
- Default range: 0.01 to 10.0

### Drawdown Limit Validation
- Must be between 1.0% and 50.0%
- Cannot exceed total balance

### Risk Level Options
- `low`: Conservative settings
- `medium`: Balanced settings
- `high`: Aggressive settings

### Account Status Options
- `pending`: Awaiting verification
- `verified`: Successfully verified
- `inactive`: Not active
- `suspended`: Temporarily suspended

## Security Features

### Credential Protection
- API keys are masked in display functions
- Credentials are validated before storage
- Duplicate credential prevention
- Master account credential protection

### Access Control
- Users can only access their own broker accounts
- Follower accounts are isolated per user
- RLS policies enforce data isolation

### Verification Process
- Automatic API credential testing
- Manual verification for unsupported brokers
- Verification timestamp tracking

## Frontend Integration

### Broker Account Dropdown
```javascript
// Get user's broker accounts for dropdown
const { data: brokerAccounts } = await supabase.rpc(
  'get_user_broker_accounts_for_follower',
  { user_uuid: user.id }
);

// Use in dropdown
<select>
  {brokerAccounts?.map(account => (
    <option key={account.id} value={account.id}>
      {account.display_name}
    </option>
  ))}
</select>
```

### Follower Account Creation
```javascript
// Create follower account with all settings
const { data, error } = await supabase.rpc(
  'create_follower_account_complete',
  {
    user_uuid: user.id,
    follower_name_input: 'My Follower',
    master_broker_account_id_input: selectedBrokerId,
    profile_id_input: profileId,
    api_key_input: apiKey,
    api_secret_input: apiSecret,
    copy_mode_input: 'multiplier',
    multiplier_input: 2.0,
    // ... other parameters
  }
);
```

### Account Verification
```javascript
// Verify follower account
const { data, error } = await supabase.rpc(
  'verify_follower_broker_account',
  {
    follower_uuid: user.id,
    follower_name_input: 'My Follower'
  }
);
```

## Testing

Run the comprehensive test script to verify all functionality:

```sql
-- Run the test script
\i scripts/test-enhanced-follower-system.sql
```

This will test:
- Table structure
- Function availability
- Validation logic
- Credential validation
- Copy mode validation
- Constraint verification

## Error Handling

### Common Error Messages
- `"API Key is required"`: Missing API key
- `"API Secret is required"`: Missing API secret
- `"These API credentials are already in use"`: Duplicate credentials
- `"Master broker account not found"`: Invalid broker account selection
- `"Copy mode must be one of: fixed lot, multiplier, % balance"`: Invalid copy mode
- `"Multiplier must be between 0.1 and 3.0"`: Invalid multiplier value

### Troubleshooting
1. **Verification Fails**: Check API credentials and network connectivity
2. **Validation Errors**: Review input values against validation rules
3. **Permission Errors**: Ensure user owns the broker account
4. **Duplicate Errors**: Check for existing accounts with same name/credentials

## Migration Notes

### Existing Data
- Existing follower accounts will have default values for new fields
- API credentials can be added later via update functions
- Verification status will be `false` for existing accounts

### Backward Compatibility
- All existing functions continue to work
- New fields have sensible defaults
- Gradual migration supported

## Best Practices

### Security
- Always validate credentials before storage
- Use masked display for sensitive data
- Implement proper error handling
- Regular credential verification

### Performance
- Index frequently queried fields
- Use appropriate data types
- Implement connection pooling
- Cache broker account lists

### User Experience
- Provide clear validation messages
- Show real-time validation feedback
- Implement progressive disclosure
- Offer helpful defaults

## Support

For issues or questions:
1. Check the test script output
2. Review validation error messages
3. Verify database constraints
4. Test with sample data
5. Check function availability 