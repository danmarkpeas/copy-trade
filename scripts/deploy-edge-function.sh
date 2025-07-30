#!/bin/bash

# Deploy Supabase Edge Function
# Make sure you have Supabase CLI installed and are logged in

echo "🚀 Deploying Delta API Verify Edge Function..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase status &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

# Deploy the edge function
echo "📦 Deploying delta-api-verify function..."
supabase functions deploy delta-api-verify

if [ $? -eq 0 ]; then
    echo "✅ Edge function deployed successfully!"
    echo ""
    echo "🔗 Function URL: $(supabase functions list | grep delta-api-verify | awk '{print $2}')"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Test the function by creating a broker account"
    echo "   2. Check the function logs: supabase functions logs delta-api-verify"
    echo "   3. Monitor the function: supabase functions serve delta-api-verify"
else
    echo "❌ Failed to deploy edge function"
    exit 1
fi 