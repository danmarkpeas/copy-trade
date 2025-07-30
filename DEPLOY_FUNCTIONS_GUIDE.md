# 🚀 Deploy Edge Functions Guide

## 📋 **Current Status:**
- ✅ **real-time-trade-monitor**: EXISTS and working
- ✅ **delta-api-verify**: EXISTS and working  
- ❌ **copy-trade**: NEEDS TO BE DEPLOYED
- ❌ **send-email**: NEEDS TO BE DEPLOYED

## 🔍 **How to Find Edge Functions in Supabase Dashboard:**

### **Step 1: Access Supabase Dashboard**
1. Go to: https://supabase.com/dashboard
2. Sign in with your account
3. Select your project: `urjgxetnqogwryhpafma`

### **Step 2: Navigate to Edge Functions**
1. In the left sidebar, look for:
   - **"Edge Functions"** (most common)
   - **"Functions"** 
   - **"Serverless Functions"**
   - **"Functions"** under "API" section

2. If you don't see Edge Functions:
   - Check if you have the correct project selected
   - Verify you have admin access to the project
   - Edge Functions might be in a different project

### **Step 3: View Existing Functions**
You should see:
- ✅ `real-time-trade-monitor` (working)
- ✅ `delta-api-verify` (working)
- ❌ `copy-trade` (missing)
- ❌ `send-email` (missing)

## 🚀 **Deploy Missing Functions:**

### **Option 1: Manual Deployment (Recommended)**

#### **Deploy copy-trade function:**
1. In Supabase dashboard, go to Edge Functions
2. Click **"Create a new function"**
3. Name it: `copy-trade`
4. Copy the code from `supabase/functions/copy-trade/index.ts`
5. Click **"Deploy"**

#### **Deploy send-email function:**
1. Click **"Create a new function"** again
2. Name it: `send-email`
3. Copy the code from `supabase/functions/send-email/index.ts`
4. Click **"Deploy"**

### **Option 2: Using Supabase CLI (If Available)**
```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Deploy functions
supabase functions deploy copy-trade
supabase functions deploy send-email
```

## 🔧 **Function Details:**

### **real-time-trade-monitor** ✅
- **Purpose**: Monitors broker trades and detects positions
- **Status**: Working (detecting 0 trades currently)
- **Issue**: ETHUSD position not being detected

### **delta-api-verify** ✅
- **Purpose**: Verifies Delta Exchange API credentials
- **Status**: Working (398 products verified)

### **copy-trade** ❌ (Need to deploy)
- **Purpose**: Copies detected trades to follower accounts
- **Status**: Missing - needs deployment

### **send-email** ❌ (Need to deploy)
- **Purpose**: Sends email notifications
- **Status**: Missing - needs deployment

## 🎯 **Next Steps After Deployment:**

1. **Deploy the missing functions** using the guide above
2. **Test the functions** to ensure they work
3. **Check the real-time-trade-monitor logs** for ETHUSD detection issues
4. **Verify ETHUSD position** is still open and active

## 🔍 **Troubleshooting:**

### **If you can't find Edge Functions:**
1. Check if you're in the correct project
2. Verify you have admin access
3. Look for "Functions" in different sections
4. Contact Supabase support if needed

### **If functions fail to deploy:**
1. Check the function code for syntax errors
2. Verify environment variables are set
3. Check Supabase logs for deployment errors

## 📞 **Support:**
If you still can't find the Edge Functions section, please:
1. Take a screenshot of your Supabase dashboard
2. Check if you have the correct project selected
3. Verify your account has admin permissions

---

**Your copy trading system is almost complete! Just deploy the missing functions and the ETHUSD position detection should work.** 🎉 