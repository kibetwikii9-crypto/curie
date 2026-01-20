# WhatsApp OAuth Setup Guide

## Overview

This guide shows you how to set up WhatsApp OAuth so users can connect WhatsApp with one click - no tokens, no code, no technical knowledge required.

## ✅ What's Been Implemented

Following the **exact same pattern as Telegram**, WhatsApp now has:

1. **OAuth Integration** (`app/services/meta_oauth.py`)
   - Meta OAuth flow
   - Automatic token exchange
   - Webhook setup
   - Phone number retrieval

2. **Integration Routes** (`app/routes/integrations.py`)
   - `GET /api/integrations/whatsapp/connect` - Start OAuth
   - `GET /api/integrations/whatsapp/callback` - Handle callback
   - `GET /api/integrations/whatsapp/status` - Check status
   - `DELETE /api/integrations/whatsapp/disconnect` - Disconnect

3. **Webhook Handler** (`app/routes/whatsapp_webhook.py`)
   - `GET /api/webhooks/whatsapp` - Webhook verification
   - `POST /api/webhooks/whatsapp` - Receive messages

## 📋 Step 1: Supabase Setup

### Run This SQL in Supabase SQL Editor

```sql
-- Add index for faster WhatsApp lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_channel_integrations_business_whatsapp 
ON channel_integrations(business_id, channel) 
WHERE channel = 'whatsapp' AND is_active = true;
```

**That's it!** Your existing `channel_integrations` table already supports WhatsApp. No new tables needed.

## 📋 Step 2: Meta App Configuration

### 2.1 Create/Configure Meta App

1. Go to https://developers.facebook.com
2. Create a new app or select existing app
3. Add **WhatsApp** product
4. Add **Facebook Login** product (required for OAuth)

### 2.2 Configure Facebook Login

1. Go to **Facebook Login** → **Settings**
2. Add **Valid OAuth Redirect URIs**:
   ```
   https://your-backend-domain.com/api/integrations/whatsapp/callback
   http://localhost:8000/api/integrations/whatsapp/callback  (for local dev)
   ```
3. Save changes

### 2.3 Get Credentials

1. Go to **Settings** → **Basic**
2. Note:
   - **App ID**
   - **App Secret** (click "Show")

### 2.4 WhatsApp API Setup

