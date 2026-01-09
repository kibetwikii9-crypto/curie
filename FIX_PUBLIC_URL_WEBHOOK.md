# Fix: Webhook URL Must Use HTTPS Error

## The Problem

You're seeing this error:
```
Webhook URL must use HTTPS. Current URL: automify-ai-backend/telegram/webhook
```

This happens when `PUBLIC_URL` in Render is set incorrectly.

## The Solution

### Step 1: Find Your Actual Backend URL

1. Go to **Render Dashboard**
2. Click on **`automify-ai-backend`** service
3. Look at the top of the page - you'll see your service URL
4. It should look like: `https://automify-ai-backend-xxxx.onrender.com`
   - Note: The `xxxx` is a random string that Render assigns

### Step 2: Set PUBLIC_URL in Render

1. In the **`automify-ai-backend`** service page
2. Click **"Environment"** tab
3. Find or add `PUBLIC_URL`
4. Set it to your **full backend URL**:
   ```
   https://automify-ai-backend-xxxx.onrender.com
   ```
   ⚠️ **Important**: 
   - Must include `https://`
   - Must be the FULL URL (with the random suffix)
   - Copy it exactly from the service page

### Step 3: Redeploy Backend

1. After setting `PUBLIC_URL`, click **"Manual Deploy"** button
2. Select **"Clear build cache & deploy"** (optional but recommended)
3. Wait for deployment (2-3 minutes)

### Step 4: Try Connecting Bot Again

After deployment completes, try connecting your Telegram bot again via the dashboard.

## Common Mistakes

❌ **Wrong**: `PUBLIC_URL=automify-ai-backend`  
✅ **Correct**: `PUBLIC_URL=https://automify-ai-backend-xxxx.onrender.com`

❌ **Wrong**: `PUBLIC_URL=automify-ai-backend-xxxx.onrender.com` (missing https://)  
✅ **Correct**: `PUBLIC_URL=https://automify-ai-backend-xxxx.onrender.com`

❌ **Wrong**: `PUBLIC_URL=https://automify-ai-backend.onrender.com` (missing random suffix)  
✅ **Correct**: `PUBLIC_URL=https://automify-ai-backend-xxxx.onrender.com` (with actual suffix)

## Why This Happens

Render free tier services get URLs with a random suffix (e.g., `-xxxx`). You must use the **actual URL** that Render assigns, not just the service name.

## Verify It's Fixed

After setting `PUBLIC_URL` correctly and redeploying:
1. Try connecting your bot again
2. The webhook should be set successfully
3. Check Render logs - you should see: `Webhook set successfully for bot @your_bot_username`

