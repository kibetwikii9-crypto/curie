# Render Frontend Rebuild Instructions

## Problem
You're seeing the OLD error message:
```
❌ ERROR: NEXT_PUBLIC_API_URL appears to be just a service name!
```

But the code has been updated with NEW error messages. This means **Render is serving a cached build**.

## Solution: Force Frontend Rebuild

### Option 1: Clear Build Cache (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on **automify-ai-frontend** service
3. Click **Manual Deploy** dropdown
4. Select **Clear Build Cache & Deploy**
5. Wait for deployment to complete (5-10 minutes)

### Option 2: Trigger Manual Deploy

1. Go to Render Dashboard → **automify-ai-frontend**
2. Click **Manual Deploy** → **Deploy latest commit**
3. Wait for deployment

### Option 3: Make a Small Change (If cache clear doesn't work)

If the cache clear doesn't work, we can make a small code change to force Next.js to rebuild:

1. The code has already been updated with a version comment
2. Push the latest changes: `git push`
3. Render should automatically detect the change and rebuild

## Verify the Fix

After rebuild:

1. Open your frontend URL in browser
2. Open DevTools → Console
3. You should see the NEW error message format:
   ```
   🔧 API Configuration
   ❌ NEXT_PUBLIC_API_URL is missing protocol (http:// or https://)
   ```

If you still see the OLD error message, the build cache wasn't cleared properly.

## Why This Happened

Next.js builds are cached by Render. When we update the code:
- ✅ Git push updates the repository
- ✅ Render detects the change
- ❌ But sometimes serves cached JavaScript bundles

The `Clear Build Cache & Deploy` option forces a complete rebuild.

## After Rebuild: Set Environment Variable

Once you see the NEW error messages, follow these steps:

1. Go to Render Dashboard → **automify-ai-backend** → Settings
2. Copy the full URL (e.g., `https://automify-ai-backend-xxxx.onrender.com`)
3. Go to **automify-ai-frontend** → Environment tab
4. Add/Edit: `NEXT_PUBLIC_API_URL` = `https://automify-ai-backend-xxxx.onrender.com`
5. Save - Render will automatically redeploy

## Summary

✅ **Code is correct** - The new code is in the repository  
❌ **Build is cached** - Render is serving old JavaScript  
🔧 **Fix**: Clear build cache and redeploy  
📋 **Then**: Set `NEXT_PUBLIC_API_URL` environment variable

