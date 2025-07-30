# Timestamp Synchronization Fix for Delta Exchange API

## Problem
You're getting this error:
```json
{
  "error": {
    "code": "expired_signature",
    "context": {
      "request_time": 1753503642,
      "server_time": 1753503648
    }
  },
  "success": false
}
```

This means your request timestamp is 6 seconds behind the server time, causing the signature to expire.

## Root Cause
The Delta Exchange API requires precise timestamp synchronization. If your server's clock is even a few seconds off, API calls will fail with `expired_signature` errors.

## Solution

### 1. Database-Level Fix (Recommended)
Run the timestamp synchronization script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of scripts/fix-timestamp-sync.sql
```

This creates:
- **Server time synchronization** functions
- **Retry logic** for timestamp errors
- **Proper signature generation** with synchronized timestamps

### 2. JavaScript-Level Fix
Replace your existing `scripts/delta-sync.js` with the fixed version:

```bash
# Backup your current script
cp scripts/delta-sync.js scripts/delta-sync-backup.js

# Use the fixed version
cp scripts/delta-sync-fixed.js scripts/delta-sync.js
```

## How the Fix Works

### Database Functions Created

1. **`get_delta_server_time()`** - Fetches current time from Delta Exchange server
2. **`get_synchronized_timestamp()`** - Calculates synchronized timestamp with offset
3. **`generate_delta_signature()`** - Creates signatures with proper timestamps
4. **`call_delta_api_with_retry()`** - Makes API calls with automatic retry on timestamp errors
5. **`sync_broker_positions_with_retry()`** - Syncs broker positions with retry logic

### JavaScript Improvements

1. **Time Synchronization** - Fetches server time and calculates offset
2. **Retry Logic** - Automatically retries on timestamp errors
3. **Exponential Backoff** - Waits longer between retries
4. **Fresh Timestamps** - Generates new timestamp for each attempt

## Usage Examples

### Database Functions

#### Test Timestamp Synchronization
```sql
-- Test if timestamp sync is working
SELECT * FROM test_timestamp_sync();
```

#### Sync Broker Positions with Retry
```sql
-- Sync a specific broker account
SELECT * FROM sync_broker_positions_with_retry('your-broker-id');
```

#### Make API Call with Retry
```sql
-- Call Delta API with automatic retry
SELECT * FROM call_delta_api_with_retry(
  'GET',
  '/v2/positions/margined',
  '',
  'your-api-key',
  'your-api-secret'
);
```

### JavaScript Usage

#### Run the Fixed Sync Script
```bash
node scripts/delta-sync.js
```

The script will:
1. Sync time with Delta server
2. Process all active broker accounts
3. Retry failed API calls automatically
4. Log detailed information about retries

## Testing the Fix

### 1. Test Database Functions
```sql
-- Run the test script
SELECT * FROM test_timestamp_sync();
```

Expected output:
```
test_name           | result | details
Server Time Sync    | PASS   | {"server_time": 1753503648, "local_time": 1753503642, "offset_seconds": 6}
Public API Call     | PASS   | {"success": true, "attempts": 1, "error": null}
Timestamp Generation| PASS   | {"timestamp": "1753503649", "signature_length": 64}
```

### 2. Test JavaScript Script
```bash
node scripts/delta-sync.js
```

Expected output:
```
Syncing time with Delta Exchange server...
Time sync: Server=1753503648, Local=1753503642, Offset=6s
Found 1 active Delta Exchange accounts
Processing broker: My Delta Account
API call attempt 1/3: GET /v2/positions/margined
API call successful on attempt 1
[My Delta Account] Fetched 5 open positions
[My Delta Account] Sync completed successfully
```

## Error Handling

### Common Errors and Solutions

1. **`expired_signature`** - Automatically retried with fresh timestamp
2. **`invalid_signature`** - Retried with re-synchronized time
3. **Network errors** - Retried with exponential backoff
4. **Rate limiting** - Waits before retrying

### Manual Troubleshooting

If you still get timestamp errors:

1. **Check server time offset:**
   ```sql
   SELECT 
     get_delta_server_time() as server_time,
     EXTRACT(EPOCH FROM NOW())::bigint as local_time,
     get_delta_server_time() - EXTRACT(EPOCH FROM NOW())::bigint as offset;
   ```

2. **Test API connectivity:**
   ```sql
   SELECT * FROM call_delta_api_with_retry('GET', '/v2/products');
   ```

3. **Check broker account validity:**
   ```sql
   SELECT * FROM sync_broker_positions_with_retry('your-broker-id');
   ```

## Monitoring

### Log Monitoring
The scripts log detailed information about:
- Time synchronization attempts
- API call retries
- Success/failure rates
- Error messages

### Database Monitoring
Check for timestamp-related errors in Supabase logs:
```sql
-- View recent API call results
SELECT 
  success,
  attempts,
  error,
  created_at
FROM your_api_logs_table
WHERE error LIKE '%timestamp%' OR error LIKE '%signature%'
ORDER BY created_at DESC
LIMIT 10;
```

## Best Practices

### 1. Regular Time Sync
- Sync time before each batch of API calls
- Re-sync if timestamp errors occur
- Monitor time offset regularly

### 2. Retry Strategy
- Use exponential backoff (1s, 2s, 4s, etc.)
- Limit retries to prevent infinite loops
- Log all retry attempts for debugging

### 3. Error Handling
- Distinguish between retryable and non-retryable errors
- Provide clear error messages
- Gracefully handle API rate limits

### 4. Monitoring
- Track success rates
- Monitor time offset trends
- Alert on persistent timestamp issues

## Troubleshooting

### If Timestamp Sync Fails
1. Check network connectivity to Delta Exchange
2. Verify API endpoints are accessible
3. Check if Delta Exchange is experiencing issues
4. Fall back to local time with warning

### If Retries Don't Work
1. Check API key/secret validity
2. Verify account permissions
3. Check for rate limiting
4. Review Delta Exchange API documentation

### Performance Optimization
1. Cache server time for short periods
2. Batch API calls when possible
3. Use connection pooling
4. Monitor API response times

## Support

If you continue to experience timestamp issues:

1. **Check Delta Exchange status** - Visit their status page
2. **Review API documentation** - Check for recent changes
3. **Monitor your server clock** - Ensure NTP is configured
4. **Contact Delta Exchange support** - For persistent issues

## Files Modified

- `scripts/fix-timestamp-sync.sql` - Database functions for timestamp sync
- `scripts/delta-sync-fixed.js` - Updated JavaScript sync script
- `TIMESTAMP_SYNC_GUIDE.md` - This documentation

## Next Steps

1. **Apply the database fix** by running the SQL script
2. **Update your JavaScript scripts** with the fixed versions
3. **Test the synchronization** using the provided test functions
4. **Monitor the results** and adjust as needed
5. **Set up regular monitoring** for timestamp issues 