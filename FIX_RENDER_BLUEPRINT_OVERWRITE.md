# Fix: Render Blueprint Overwriting NEXT_PUBLIC_API_URL

## Problem

The `NEXT_PUBLIC_API_URL` environment variable keeps getting "chopped" (truncated to just the service name) after some time. This happens because:

1. **Render's Blueprint system** (`render.yaml`) can overwrite manual environment variables during redeploys
2. Even with `sync: false`, Blueprint redeploys can reset the variable
3. The variable gets reset to just `automify-ai-backend` instead of the full URL

## Root Cause

When Render uses a Blueprint (`render.yaml`), it manages services declaratively. During redeploys or updates, it can reset environment variables to match the Blueprint definition, even if you've set them manually in the dashboard.

## Permanent Solution

### Step 1: Remove from Blueprint

✅ **DONE**: `NEXT_PUBLIC_API_URL` has been removed from `render.yaml`

This prevents Render from trying to manage it via Blueprint.

### Step 2: Set in Render Dashboard (Manual Only)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on **automify-ai-frontend** service
3. Go to **Environment** tab
4. **Remove** `NEXT_PUBLIC_API_URL` if it exists (to clear any Blueprint-managed version)
5. Click **Add Environment Variable**
6. Set:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://automify-ai-backend-xxxx.onrender.com` (your actual backend URL)
7. **IMPORTANT**: Make sure it shows as **"Manual"** (not "Blueprint") in the source column
8. Click **Save Changes**

### Step 3: Disable Blueprint Auto-Sync (Optional but Recommended)

If Render keeps overwriting it:

1. Go to Render Dashboard → **automify-ai-frontend** service
2. Go to **Settings** tab
3. Look for **"Auto-Deploy"** or **"Blueprint Sync"** settings
4. If there's an option to exclude certain env vars from Blueprint management, enable it for `NEXT_PUBLIC_API_URL`
5. OR: Consider disabling auto-deploy from Blueprint and only deploy manually

### Step 4: Verify It Won't Be Overwritten

After setting it manually:

1. Check the Environment tab
2. The `NEXT_PUBLIC_API_URL` should show:
   - **Source**: "Manual" (not "Blueprint")
   - **Value**: Full URL (not just service name)
3. If it shows "Blueprint" as source, Render will overwrite it on next redeploy

## Why This Works

- ✅ **Removed from Blueprint**: Render won't try to manage it via `render.yaml`
- ✅ **Manual setting only**: You control it directly in the dashboard
- ✅ **No auto-overwrite**: Blueprint redeploys won't reset it

## If It Still Gets Overwritten

If the variable still gets reset after this fix:

1. **Check Blueprint settings**: Go to service → Settings → Look for "Blueprint" or "Infrastructure as Code" settings
2. **Disable auto-sync**: Turn off automatic Blueprint synchronization
3. **Manual deploys only**: Deploy manually instead of auto-deploy from Blueprint
4. **Contact Render support**: If the issue persists, it might be a Render platform bug

## Alternative: Use Render's Service Discovery

If you want to avoid manual setup entirely, you could:

1. Use Render's internal service discovery (if available)
2. Or set up a build-time script that constructs the URL from Render's environment

But the manual approach is more reliable and gives you full control.

## Summary

✅ **Fixed**: Removed `NEXT_PUBLIC_API_URL` from `render.yaml`  
✅ **Action**: Set it manually in Render Dashboard  
✅ **Verify**: Ensure it shows as "Manual" source, not "Blueprint"  
✅ **Result**: Blueprint redeploys won't overwrite it anymore

