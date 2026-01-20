# Maintenance Mode Guide

This guide explains how to pause your website so that no one can view it.

## How Maintenance Mode Works

When enabled, maintenance mode:
- **Backend**: Returns 503 (Service Unavailable) for all API requests (except `/health`)
- **Frontend**: Shows a maintenance page to all visitors
- **Health Check**: Still accessible for monitoring

## How to Enable Maintenance Mode

### Option 1: Using Environment Variables (Recommended)

#### For Backend (Render Dashboard):
1. Go to your Render dashboard: https://dashboard.render.com
2. Select your backend service: `automify-ai-backend`
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   - **Key**: `MAINTENANCE_MODE`
   - **Value**: `true`
6. Click **Save Changes**
7. Render will automatically redeploy

#### For Frontend (Render Dashboard):
1. Go to your Render dashboard
2. Select your frontend service: `automify-ai-frontend`
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   - **Key**: `NEXT_PUBLIC_MAINTENANCE_MODE`
   - **Value**: `true`
6. Click **Save Changes**
7. Render will automatically redeploy

### Option 2: Using Local `.env` Files (For Local Development)

#### Backend `.env`:
```env
MAINTENANCE_MODE=true
```

#### Frontend `.env.local`:
```env
NEXT_PUBLIC_MAINTENANCE_MODE=true
```

## How to Disable Maintenance Mode

Simply remove the environment variables or set them to `false`:

- **Backend**: Remove `MAINTENANCE_MODE` or set `MAINTENANCE_MODE=false`
- **Frontend**: Remove `NEXT_PUBLIC_MAINTENANCE_MODE` or set `NEXT_PUBLIC_MAINTENANCE_MODE=false`

Then redeploy your services.

## What Users Will See

When maintenance mode is enabled:
- **Frontend**: Users see a professional maintenance page with:
  - "Under Maintenance" message
  - Brief explanation
  - Loading animation
- **Backend API**: Returns JSON response:
  ```json
  {
    "error": "Service Unavailable",
    "message": "The website is currently under maintenance. Please check back later.",
    "maintenance_mode": true
  }
  ```

## Important Notes

1. **Health Check Endpoint**: The `/health` endpoint remains accessible even in maintenance mode (for monitoring)
2. **Both Services**: You need to enable maintenance mode on BOTH backend and frontend for complete blocking
3. **Redeployment**: Changes take effect after Render redeploys (usually 1-2 minutes)
4. **Database**: Maintenance mode does NOT affect database access - it only blocks HTTP requests

## Quick Commands (If Using Render CLI)

```bash
# Enable maintenance mode
render env set MAINTENANCE_MODE=true --service automify-ai-backend
render env set NEXT_PUBLIC_MAINTENANCE_MODE=true --service automify-ai-frontend

# Disable maintenance mode
render env unset MAINTENANCE_MODE --service automify-ai-backend
render env unset NEXT_PUBLIC_MAINTENANCE_MODE --service automify-ai-frontend
```

## Testing Locally

1. Set environment variables in your `.env` files
2. Restart your development servers:
   ```bash
   # Backend
   uvicorn app.main:app --reload
   
   # Frontend
   cd frontend && npm run dev
   ```
3. Visit http://localhost:3000 - you should see the maintenance page
4. Try accessing API: http://localhost:8000/api/health - should work
5. Try accessing API: http://localhost:8000/api/dashboard - should return 503

## Troubleshooting

### Maintenance page not showing?
- Check that `NEXT_PUBLIC_MAINTENANCE_MODE=true` is set in frontend environment
- Clear browser cache
- Check browser console for errors

### API still accessible?
- Check that `MAINTENANCE_MODE=true` is set in backend environment
- Verify the environment variable is actually set (check Render logs)
- Make sure you're not accessing `/health` endpoint (it's always accessible)

### Want to allow specific users?
Currently, maintenance mode blocks everyone. If you need to allow specific users, you would need to modify the middleware to check for authentication tokens or IP addresses.



