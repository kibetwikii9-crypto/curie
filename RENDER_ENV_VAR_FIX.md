# Render Environment Variable Fix - NEXT_PUBLIC_API_URL

## Problem

Render's `fromService` with `property: host` returns just the service name (e.g., `automify-ai-backend`) instead of the full URL (e.g., `https://automify-ai-backend-xxxx.onrender.com`). This causes the frontend to fail with `ERR_NAME_NOT_RESOLVED`.

## Solution

### Option 1: Manual Setup (Recommended)

1. **Get your backend URL:**
   - Go to Render Dashboard → `automify-ai-backend` service
   - Click on **Settings** tab
   - Copy the **URL** (should be `https://automify-ai-backend-xxxx.onrender.com`)

2. **Set in Frontend Service:**
   - Go to Render Dashboard → `automify-ai-frontend` service
   - Click on **Environment** tab
   - Add/Edit environment variable:
     - **Key**: `NEXT_PUBLIC_API_URL`
     - **Value**: `https://automify-ai-backend-xxxx.onrender.com` (your actual backend URL)
   - Click **Save Changes**

3. **Redeploy Frontend:**
   - After saving, Render will automatically redeploy
   - Or manually trigger: **Manual Deploy** → **Deploy latest commit**

### Option 2: Automatic Fallback (Already Implemented)

The frontend code now includes a fallback that automatically constructs the Render URL pattern:
- If `NEXT_PUBLIC_API_URL` is just a service name (e.g., `automify-ai-backend`)
- It will automatically convert to: `https://automify-ai-backend.onrender.com`

**However**, this only works if:
- The service name matches the URL pattern exactly
- Render uses the standard `.onrender.com` domain

## Updated Code

### frontend/lib/api.ts
- Enhanced normalization to handle service names
- Automatically constructs Render URL pattern
- Better error messages

### render.yaml
- Changed `NEXT_PUBLIC_API_URL` to `sync: false` (manual setup)
- Added documentation comments

## Verification

After setting the environment variable:

1. **Check Build Logs:**
   - Look for: `NEXT_PUBLIC_API_URL` in build output
   - Should show the full URL

2. **Check Browser Console:**
   - Open browser DevTools → Console
   - Look for: `🔍 API Configuration Debug:`
   - Should show: `Normalized API Base URL: https://automify-ai-backend-xxxx.onrender.com`

3. **Test API Connection:**
   - Try logging in
   - Should connect successfully

## Troubleshooting

### If URL is still cut off:

1. **Check Render Dashboard:**
   - Ensure the full URL is set (including `https://`)
   - No trailing slash

2. **Clear Build Cache:**
   - Render Dashboard → Frontend Service → **Manual Deploy** → **Clear Build Cache & Deploy**

3. **Verify URL Format:**
   - Must start with `https://`
   - Must include `.onrender.com`
   - No trailing slash

### If automatic fallback doesn't work:

The fallback constructs `https://{service-name}.onrender.com`, but Render URLs might have additional characters (e.g., `automify-ai-backend-xxxx`). In this case, **Option 1 (Manual Setup) is required**.

## Summary

✅ **Code Updated**: Frontend now handles service names automatically
✅ **render.yaml Updated**: Changed to manual setup
⚠️ **Action Required**: Set `NEXT_PUBLIC_API_URL` manually in Render dashboard with full URL



