# Quick Test Guide - WhatsApp OAuth

## ✅ Meta Setup Complete!

Since you've finished the Meta developer setup, here's how to test:

## 🔧 Step 1: Set Environment Variables

Make sure these are set in your `.env` file:

```env
# Meta OAuth
META_APP_ID=your_app_id_from_meta
META_APP_SECRET=your_app_secret_from_meta
META_REDIRECT_URI=https://your-backend-domain.com/api/integrations/whatsapp/callback

# WhatsApp Webhook
WHATSAPP_VERIFY_TOKEN=your_random_token_here
WHATSAPP_APP_SECRET=your_app_secret_from_meta  # Same as META_APP_SECRET

# Existing (keep these)
PUBLIC_URL=https://your-backend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

## 🗄️ Step 2: Run Supabase SQL

Run this in Supabase SQL Editor:

```sql
CREATE INDEX IF NOT EXISTS idx_channel_integrations_business_whatsapp 
ON channel_integrations(business_id, channel) 
WHERE channel = 'whatsapp' AND is_active = true;
```

## 🚀 Step 3: Test the Flow

### 3.1 Start Your Backend

```bash
uvicorn app.main:app --reload
```

### 3.2 Test OAuth Connection

1. Go to your frontend: `http://localhost:3000/dashboard/integrations`
2. You should see **"Connect WhatsApp"** button (green button)
3. Click it
4. Should redirect to Meta login
5. Authorize permissions
6. Should redirect back to dashboard: "Connected ✅"

### 3.3 Verify in Database

Check Supabase:

```sql
SELECT id, business_id, channel, channel_name, is_active, webhook_url
FROM channel_integrations
WHERE channel = 'whatsapp';
```

Should show your WhatsApp integration with:
- `channel_name`: "WhatsApp (+1234567890)"
- `is_active`: true
- `credentials`: JSON with access_token, phone_number_id, etc.

### 3.4 Configure Webhook in Meta

1. Go to Meta Dashboard → WhatsApp → Configuration
2. Set **Webhook URL**: `https://your-backend-domain.com/api/webhooks/whatsapp`
3. Set **Verify Token**: (same as `WHATSAPP_VERIFY_TOKEN`)
4. Click **"Verify and Save"**
5. Should show "Verified ✅"

### 3.5 Test Message Flow

1. Send a WhatsApp message to your business number
2. Check backend logs - should see:
   - "Received WhatsApp webhook"
   - "Processing WhatsApp message"
   - "Reply sent"
3. Verify you receive auto-reply: "Thanks for contacting us. A team member will respond shortly."

## 🐛 Troubleshooting

### Button Still Shows "Available Soon"?

1. **Clear browser cache** or hard refresh (Ctrl+Shift+R)
2. **Restart frontend dev server**: `npm run dev`
3. Check browser console for errors

### OAuth Redirect Not Working?

1. Check `META_REDIRECT_URI` matches Meta dashboard exactly
2. Check `META_APP_ID` and `META_APP_SECRET` are set
3. Check backend logs for errors
4. Verify redirect URI is in Meta's allowed list

### Webhook Not Verified?

1. Check `WHATSAPP_VERIFY_TOKEN` matches Meta dashboard
2. Check webhook URL is accessible (no 404)
3. Check backend logs for verification attempts

### Messages Not Received?

1. Verify webhook is subscribed in Meta dashboard
2. Check `phone_number_id` in credentials matches Meta
3. Check access token is valid (not expired)
4. Check backend logs for webhook errors

## ✅ Success Checklist

- [ ] Environment variables set
- [ ] Supabase index created
- [ ] Backend running
- [ ] Frontend shows "Connect WhatsApp" button
- [ ] OAuth flow works (redirects to Meta)
- [ ] Authorization successful
- [ ] Redirects back to dashboard
- [ ] Shows "Connected ✅" status
- [ ] Database has WhatsApp integration record
- [ ] Webhook verified in Meta dashboard
- [ ] Test message received and replied

## 🎯 What You Should See

### Before Connection:
- Button: **"Connect WhatsApp"** (green)
- Status: **"Not Connected"**

### After Connection:
- Button: **"Reconnect / Configure"** and **"Disconnect"**
- Status: **"Connected ✅"**
- Message: "Your WhatsApp is connected and ready to handle conversations"

---

**You're all set! Click "Connect WhatsApp" and test the flow. 🚀**



