# WhatsApp OAuth Setup Guide

## Overview

This guide shows you how to set up WhatsApp OAuth using the **standard Meta OAuth redirect flow** so users can connect WhatsApp with one click - no tokens, no code, no technical knowledge required.

### Why Standard OAuth Flow?

We use the **standard Meta OAuth redirect flow** instead of Embedded Signup because:

✅ **Simpler for Users**: Users just log in with Facebook and select their existing WhatsApp Business Account  
✅ **Works with Existing Accounts**: Perfect if users already have a WhatsApp Business Account set up  
✅ **More Control**: Users can select which business and WhatsApp account to connect  
✅ **Standard OAuth Pattern**: Follows the same pattern as other OAuth integrations (Google, Twitter, etc.)  
✅ **Less Complex**: No need to handle phone number registration, SMS verification, etc. in your app

**User Journey**: Facebook Login → Select Business → Select WhatsApp Account → Authorize → Done!

Meta will automatically guide users to create accounts if they don't have them yet.

## ✅ What's Been Implemented

Following the **exact same pattern as Telegram**, WhatsApp now has:

1. **OAuth Integration** (`app/services/meta_oauth.py`)
   - Standard Meta OAuth redirect flow
   - Automatic token exchange
   - Long-lived token generation (60 days)
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
3. **Important**: Enable "Login with Facebook" in the Web OAuth Login section
4. Save changes

### 2.3 Get Credentials

1. Go to **Settings** → **Basic**
2. Note:
   - **App ID** (this is your META_APP_ID)
   - **App Secret** (click "Show" - this is your META_APP_SECRET)
3. Copy these for your environment variables

### 2.4 WhatsApp Product Permissions

1. Go to **WhatsApp** → **Getting Started**
2. Note the temporary phone number ID (optional - for testing only)
3. The OAuth flow will automatically retrieve the user's WhatsApp Business phone numbers
4. **Important**: Your app needs to be approved for advanced access to `whatsapp_business_management` and `whatsapp_business_messaging` permissions for production use. During development, standard access is sufficient.

## 📋 Step 3: Environment Variables

Add these to your `.env` file:

```env
# Meta OAuth (Standard Redirect Flow)
# Get these from your Meta App Dashboard at developers.facebook.com
META_APP_ID=your_meta_app_id                    # From App Settings → Basic
META_APP_SECRET=your_meta_app_secret            # From App Settings → Basic (click "Show")
META_REDIRECT_URI=https://your-backend-domain.com/api/integrations/whatsapp/callback  # Must match Facebook Login settings

# WhatsApp Webhook Verification
# Create a random string for WHATSAPP_VERIFY_TOKEN (e.g., "my_secure_token_123")
WHATSAPP_VERIFY_TOKEN=your_random_verify_token_here
WHATSAPP_APP_SECRET=your_meta_app_secret        # Same as META_APP_SECRET above

# Existing variables (keep these)
PUBLIC_URL=https://your-backend-domain.com      # Your backend URL (used for webhook setup)
FRONTEND_URL=https://your-frontend-domain.com   # Your frontend URL (for OAuth redirects)
DATABASE_URL=postgresql://...                   # Your PostgreSQL database connection string
```

### Important Notes:

- **META_REDIRECT_URI**: Must exactly match what you configured in Facebook Login settings
- **WHATSAPP_VERIFY_TOKEN**: Can be any random string - you'll use this same value when setting up webhooks in Meta Dashboard
- **PUBLIC_URL**: Must be accessible from the internet (Meta needs to reach your webhook)
- All URLs should use HTTPS in production (Meta requires HTTPS for webhooks)

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

### Prerequisites for Users:

