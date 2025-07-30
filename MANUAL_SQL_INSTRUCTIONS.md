# 🔧 Manual SQL Instructions

## 🚨 **Error**: Could not find the function public.create_follower_account

The error you're seeing is because the required database functions don't exist in your Supabase database. Here's how to fix it:

## 📋 **Step-by-Step Instructions**

### 1. **Go to Supabase Dashboard**
- Open: https://supabase.com/dashboard/project/urjgxetnqogwryhpafma/sql
- Make sure you're logged in to your Supabase account

### 2. **Copy the SQL Code**
Copy the entire contents of `scripts/create-missing-functions.sql` and paste it into the SQL editor.

### 3. **Execute the SQL**
- Click the "Run" button (or press Ctrl+Enter)
- Wait for all statements to execute successfully

### 4. **Verify Functions Created**
You should see success messages for:
- ✅ `create_follower_account` function
- ✅ `get_follower_accounts` function  
- ✅ `update_follower_account` function
- ✅ `delete_follower_account` function
- ✅ `verify_broker_credentials` function
- ✅ RLS policies for followers table

## 🎯 **What This Fixes**

The SQL creates these missing functions:

### **create_follower_account**
- Creates new follower records
- Handles API credentials
- Sets default values
- Returns success/error JSON

### **get_follower_accounts**
- Retrieves follower accounts for a user
- Returns follower details
- Handles authentication

### **update_follower_account**
- Updates existing follower settings
- Validates user permissions
- Returns success/error JSON

### **delete_follower_account**
- Deletes follower accounts
- Validates user permissions
- Returns success/error JSON

### **verify_broker_credentials**
- Validates broker API credentials
- Returns verification status

## 🚀 **After Running the SQL**

1. **Go back to your app**: http://localhost:3000/followers
2. **Try creating a follower account again**
3. **The error should be resolved**
4. **Test the real-time monitoring**: http://localhost:3000/trades

## 🔍 **Expected Result**

After creating a follower account, the real-time monitoring should show:
```
✅ Real-time monitoring completed: {
  success: true,
  message: 'Real-time trade monitoring completed',
  broker_id: 'ff9ce81f-7d9d-471d-9c7d-4615b32b3602',
  total_trades_found: 0,
  active_followers: 1,  // ← This will change from 0 to 1
  trades_copied: 0,
  copy_results: [],
  timestamp: '2025-07-27T10:49:21.305Z'
}
```

## 🆘 **If You Still Get Errors**

1. **Check the SQL execution**: Make sure all statements ran successfully
2. **Verify function exists**: In Supabase Dashboard → Database → Functions
3. **Check RLS policies**: In Supabase Dashboard → Authentication → Policies
4. **Restart your app**: Stop and restart `npm run dev`

## 📞 **Need Help?**

If you encounter any issues:
1. Check the Supabase Dashboard logs
2. Verify all functions were created successfully
3. Make sure you're logged in to the app when creating followers

The functions are essential for the follower management system to work properly! 🎉 