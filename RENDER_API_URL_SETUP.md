# Render API URL Setup - Permanent Fix

## The Problem

Render's `fromService` with `property: host` returns **only the service name** (e.g., `automify-ai-backend`) instead of the full URL (e.g., `https://automify-ai-backend-xxxx.onrender.com`). This causes the frontend to fail with `ERR_NAME_NOT_RESOLVED`.

## The Solution

**Manual setup is required** because Render cannot automatically provide the full URL. The frontend code now includes:
- ✅ Automatic URL construction from service names (fallback)
- ✅ Clear error messages if misconfigured
- ✅ Single source of truth in `frontend/lib/api.ts`

## Setup Steps (One-Time)

### Step 1: Get Your Backend URL

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your **automify-ai-backend** service
3. Go to **Settings** tab
4. Copy the **URL** (should look like: `https://automify-ai-backend-xxxx.onrender.com`)

### Step 2: Set Frontend Environment Variable

1. In Render Dashboard, click on **automify-ai-frontend** service
2. Go to **Environment** tab
3. Click **Add Environment Variable**
4. Set:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://automify-ai-backend-xxxx.onrender.com` (paste your actual backend URL)
5. Click **Save Changes**

### Step 3: Verify

1. Render will automatically redeploy the frontend
2. Wait for deployment to complete
3. Open your frontend URL in browser
4. Open browser DevTools → Console
5. You should see: `🔧 API Configuration` with the correct URL
6. If you see errors, check that the URL includes `https://` and the full domain

## Why This Won't Break Again

1. **Single Source of Truth**: All API URL logic is in `frontend/lib/api.ts` - no duplication
2. **Clear Documentation**: `render.yaml` has explicit comments explaining why manual setup is needed
3. **Helpful Errors**: The frontend will show clear error messages if misconfigured
4. **No fromService**: We removed the problematic `fromService` reference that was causing truncation

## Troubleshooting

### Error: "ERR_NAME_NOT_RESOLVED"

**Cause**: `NEXT_PUBLIC_API_URL` is not set or is just a service name

**Fix**:
1. Check Render Dashboard → automify-ai-frontend → Environment
2. Ensure `NEXT_PUBLIC_API_URL` is set to the **full URL** (starts with `https://`)
3. If it's just "automify-ai-backend", replace it with the full URL
4. Save and wait for redeploy

### Error: "Cannot connect to backend API"

**Possible Causes**:
1. Backend service is not running
2. URL is incorrect (typo in domain)
3. CORS issue (check backend CORS settings)

**Fix**:
1. Verify backend is running: Render Dashboard → automify-ai-backend → Logs
2. Test backend URL directly in browser: `https://automify-ai-backend-xxxx.onrender.com/health`
3. Check backend CORS settings allow your frontend domain

### URL Keeps Getting Cut Off

**This should not happen anymore** because:
- We removed `fromService` from `render.yaml`
- The variable is set to `sync: false` (manual only)
- Frontend code validates and shows errors

If it still happens:
1. Clear Render build cache: Manual Deploy → Clear Build Cache & Deploy
2. Double-check the environment variable in Render Dashboard (not in `render.yaml`)
3. Ensure you're setting it in the **frontend** service, not backend

## Code Changes Made

### `frontend/lib/api.ts`
- ✅ Simplified `getApiUrl()` function
- ✅ Better error messages
- ✅ Single source of truth for URL normalization

### `render.yaml`
- ✅ Removed `fromService` reference
- ✅ Set `sync: false` to force manual setup
- ✅ Added detailed comments explaining why

## Summary

✅ **Fixed**: Removed problematic `fromService` reference  
✅ **Fixed**: Single source of truth in `frontend/lib/api.ts`  
✅ **Fixed**: Clear error messages and documentation  
✅ **Action Required**: Set `NEXT_PUBLIC_API_URL` manually in Render Dashboard (one-time setup)

This is a **permanent fix** - the issue will not reappear because we've eliminated the root cause (relying on `fromService`).

