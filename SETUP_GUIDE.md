# 🚀 **Copy Trading System Setup Guide**

## 📋 **Step-by-Step Setup Instructions**

### **Step 1: Create a Broker Account**

1. **Open the application**: Go to http://localhost:3003
2. **Navigate to Connect Broker**: Click on "Connect Broker" in the sidebar
3. **Add Delta Exchange Account**:
   - **Broker Name**: `delta`
   - **Account Name**: `Master` (or any name you prefer)
   - **Account UID**: Your Delta Exchange account ID
   - **API Key**: Your Delta Exchange API key
   - **API Secret**: Your Delta Exchange API secret

4. **Verify the account**: The system will automatically verify your API credentials

### **Step 2: Create a Follower Account**

1. **Navigate to Followers**: Click on "Followers" in the sidebar
2. **Add New Follower**:
   - **Trader**: Select your account
   - **Broker Account**: Select the broker account you just created
   - **Copy Mode**: Choose one of:
     - **Fixed**: Always copy a fixed lot size (e.g., 0.01)
     - **Multiplier**: Copy master's size × multiplier (e.g., 0.5 = half size)
     - **Percentage**: Copy percentage of master's trade (e.g., 50%)
   - **Settings**:
     - **Multiplier**: 0.5 (if using multiplier mode)
     - **Lot Size**: 0.01 (if using fixed mode)
     - **Percentage Balance**: 10 (if using percentage mode)
     - **Capital Allocated**: 1000
     - **Drawdown Limit**: 5%
     - **Active**: ✅ Check this box
     - **Sync Status**: `active`

### **Step 3: Test the Copy Trading System**

1. **Go to Trades Page**: Click on "Trades" in the sidebar
2. **Start Monitoring**: Click the "Real-Time Monitor & Copy" button
3. **Check Results**: Look at the monitoring results and copied trades

## 🧪 **Test Data Setup (Optional)**

If you want to test without real Delta Exchange trades, you can use the test scripts:

```bash
# Set up test environment
node scripts/setup-test-environment.js

# Test complete system
node scripts/test-complete-copy-trading.js
```

## 📊 **Expected Results**

After setup, you should see:

### **Monitoring Results**
```
✅ Monitoring Results
Total Trades Found: 0 (or actual trades if any)
Active Followers: 1 (or more)
Trades Copied: 0 (or actual copied trades)
Trades Failed: 0
Timestamp: [current time]
```

### **Copied Trades Tab**
- Shows all trades that have been copied from master to followers
- Includes trade details, sizes, prices, and status

## 🔧 **Troubleshooting**

### **"No active broker accounts found"**
- Make sure you've created a broker account in Step 1
- Verify the broker account is marked as "Active"

### **"Failed to fetch followers"**
- Make sure you've created at least one follower account
- Verify the follower is marked as "Active" with "active" sync status

### **"No copied trades found"**
- This is normal if there are no recent trades from the master account
- The system only copies new trades, not historical ones

## 🎯 **System Status Indicators**

### **✅ Working Correctly**
- Real-time monitoring completes successfully
- Shows "Active Followers: 1" (or more)
- No error messages in monitoring results

### **⚠️ Needs Setup**
- Shows "Active Followers: 0"
- "Failed to fetch followers" error
- "No active broker accounts found"

## 🚀 **Production Ready Features**

Once set up, your system will:

1. **Monitor Delta Exchange** in real-time for new trades
2. **Automatically copy trades** to follower accounts
3. **Apply risk management** with drawdown limits
4. **Track all trades** with complete audit trail
5. **Handle errors** with retry mechanisms
6. **Scale** to support multiple followers

## 📞 **Support**

If you encounter issues:

1. Check the browser console for error messages
2. Verify all account credentials are correct
3. Ensure broker and follower accounts are active
4. Check the monitoring results for specific error details

---

**🎯 Your copy trading system is ready to go! Just follow these steps to set up your broker and follower accounts.** 