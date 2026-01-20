# How to Fix NEXT_PUBLIC_API_URL in Render

## Current Problem
The environment variable is set to just the service name: `automify-ai-backend`
But it needs the full URL: `https://automify-ai-backend-xxxx.onrender.com`

## Step-by-Step Fix

### Step 1: Get Your Backend URL

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your **automify-ai-backend** service
3. Look at the top of the page - you'll see the **URL** displayed
   - It should look like: `https://automify-ai-backend-xxxx.onrender.com`
4. **Copy this entire URL** (including `https://`)

### Step 2: Set the Environment Variable

1. In Render Dashboard, click on **automify-ai-frontend** service
2. Go to the **Environment** tab (in the left sidebar)
3. Scroll down to find `NEXT_PUBLIC_API_URL` in the list
4. Click on it to edit, OR click **Add Environment Variable** if it doesn't exist
5. Set:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://automify-ai-backend-xxxx.onrender.com` (paste the URL you copied in Step 1)
6. **IMPORTANT**: Make sure the value:
   - ✅ Starts with `https://`
   - ✅ Includes the full domain (`.onrender.com`)
   - ✅ Has no trailing slash
   - ✅ Is exactly the URL from your backend service
7. Click **Save Changes**

### Step 3: Wait for Redeploy

1. After saving, Render will automatically detect the change
2. It will show "New deploy in progress" or similar
3. Wait 5-10 minutes for the deployment to complete
4. You can watch the progress in the **Events** tab

### Step 4: Verify It Works

1. Open your frontend URL in a browser
2. Open DevTools → Console (F12)
3. You should see:
   ```
   🔧 API Configuration
   Raw env value: https://automify-ai-backend-xxxx.onrender.com
   Resolved URL: https://automify-ai-backend-xxxx.onrender.com
   ```
4. The error message should be gone
5. Try logging in or accessing WhatsApp integration - it should work now

## Common Mistakes to Avoid

❌ **Wrong**: `automify-ai-backend` (just the service name)  
❌ **Wrong**: `http://automify-ai-backend.onrender.com` (missing random suffix)  
❌ **Wrong**: `https://automify-ai-backend-xxxx.onrender.com/` (trailing slash)  
✅ **Correct**: `https://automify-ai-backend-xxxx.onrender.com` (full URL, no slash)

## If It Still Doesn't Work

1. **Check the backend URL is correct:**
   - Go to backend service → Settings
   - Verify the URL matches what you set

2. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache completely

3. **Check Render logs:**
   - Frontend service → Logs tab
   - Look for any build errors

4. **Verify environment variable:**
   - Frontend service → Environment tab
   - Make sure `NEXT_PUBLIC_API_URL` shows the full URL (not just service name)

## Why This Happens

Render's `fromService` feature returns only the service name, not the full URL. That's why we need to set it manually. Once set correctly, it will work permanently.

