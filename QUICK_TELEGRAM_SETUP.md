# Quick Telegram Setup Guide

## Step 1: Set Webhook (Run this script)

```powershell
.\set_webhook_simple.ps1
```

This will automatically set your webhook to: `https://automify-ai-backend.onrender.com/telegram/webhook`

**OR** run this one-liner:
```powershell
$botToken = (Get-Content .env | Where-Object { $_ -match "^BOT_TOKEN=" }) -replace "BOT_TOKEN=", "" -replace '"', ""
$webhookUrl = "https://automify-ai-backend.onrender.com/telegram/webhook"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/setWebhook?url=$webhookUrl"
```

---

## Step 2: Verify BOT_TOKEN in Render

1. Go to: https://dashboard.render.com
2. Click on your backend service: `automify-ai-backend`
3. Click on **Environment** tab
4. Look for `BOT_TOKEN` in the list
5. **If it's missing:**
   - Click **Add Environment Variable**
   - Key: `BOT_TOKEN`
   - Value: Your Telegram bot token (same as in your `.env` file)
   - Click **Save Changes**
   - Render will automatically redeploy

**To get your bot token:**
- If you created the bot via @BotFather on Telegram, check your messages
- Or check your `.env` file: `BOT_TOKEN=your_token_here`

---

## Step 3: Test the Bot

1. **Send a message to your bot** on Telegram
2. **Check Render logs:**
   - Go to: https://dashboard.render.com → `automify-ai-backend` → **Logs** tab
   - Look for these log messages:
     - ✅ `webhook_received update_id=...` - Webhook is working
     - ✅ `message_normalized user_id=...` - Message was processed
     - ✅ `attempting_reply chat_id=...` - Bot is trying to reply
     - ✅ `reply_sent chat_id=...` - Reply was sent successfully

**If you see errors:**
- `reply_send_failed` → BOT_TOKEN is missing or wrong in Render
- `no_chat_id` → Webhook payload issue (check logs for details)
- `HTTP error 401` → BOT_TOKEN is invalid
- `HTTP error 403` → Bot is blocked by user

---

## Step 4: Test Endpoint (Optional)

You can test if the bot can send messages using the new test endpoint:

```powershell
# Replace YOUR_CHAT_ID with your actual Telegram chat ID
# (You'll see it in the logs when you send a message)
$chatId = YOUR_CHAT_ID
$backendUrl = "https://automify-ai-backend.onrender.com"
Invoke-RestMethod -Uri "$backendUrl/telegram/test-send?chat_id=$chatId&message=Test from Automify"
```

**To find your chat ID:**
1. Send a message to your bot
2. Check Render logs
3. Look for `webhook_received` or `chat_id=` in the logs
4. The number after `chat_id=` is your chat ID

---

## Troubleshooting

### Webhook not set?
- Make sure your backend is deployed and "Live" on Render
- Check that the URL is accessible: https://automify-ai-backend.onrender.com/health

### Bot not replying?
1. Check Render logs for errors
2. Verify BOT_TOKEN is set in Render (not just in `.env`)
3. Make sure webhook is set correctly (run `set_webhook_simple.ps1` again)
4. Check if bot is blocked by user (unblock if needed)

### Still not working?
Run the diagnostic script:
```powershell
.\check_telegram_bot.ps1
```

This will check:
- Bot token validity
- Webhook status
- Backend health
- Webhook endpoint accessibility









