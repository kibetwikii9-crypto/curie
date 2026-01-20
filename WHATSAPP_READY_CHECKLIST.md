# WhatsApp OAuth - Ready Checklist

## ✅ What's Complete

1. ✅ **Backend OAuth Service** (`app/services/meta_oauth.py`)
2. ✅ **Backend OAuth Routes** (`app/routes/integrations.py`)
   - `/api/integrations/whatsapp/connect` - Start OAuth
   - `/api/integrations/whatsapp/callback` - Handle callback
   - `/api/integrations/whatsapp/status` - Check status
   - `/api/integrations/whatsapp/disconnect` - Disconnect
3. ✅ **Webhook Handler** (`app/routes/whatsapp_webhook.py`)
   - `/api/webhooks/whatsapp` - Receive messages
4. ✅ **Frontend Integration** (`frontend/app/dashboard/integrations/page.tsx`)
   - Shows "Connect WhatsApp" button
   - Shows "Connected" status when active
   - Handles OAuth callback redirects

## 🔧 What You Need to Do

### 1. Set Environment Variables

Add to your `.env` file:

```env
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_REDIRECT_URI=https://your-backend-domain.com/api/integrations/whatsapp/callback
WHATSAPP_VERIFY_TOKEN=your_random_token
WHATSAPP_APP_SECRET=your_app_secret
```

### 2. Run Supabase SQL

```sql
CREATE INDEX IF NOT EXISTS idx_channel_integrations_business_whatsapp 
ON channel_integrations(business_id, channel) 
WHERE channel = 'whatsapp' AND is_active = true;
```

### 3. Configure Meta Webhook

In Meta Dashboard → WhatsApp → Configuration:
- **Webhook URL**: `https://your-backend-domain.com/api/webhooks/whatsapp`
- **Verify Token**: (same as `WHATSAPP_VERIFY_TOKEN`)
- Click **"Verify and Save"**

## 🧪 Quick Test

1. **Go to**: `/dashboard/integrations`
2. **Click**: "Connect WhatsApp" (green button)
3. **Should**: Redirect to Meta login
4. **After auth**: Redirects back, shows "Connected ✅"

## 🎯 Expected Behavior

### Before Connection:
- Button: **"Connect WhatsApp"** (green)
- Status: **"Not Connected"**

### After Connection:
- Button: **"Reconnect / Configure"** + **"Disconnect"**
- Status: **"Connected ✅"**
- Shows phone number in description

## 🐛 If Button Still Shows "Available Soon"

1. **Hard refresh browser**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Restart frontend**: Stop and restart `npm run dev`
3. **Check browser console** for errors
4. **Verify backend is running** and accessible

## ✅ Final Checklist

- [ ] Environment variables set
- [ ] Supabase SQL run
- [ ] Backend restarted (to load new env vars)
- [ ] Frontend restarted (to load new code)
- [ ] Browser cache cleared
- [ ] "Connect WhatsApp" button visible
- [ ] OAuth flow works
- [ ] Webhook configured in Meta

---

**Everything is ready! Just set the env vars and test. 🚀**



