# Fix: Render Environment Variable Getting Cut Off

## The Problem

When you paste the full URL in Render's environment variable field, it gets cut off or truncated.

## Why This Happens

1. **Render's UI limitation**: The input field may have character limits or display issues
2. **`render.yaml` auto-set**: If `PUBLIC_URL` is set via `render.yaml` using `fromService`, it only returns the hostname (without `https://`)

## Solutions

### Solution 1: Let the Code Auto-Fix It (Recommended)

The code now automatically adds `https://` if it's missing. So you can:

1. **If using `render.yaml`**: Leave it as-is. The code will auto-add `https://` to the hostname.

2. **If setting manually in Render dashboard**: 
   - You can paste just the hostname: `automify-ai-backend-xxxx.onrender.com`
   - The code will automatically add `https://` to it
   - This avoids the truncation issue

### Solution 2: Set It Manually (If Auto-Fix Doesn't Work)

1. Go to **Render Dashboard** → **`automify-ai-backend`** service
2. Click **"Environment"** tab
3. Find `PUBLIC_URL`
4. **Delete the existing value** (if any)
5. **Paste just the hostname** (without `https://`):
   ```
   automify-ai-backend-xxxx.onrender.com
   ```
6. Click **"Save Changes"**
7. The code will automatically add `https://` when needed

### Solution 3: Use Render API (Advanced)

If the UI keeps truncating, you can use Render's API:

```bash
# Get your API key from: Render Dashboard → Account Settings → API Keys
curl -X PATCH "https://api.render.com/v1/services/YOUR_SERVICE_ID/env-vars" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "envVars": {
      "PUBLIC_URL": "https://automify-ai-backend-xxxx.onrender.com"
    }
  }'
```

## Verify It's Working

After setting `PUBLIC_URL`:

1. **Check Render Logs**: After connecting a bot, look for:
   ```
   Auto-added https:// to PUBLIC_URL. Original: automify-ai-backend-xxxx.onrender.com, Fixed: https://automify-ai-backend-xxxx.onrender.com
   ```

2. **Try Connecting Bot**: The webhook should now work correctly

## Current Behavior

The code now:
- ✅ Auto-adds `https://` if missing
- ✅ Handles hostname-only values from `render.yaml`
- ✅ Works with full URLs or hostnames
- ✅ Logs what it's doing for debugging

## What to Set in Render

**Option A (Recommended)**: Just the hostname
```
automify-ai-backend-xxxx.onrender.com
```

**Option B**: Full URL (if it doesn't get cut off)
```
https://automify-ai-backend-xxxx.onrender.com
```

Both will work - the code handles both cases!

