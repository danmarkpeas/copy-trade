# Supabase Edge Function Setup for Delta Exchange API

## 🎯 **Overview**

This approach moves Delta Exchange API verification to a Supabase Edge Function, which provides:
- **Precise timestamp synchronization** with Delta Exchange server
- **Proper signature generation** using Web Crypto API
- **Better error handling** and debugging
- **Scalable architecture** for copy trading

## 📋 **Architecture**

```
Frontend → Next.js API → Supabase Edge Function → Delta Exchange API
```

### **Benefits:**
1. **No timestamp sync issues** - Edge Function gets exact server time
2. **Proper signature generation** - Uses Web Crypto API in Deno runtime
3. **Better performance** - Runs closer to Delta Exchange servers
4. **Scalable** - Can handle multiple API calls efficiently

## 🚀 **Setup Instructions**

### **1. Install Supabase CLI**
```bash
npm install -g supabase
```

### **2. Login to Supabase**
```bash
supabase login
```

### **3. Deploy Edge Function**
```bash
# Make the script executable
chmod +x scripts/deploy-edge-function.sh

# Run the deployment script
./scripts/deploy-edge-function.sh
```

### **4. Alternative Manual Deployment**
```bash
supabase functions deploy delta-api-verify
```

## 🔧 **Edge Function Details**

### **Location:** `supabase/functions/delta-api-verify/index.ts`

### **Key Features:**
- **Precise timestamp sync** - Gets exact Delta server time
- **2-second buffer** - Adds minimal buffer to prevent expiration
- **Web Crypto API** - Uses Deno's native crypto for HMAC-SHA256
- **CORS support** - Handles cross-origin requests
- **Error handling** - Specific error messages for common issues

### **Signature Generation:**
```typescript
function signRequest(secret: string, method: string, path: string, timestamp: number, body: string = '') {
  const payload = method + path + timestamp + body;
  // Uses Web Crypto API for HMAC-SHA256
  return crypto.subtle.importKey(...)
}
```

## 📊 **API Endpoints**

### **Edge Function URL:**
```
https://[YOUR_PROJECT_REF].supabase.co/functions/v1/delta-api-verify
```

### **Request Format:**
```json
{
  "broker_name": "delta",
  "api_key": "your_api_key",
  "api_secret": "your_api_secret"
}
```

### **Response Format:**
```json
{
  "valid": true
}
```

## 🔍 **Testing**

### **1. Test Edge Function Directly:**
```bash
curl -X POST https://[YOUR_PROJECT_REF].supabase.co/functions/v1/delta-api-verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_ANON_KEY]" \
  -d '{
    "broker_name": "delta",
    "api_key": "your_api_key",
    "api_secret": "your_api_secret"
  }'
```

### **2. Check Function Logs:**
```bash
supabase functions logs delta-api-verify
```

### **3. Monitor Function:**
```bash
supabase functions serve delta-api-verify
```

## 🛠 **Troubleshooting**

### **Common Issues:**

1. **Function not deployed:**
   ```bash
   supabase functions deploy delta-api-verify
   ```

2. **Authentication error:**
   - Check your Supabase anon key
   - Ensure you're logged in: `supabase login`

3. **CORS issues:**
   - Edge Function includes CORS headers
   - Check browser console for errors

4. **Timestamp issues:**
   - Edge Function uses exact server time + 2s buffer
   - Should eliminate `expired_signature` errors

### **Debug Steps:**

1. **Check function logs:**
   ```bash
   supabase functions logs delta-api-verify --follow
   ```

2. **Test connectivity:**
   ```bash
   curl https://api.delta.exchange/v2/time
   ```

3. **Verify deployment:**
   ```bash
   supabase functions list
   ```

## 🔐 **Security Considerations**

### **API Key Storage:**
- **Never store** API keys in client-side code
- **Use encrypted columns** in Supabase for storage
- **Consider Supabase Vault** for sensitive data

### **Access Control:**
- Edge Function validates API key format
- Returns specific error messages
- Handles authentication properly

## 📈 **Performance**

### **Benefits:**
- **Faster response times** - closer to Delta Exchange
- **Better reliability** - dedicated function
- **Scalable** - can handle multiple requests
- **No timestamp sync issues** - precise timing

### **Monitoring:**
```bash
# Check function performance
supabase functions logs delta-api-verify --follow

# Monitor usage
supabase functions list
```

## 🎯 **Next Steps**

1. **Deploy the Edge Function**
2. **Test with your API keys**
3. **Monitor logs for any issues**
4. **Scale for copy trading operations**

## 📞 **Support**

If you encounter issues:
1. Check the function logs
2. Verify your API keys
3. Test connectivity to Delta Exchange
4. Review the error messages in the response

The Edge Function approach should eliminate all timestamp synchronization issues! 🚀 