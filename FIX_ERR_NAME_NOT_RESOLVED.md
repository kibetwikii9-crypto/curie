# Fix: ERR_NAME_NOT_RESOLVED Error on Render

## What This Error Means

`ERR_NAME_NOT_RESOLVED` means the browser cannot resolve the hostname. The frontend is trying to connect to a hostname that doesn't exist or is incorrectly formatted.

## Root Cause

On Render, this happens when:
1. `NEXT_PUBLIC_API_URL` is set to just the service name (e.g., `automify-ai-backend`) instead of the full URL
2. `NEXT_PUBLIC_API_URL` is missing the protocol (`https://`)
3. The frontend wasn't rebuilt after setting the environment variable

## Quick Fix (3 Steps)

### Step 1: Get Your Backend URL

1. Go to **Render Dashboard**
2. Click on **`automify-ai-backend`** service
3. Copy the service URL (e.g., `https://automify-ai-backend-xxxx.onrender.com`)

### Step 2: Set Environment Variable

1. Go to **Render Dashboard** → **`automify-ai-frontend`** service
2. Click **"Environment"** tab
3. Find or add `NEXT_PUBLIC_API_URL`
4. Set it to your **full backend URL**:
   ```
   NEXT_PUBLIC_API_URL=https://automify-ai-backend-xxxx.onrender.com
   ```
   ⚠️ **Important**: Must include `https://` and the full hostname!

### Step 3: Rebuild Frontend

**CRITICAL**: Next.js bakes environment variables at build time. You MUST rebuild:

1. In **`automify-ai-frontend`** service
2. Click **"Manual Deploy"** button
3. Select **"Clear build cache & deploy"**
4. Wait for deployment (5-10 minutes)

## Verify It's Fixed

1. Open your frontend URL in browser
2. Press **F12** → **Console** tab
3. Look for these messages:
   ```
   🔍 API Configuration Debug:
     Raw API URL from env: https://automify-ai-backend-xxxx.onrender.com
     Normalized API Base URL: https://automify-ai-backend-xxxx.onrender.com
   ```
4. If you see errors or warnings, the env var is still wrong

## Common Mistakes

❌ **Wrong**: `NEXT_PUBLIC_API_URL=automify-ai-backend`  
✅ **Correct**: `NEXT_PUBLIC_API_URL=https://automify-ai-backend-xxxx.onrender.com`

❌ **Wrong**: `NEXT_PUBLIC_API_URL=automify-ai-backend-xxxx.onrender.com` (missing https://)  
✅ **Correct**: `NEXT_PUBLIC_API_URL=https://automify-ai-backend-xxxx.onrender.com`

❌ **Wrong**: Setting env var but not rebuilding  
✅ **Correct**: Set env var → Rebuild frontend → Test

## Still Not Working?

1. **Check browser console** - The debug logs will show exactly what URL is being used
2. **Check Render logs** - Frontend service → Logs tab
3. **Verify backend is running** - Backend service should be "Live"
4. **Test backend directly** - Visit `https://automify-ai-backend-xxxx.onrender.com/health`

## Example: Correct Configuration

**Render Dashboard → automify-ai-frontend → Environment:**

```
NEXT_PUBLIC_API_URL=https://automify-ai-backend-abc123.onrender.com
```

**Browser Console (after rebuild):**
```
🔍 API Configuration Debug:
  Raw API URL from env: https://automify-ai-backend-abc123.onrender.com
  Normalized API Base URL: https://automify-ai-backend-abc123.onrender.com
```

If you see this, it's configured correctly! 🎉