1. Go to **WhatsApp** → **API Setup**
2. Note:
   - **Phone Number ID**
   - **Temporary Access Token** (we'll get permanent via OAuth)
   - **App Secret** (same as above)

## 📋 Step 3: Environment Variables

Add these to your `.env` file:

```env
# Meta OAuth (for self-serve WhatsApp connection)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_REDIRECT_URI=https://your-backend-domain.com/api/integrations/whatsapp/callback

# WhatsApp Webhook
WHATSAPP_VERIFY_TOKEN=your_random_verify_token_here
WHATSAPP_APP_SECRET=your_meta_app_secret  # Same as META_APP_SECRET

# Existing variables (keep these)
PUBLIC_URL=https://your-backend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
DATABASE_URL=postgresql://...
```

## 📋 Step 4: Frontend Integration

### Add "Connect WhatsApp" Button

In your frontend integrations page (`frontend/app/dashboard/integrations/page.tsx`):

```typescript
// Add WhatsApp connection handler
const handleConnectWhatsApp = () => {
  // Redirect to OAuth endpoint
  window.location.href = '/api/integrations/whatsapp/connect';
};

// In your WhatsApp card:
<button onClick={handleConnectWhatsApp}>
  Connect WhatsApp
</button>
```

### Handle OAuth Callback

The backend automatically redirects to:
- Success: `/dashboard/integrations?success=true&channel=whatsapp`
- Error: `/dashboard/integrations?error=error_message`

## 📋 Step 5: User Flow

### What Users See:

1. **User clicks "Connect WhatsApp"** in dashboard
2. **Redirects to Meta login** (automatic)
3. **User authorizes** permissions
4. **Backend automatically**:
   - Gets access token
   - Gets business accounts
   - Gets phone numbers
   - Sets up webhook
   - Stores credentials
   - Creates channel record
5. **User redirected back** to dashboard: "Connected ✅"

### No Technical Steps Required!

Users never see:
- ❌ Access tokens
- ❌ Webhook URLs
- ❌ Phone number IDs
- ❌ API credentials
- ❌ Code or configuration

## 📋 Step 6: Testing

### Test OAuth Flow

1. Start your backend: `uvicorn app.main:app --reload`
2. Go to: `http://localhost:8000/api/integrations/whatsapp/connect`
3. Should redirect to Meta login
4. After authorization, should redirect back with success

### Test Webhook

1. In Meta Dashboard → WhatsApp → Configuration
2. Set webhook URL: `https://your-domain.com/api/webhooks/whatsapp`
3. Set verify token: (same as `WHATSAPP_VERIFY_TOKEN`)
4. Click "Verify and Save"
5. Should show "Verified ✅"

### Test Message Flow

1. Send WhatsApp message to your business number
2. Check backend logs for:
   - Webhook received
   - Message processed
   - Reply sent
3. Verify reply received in WhatsApp

## 🔍 How It Works (Technical)

### OAuth Flow

```
User → /whatsapp/connect
  ↓
Backend generates state token
  ↓
Redirects to Meta OAuth
  ↓
User authorizes
  ↓
Meta redirects to /whatsapp/callback?code=...
  ↓
Backend:
  1. Exchanges code for token
  2. Gets long-lived token
  3. Gets business accounts
  4. Gets WhatsApp accounts
  5. Gets phone numbers
  6. Sets up webhook
  7. Stores in channel_integrations
  ↓
Redirects to frontend: success ✅
```

### Webhook Flow

```
WhatsApp message → Meta
  ↓
Meta sends webhook to /api/webhooks/whatsapp
  ↓
Backend:
  1. Verifies signature
  2. Parses payload
  3. Finds channel by phone_number_id
  4. Processes message
  5. Sends auto-reply
  ↓
User receives reply
```

## 🗄️ Database Structure

### ChannelIntegration Table

The existing table stores WhatsApp credentials as JSON:

```json
{
  "access_token": "EAAxxxx...",
  "expires_in": 5184000,
  "business_account_id": "123456789",
  "whatsapp_account_id": "987654321",
  "phone_number_id": "111222333444"
}
```

### Query Example

```sql
-- Find WhatsApp integration for a business
SELECT * FROM channel_integrations
WHERE business_id = 1
  AND channel = 'whatsapp'
  AND is_active = true;

-- Get phone number ID from credentials
SELECT 
  id,
  channel_name,
  credentials::json->>'phone_number_id' as phone_number_id
FROM channel_integrations
WHERE channel = 'whatsapp';
```

## 🔒 Security

1. **OAuth State**: CSRF protection via state token
2. **Webhook Signature**: Verified using app secret
3. **Credentials**: Stored in database (encrypt in production)
4. **Tenant Isolation**: Each business has separate integration

## 🐛 Troubleshooting

### OAuth Not Working?

1. Check `META_APP_ID` and `META_APP_SECRET` are set
2. Verify redirect URI matches Meta dashboard
3. Check redirect URI is in allowed list
4. Check backend logs for errors

### Webhook Not Receiving Messages?

1. Verify webhook URL in Meta dashboard
2. Check `WHATSAPP_VERIFY_TOKEN` matches
3. Verify webhook is subscribed (check Meta dashboard)
4. Check backend logs for webhook errors

### Messages Not Processing?

1. Check channel_integrations table has active WhatsApp integration
2. Verify credentials JSON has `phone_number_id`
3. Check access token is valid (not expired)
4. Check backend logs for processing errors

## ✅ Checklist

- [ ] Supabase index created
- [ ] Meta app created and configured
- [ ] Facebook Login product added
- [ ] OAuth redirect URI configured
- [ ] Environment variables set
- [ ] Frontend "Connect" button added
- [ ] Webhook URL configured in Meta
- [ ] Test OAuth flow works
- [ ] Test webhook verification works
- [ ] Test message flow works

## 🎯 Next Steps

After OAuth is working:

1. **Message Storage**: Integrate with existing conversation system
2. **AI Processing**: Connect to your AI brain
3. **Template Management**: Add template creation UI
4. **Agent Dashboard**: Build conversation management UI

---

**Your WhatsApp OAuth is now ready! Users can connect with one click. 🚀**