Before connecting, users should have:
- A Facebook account
- A Meta Business Account (or they'll be prompted to create one)
- A WhatsApp Business Account (or they'll be prompted to create one)
- A phone number to associate with WhatsApp Business (if creating a new account)

**Note**: If users don't have a WhatsApp Business Account, Meta will guide them through creating one during the OAuth flow.

### What Users See:

1. **User clicks "Connect WhatsApp"** in dashboard
2. **Redirects to Meta login** (automatic)
3. **User logs in with Facebook**
4. **User selects/creates business account** (if prompted by Meta)
5. **User selects WhatsApp Business Account** (or is guided to create one if needed)
6. **User authorizes permissions**
7. **Backend automatically**:
   - Exchanges code for access token
   - Gets long-lived token (60 days)
   - Retrieves business account details
   - Gets WhatsApp Business Account info
   - Retrieves phone number details
   - Sets up webhook subscription
   - Stores credentials securely
   - Creates channel integration record
8. **User redirected back** to dashboard: "Connected ✅"

### No Technical Steps Required!

Users never see:
- ❌ Access tokens
- ❌ Webhook URLs
- ❌ Phone number IDs
- ❌ API credentials
- ❌ Code or configuration
- ❌ Developer accounts or app setup

**The only thing users do is log in with Facebook and select their WhatsApp Business Account!**

## 📋 Step 6: Testing

### Test OAuth Flow (Local Development)

1. **Start your backend**:
   ```bash
   uvicorn app.main:app --reload
   ```

2. **Use ngrok for local testing** (Meta requires HTTPS):
   ```bash
   ngrok http 8000
   ```
   Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

3. **Update environment variables**:
   ```env
   PUBLIC_URL=https://abc123.ngrok.io
   META_REDIRECT_URI=https://abc123.ngrok.io/api/integrations/whatsapp/callback
   ```

4. **Update Meta App Settings**:
   - Go to Facebook Login → Settings
   - Add `https://abc123.ngrok.io/api/integrations/whatsapp/callback` to Valid OAuth Redirect URIs
   - Save changes

5. **Test the OAuth flow**:
   - Open your frontend integrations page
   - Click "Connect WhatsApp"
   - Should redirect to Meta login
   - Log in with Facebook
   - Select/create business account
   - Select WhatsApp Business Account (or be guided to create one)
   - Authorize permissions
   - Should redirect back with success message

6. **Verify in Database**:
   ```sql
   SELECT * FROM channel_integrations WHERE channel = 'whatsapp';
   ```
   Should see a new record with `is_active = true`

### Test OAuth Flow (Production)

1. **Ensure environment variables are set** in your production environment
2. **Verify Meta App redirect URI** matches your production backend URL
3. **Test the flow** from your production frontend
4. **Monitor logs** for any errors during OAuth callback

### Test Webhook

1. **In Meta Dashboard**:
   - Go to WhatsApp → Configuration
   - Click "Edit" next to Webhook
   - Set webhook URL: `https://your-domain.com/api/webhooks/whatsapp`
   - Set verify token: (same as `WHATSAPP_VERIFY_TOKEN` env var)
   - Click "Verify and Save"
   - Should show "Verified ✅"

2. **Subscribe to webhook fields**:
   - Check: `messages`
   - Check: `message_status` (optional, for delivery status)
   - Save

### Test Message Flow

1. **Send test message**:
   - Open WhatsApp
   - Send message to your connected WhatsApp Business phone number
   
2. **Check backend logs**:
   ```
   [INFO] Webhook received from Meta
   [INFO] Processing WhatsApp message from +1234567890
   [INFO] Message processed successfully
   [INFO] Reply sent to WhatsApp
   ```

3. **Verify in WhatsApp**:
   - You should receive an automated reply
   - Check conversation in your dashboard

4. **Check database**:
   ```sql
   SELECT * FROM conversations WHERE channel_type = 'whatsapp' ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE channel_type = 'whatsapp') ORDER BY created_at DESC LIMIT 10;
   ```

## 🔍 How It Works (Technical)

### Standard OAuth Redirect Flow

```
User clicks "Connect WhatsApp"
  ↓
Frontend → /api/integrations/whatsapp/connect
  ↓
Backend generates state token (CSRF protection)
  ↓
Redirects to Meta OAuth (Facebook Login)
  ↓
User logs in with Facebook
  ↓
Meta prompts: Select Business Account (if user has multiple or none)
  ↓
Meta prompts: Select WhatsApp Business Account (if needed)
  ↓
User grants permissions
  ↓
Meta redirects to /api/integrations/whatsapp/callback?code=...&state=...
  ↓
Backend:
  1. Validates state token (CSRF check)
  2. Exchanges code for short-lived token
  3. Exchanges for long-lived token (60 days)
  4. Gets business accounts
  5. Gets WhatsApp Business Accounts
  6. Gets phone numbers
  7. Subscribes to webhook events
  8. Stores credentials in channel_integrations table
  ↓
Returns success HTML page
  ↓
Page posts message to opener window
  ↓
Popup closes, frontend refreshes: Connected ✅
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

**Problem**: Redirect to Meta doesn't happen or returns error

**Solutions**:
1. ✅ Check `META_APP_ID` and `META_APP_SECRET` are set correctly
2. ✅ Verify `META_REDIRECT_URI` exactly matches what's in Facebook Login settings (including http/https)
3. ✅ Check redirect URI is in Facebook Login → Settings → Valid OAuth Redirect URIs
4. ✅ Ensure "Login with Facebook" is enabled in Meta app settings
5. ✅ Check backend logs for errors: `tail -f logs/app.log | grep "whatsapp"`

**Problem**: User sees "No WhatsApp Business Account found" after OAuth

**Solutions**:
1. ✅ User needs to have a WhatsApp Business Account - they can create one at business.facebook.com
2. ✅ User must select the business account during OAuth that has the WhatsApp Business Account
3. ✅ Check that the user granted `whatsapp_business_management` permission
4. ✅ Verify the access token has the correct scopes: check `/api/integrations/whatsapp/status` response

**Problem**: "No phone numbers found" error

**Solutions**:
1. ✅ WhatsApp Business Account must have at least one phone number
2. ✅ User needs to add a phone number at business.facebook.com → WhatsApp Manager
3. ✅ Phone number must be verified and active

### Webhook Not Receiving Messages?

**Problem**: Webhook verification fails

**Solutions**:
1. ✅ Verify webhook URL in Meta dashboard matches `PUBLIC_URL/api/webhooks/whatsapp`
2. ✅ Check `WHATSAPP_VERIFY_TOKEN` matches exactly (case-sensitive)
3. ✅ Ensure webhook URL is HTTPS (Meta requires HTTPS)
4. ✅ Test webhook endpoint manually: `curl https://your-domain.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=test`

**Problem**: Webhook verified but no messages received

**Solutions**:
1. ✅ Verify webhook is subscribed to `messages` field in Meta dashboard
2. ✅ Check that webhook subscription is active for your phone number
3. ✅ Check backend logs for incoming webhook requests
4. ✅ Verify signature validation isn't failing (check `WHATSAPP_APP_SECRET` is set)

### Messages Not Processing?

**Problem**: Messages received but not processed

**Solutions**:
1. ✅ Check `channel_integrations` table has active WhatsApp integration:
   ```sql
   SELECT * FROM channel_integrations WHERE channel = 'whatsapp' AND is_active = true;
   ```
2. ✅ Verify credentials JSON has `phone_number_id`:
   ```sql
   SELECT credentials FROM channel_integrations WHERE channel = 'whatsapp';
   ```
3. ✅ Check access token hasn't expired (long-lived tokens last 60 days)
4. ✅ Check backend logs for processing errors
5. ✅ Verify message is sent to the correct phone number (must match connected phone)

### Common Errors

**Error**: `Invalid OAuth redirect URI`
- **Fix**: Add the redirect URI to Facebook Login settings in Meta dashboard

**Error**: `Invalid client_id`
- **Fix**: Check `META_APP_ID` is correct and app is not in development mode with restrictions

**Error**: `User denied permission`
- **Fix**: User needs to grant all requested permissions during OAuth

**Error**: `Token validation failed`
- **Fix**: Check `META_APP_SECRET` is correct and matches the app

**Error**: `Access token expired`
- **Fix**: User needs to reconnect (token expired after 60 days). Consider implementing automatic token refresh.

### Debug Mode

Enable debug logging to see detailed OAuth flow:

```python
# In app/config.py or via environment variable
LOG_LEVEL=DEBUG
```

Then check logs:
```bash
tail -f logs/app.log | grep -i "oauth\|whatsapp"
```

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



